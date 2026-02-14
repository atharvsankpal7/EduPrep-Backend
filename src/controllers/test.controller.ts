import { Request as ExpressRequest, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { customTestSchema } from "../ZodSchema/testSchema";
import asyncHandler from "../utils/asyncHandler";
import ApiResponse from "../utils/ApiResponse";
import logger from "../utils/logger";
import { getCETQuestions } from "../utils/cetQuestionSelector";
import {
  createTestWithSections,
  findTestWithQuestions,
} from "../db/helpers/test.helpers";
import {
  findTopicsByIds,
  findTopicsByNames,
} from "../db/helpers/topic.helpers";
import {
  getQuestionsWithDetails,
  getRandomQuestionsFromTopics,
} from "../db/helpers/question.helpers";
import { getCompanyTestDetails } from "../db/helpers/distribution.helpers";
import { shuffleOptions } from "../utils/shuffle";

// creates the test with the given specifications and saves it in the database
const createCustomTest = async (userId: number, body: any) => {
  const { time, numberOfQuestions, topicList, educationLevel } = body;
  const parsedTime = Number(time);
  const normalizedDurationInMinutes =
    parsedTime >= 900 && parsedTime % 60 === 0 ? parsedTime / 60 : parsedTime;

  const validationResult = customTestSchema.safeParse({
    time: normalizedDurationInMinutes,
    numberOfQuestions: Number(numberOfQuestions),
    topicList,
    educationLevel,
  });
  if (!validationResult.success) {
    const errorMessages = validationResult.error.errors.map(
      (error) => error.message
    );

    throw new ApiError(400, errorMessages.join(", "));
  }

  const {
    time: validatedTime,
    numberOfQuestions: totalQuestions,
    topicList: validatedTopicList,
  } = validationResult.data;
  const numericPattern = /^\d+$/;
  const looksLikeIds = validatedTopicList.every((topic) => numericPattern.test(topic));
  const allTopics = looksLikeIds
    ? await findTopicsByIds(validatedTopicList.map((id) => Number(id)))
    : await findTopicsByNames(validatedTopicList);

  if (allTopics.length === 0) {
    throw new ApiError(400, "At least one topic is required.");
  }

  const topicIds = allTopics.map((topic) => topic.id);
  const selectedQuestions = await getRandomQuestionsFromTopics(
    topicIds,
    totalQuestions
  );

  if (selectedQuestions.length < totalQuestions) {
    logger.warn(
      `Requested ${totalQuestions} questions but only found ${selectedQuestions.length} for the given topics`
    );
  }

  // Create test with a single section, similar to CET format
  const sections = [
    {
      sectionName: "Custom Test Section",
      sectionDuration: validatedTime,
      questionIds: selectedQuestions.map((q) => q.id),
    },
  ];

  const test = await createTestWithSections({
    testName: "Custom Test " + Date.now(),
    totalDuration: validatedTime,
    totalQuestions: selectedQuestions.length,
    createdBy: userId,
    sections,
  });

  // Prepare response with test details and full question data
  const sectionsWithQuestions = sections.map((section) => {
    return {
      name: section.sectionName,
      duration: section.sectionDuration,
      questionCount: section.questionIds.length,
      questions: selectedQuestions.map(question => {
        // Deterministic shuffle using userId + questionId as seed
        const seed = userId.toString() + question.id;
        const { shuffledOptions, newAnswerIndex } = shuffleOptions(question.options, question.answer, seed);

        return {
          _id: question.id,
          questionText: question.questionText,
          options: shuffledOptions,
          answer: newAnswerIndex,
          explanation: question.explanation,
        };
      }),
    };
  });

  const testDetails = {
    testId: test.id,
    name: test.testName,
    duration: test.totalDuration,
    totalQuestions: test.totalQuestions,
    sections: sectionsWithQuestions,
  };

  return { testDetails };
};
const getCustomTest = asyncHandler(async (req: ExpressRequest, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, "Unauthorized");
  }

  const { testDetails } = await createCustomTest(req.user.id, req.body);
  res
    .status(201)
    .send(new ApiResponse(201, { testDetails }, "Test Creation successful"));
});

// Controller for creating a company-specific test
const getCompanySpecificTest = asyncHandler(
  async (req: ExpressRequest, res: Response) => {
    if (!req.user) {
      throw new ApiError(401, "Unauthorized");
    }
    const { companyName } = req.params;
    const testDetails = await getCompanyTestDetails(companyName);

    if (!testDetails) {
      logger.error(
        "Request for company ",
        companyName,
        " not found by user ",
        req.user.id
      );
      throw new ApiError(404, "Company-specific test details not found");
    }

    logger.info(
      "Test created for company ",
      companyName,
      " by user ",
      req.user.id
    );

    const { testDetails: customTestDetails } = await createCustomTest(
      req.user.id,
      {
        time: testDetails.time,
        numberOfQuestions: testDetails.numberOfQuestions,
        topicList: testDetails.topicIds.map((id) => String(id)),
        educationLevel: "undergraduate",
      }
    );

    res
      .status(201)
      .send(
        new ApiResponse(
          201,
          { testDetails: customTestDetails },
          "Company-specific test created"
        )
      );
  }
);

const getTestWithId = asyncHandler(async (req: ExpressRequest, res: Response) => {
  const { id } = req.params;

  // Find test and populate sections
  const test = await findTestWithQuestions(id, req.user?.id);
  if (!test) {
    logger.error(`Test not found with id: ${id}`);
    throw new ApiError(404, "Test not found");
  }

  // Prepare response
  const testResponse = {
    _id: test.id,
    testName: test.testName,
    totalDuration: test.totalDuration,
    totalQuestions: test.totalQuestions,
    sections: test.sections.map((section) => ({
      sectionName: section.sectionName,
      sectionDuration: section.sectionDuration,
      totalQuestions: section.totalQuestions,
      questions: section.questions,
    })),
    expiryTime: test.expiryTime,
  };

  res
    .status(200)
    .send(
      new ApiResponse(200, { test: testResponse }, "Test fetched successfully")
    );
});

// Update the createCETTest function

const createCETTest = asyncHandler(
  async (req: ExpressRequest, res: Response) => {
    const user = req.user!;
    const { questionIds } = await getCETQuestions();
    // Fetch all questions with their topics and subjects
    const questions = await getQuestionsWithDetails(questionIds);

    // Categorize questions by subject
    const physicsQuestions = questions
      .filter((q) =>
        q.subjectName?.toLowerCase() === "physics"
      )
      .slice(0, 50);

    const chemistryQuestions = questions
      .filter((q) =>
        q.subjectName?.toLowerCase() === "chemistry"
      )
      .slice(0, 50);

    const mathsQuestions = questions
      .filter((q) =>
        q.subjectName?.toLowerCase() === "mathematics"
      )
      .slice(0, 50);
    // Validate we have enough questions for each section
    if (
      physicsQuestions.length < 50 ||
      chemistryQuestions.length < 50 ||
      mathsQuestions.length < 50
    ) {
      logger.error("Insufficient questions for CET test sections", {
        physics: physicsQuestions.length,
        chemistry: chemistryQuestions.length,
        maths: mathsQuestions.length,
      });
      throw new ApiError(
        500,
        "Insufficient questions available for test creation"
      );
    }

    // Extract just the question IDs
    const physicsChemQuestions = [
      ...physicsQuestions.map((q) => q.id),
      ...chemistryQuestions.map((q) => q.id),
    ];

    const mathsQuestionIds = mathsQuestions.map((q) => q.id);

    // Create test with sections
    const sections = [
      {
        sectionName: "Physics and Chemistry",
        sectionDuration: 90, // 90 minutes
        questionIds: physicsChemQuestions,
      },
      {
        sectionName: "Mathematics",
        sectionDuration: 90, // 90 minutes
        questionIds: mathsQuestionIds,
      },
    ];

    const test = await createTestWithSections({
      testName: "CET Test " + Date.now(),
      totalDuration: 180, // Total duration in minutes
      totalQuestions: 100, // Total questions across all sections
      createdBy: user.id,
      sections,
    });

    const testDetails = {
      testId: test.id,
      name: test.testName,
      duration: test.totalDuration,
      totalQuestions: test.totalQuestions,
      sections: sections.map((section) => ({
        name: section.sectionName,
        duration: section.sectionDuration,
        questionCount: section.questionIds.length,
      })),
    };

    res
      .status(201)
      .send(
        new ApiResponse(201, { testDetails }, "CET Test created successfully")
      );
  }
);
export { getCustomTest, getCompanySpecificTest, createCETTest, getTestWithId };
