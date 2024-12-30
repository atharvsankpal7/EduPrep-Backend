import {Request as ExpressRequest, Response} from "express";
import {ApiError} from "../utils/ApiError";
import {customTestSchema} from "../ZodSchema/testSchema";
import asyncHandler from "../utils/asyncHandler";
import {Question} from "../models/questions/questions.model";
import {Test} from "../models/tests/test.model";
import {TCreateTestResponse} from "../types/sharedTypes";
import ApiResponse from "../utils/ApiResponse";
import logger from "../utils/logger";
import {CompanySpecificTestDetails} from "../models/topics/company-specific-topics.model";
import {IQuestion, IUser} from "../types/databaseSchema.types.ts";
import {AuthenticatedRequest} from "../middleware/auth.middleware.ts";

// Custom Request interface to include user
interface Request extends ExpressRequest {
    user?: IUser;
}


const createCustomTest = async (user: IUser, body: any) => {
    const {time, numberOfQuestions, topicList, educationLevel} = body;

    const validationResult = customTestSchema.safeParse({
        time,
        numberOfQuestions,
        topicList,
        educationLevel,
    });

    if (!validationResult.success) {
        const errorMessages = validationResult.error.errors.map((error) => error.message);
        throw new ApiError(400, errorMessages.join(", "));
    }

    const {
        time: validatedTime,
        numberOfQuestions: totalQuestions,
        topicList: validatedTopicList,
    } = validationResult.data;

    const allTopics = validatedTopicList.subjects
        .flatMap((subject) => subject.topics)
        .map((topicName: string) => topicName);

    if (allTopics.length === 0) {
        throw new ApiError(400, "At least one topic is required.");
    }

    const questionsPerTopic = Math.floor(totalQuestions / allTopics.length);
    const remainingQuestions = totalQuestions % allTopics.length;

    if (questionsPerTopic === 0) {
        throw new ApiError(400, "Number of questions is too small for the number of topics.");
    }

    const pipeline = [
        {
            $facet: allTopics.reduce<Record<string, any[]>>((facets, topic) => {
                facets[topic] = [
                    {$match: {topicName: topic}},
                    {$sample: {size: questionsPerTopic}},
                    {
                        $project: {
                            _id: 1,
                            questionText: 1,
                            options: 1,
                            answer: 1,
                        },
                    },
                ];
                return facets;
            }, {}),
        },
    ];

    const aggregatedData: Record<string, IQuestion[]>[] = await Question.aggregate(pipeline) as Record<string, IQuestion[]>[];
    const aggregatedQuestions: IQuestion[] = Object.values(aggregatedData[0]).flat();

    if (aggregatedQuestions.length < totalQuestions) {
        const errorMessage = `Not enough questions available for the selected topics. Requested: ${totalQuestions}, Found: ${aggregatedQuestions.length}`;
        logger.error(errorMessage);
        throw new ApiError(400, errorMessage);
    }

    let additionalQuestions: IQuestion[] = [];
    if (remainingQuestions > 0) {
        additionalQuestions = await Question.aggregate([
            {
                $match: {topicName: {$in: allTopics}},
            },
            {$sample: {size: remainingQuestions}},
            {
                $project: {
                    _id: 1,
                    questionText: 1,
                    options: 1,
                    answer: 1,
                },
            },
        ]);
    }

    aggregatedQuestions.push(...additionalQuestions);

    const userId = user._id;
    const test = await Test.create({
        testName: `Test - ${new Date().toISOString()}`,
        testDuration: validatedTime,
        totalQuestions: aggregatedQuestions.length,
        testQuestions: aggregatedQuestions.map((q) => q._id),
        createdBy: userId,
    });

    if (!test) {
        logger.error("Failed to create test by user ", userId);
        throw new ApiError(500, "Failed to create test");
    }

    const testDetails: TCreateTestResponse = {
        test,
        questions: aggregatedQuestions.map((q) => ({
            question: q.questionText,
            options: q.options,
            answer: q.answer,
        })),
    };

    return {testDetails};
};
// Controller for creating a custom test
const getCustomTest = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        throw new ApiError(401, "Unauthorized");
    }
    const {testDetails} = await createCustomTest(req.user, req.body);
    res.status(201).send(
        new ApiResponse(201, {testDetails}, "Test Creation successful")
    );
});

// Controller for creating a company-specific test
const getCompanySpecificTest = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        throw new ApiError(401, "Unauthorized");
    }
    const {companyName} = req.params;
    const testDetails = await CompanySpecificTestDetails.findOne({companyName});

    if (!testDetails) {
        logger.error("Request for company ", companyName, " not found by user ", req.user._id);
        throw new ApiError(404, "Company-specific test details not found");
    }


    logger.info("Test created for company ", companyName, " by user ", req.user._id);

    const {testDetails: customTestDetails} = await createCustomTest(req.user, {
        time: testDetails.time,
        numberOfQuestions: testDetails.numberOfQuestions,
        topicList: testDetails.topicList,
        educationLevel: "undergraduate",
    });

    res.status(201).send(
        new ApiResponse(201, {testDetails: customTestDetails}, "Company-specific test created")
    );
});

const createCETTest = asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
        throw new ApiError(401, "Unauthorized");
    }

    const user = req.user;
    const duration = 180; // Duration in minutes

    // Subjects and question weightage
    const subjects = ["Physics", "Chemistry", "Mathematics"];
    const weightage = {
        XI: {total: 30, perSubject: 10},
        XII: {total: 120, perSubject: 40},
    };

    const aggregatedQuestions = [];

    for (const subject of subjects) {
        for (const [standard, {perSubject}] of Object.entries(weightage)) {
            const questions = await Question.aggregate([
                {
                    $match: {
                        subjectName: subject,
                        standard: standard
                    },
                },
                {$sample: {size: perSubject}},
                {
                    $project: {
                        _id: 1,
                        questionText: 1,
                        options: 1,
                        answer: 1,
                    },
                },
            ]);

            if (questions.length < perSubject) {
                const errorMessage = `Not enough questions for ${subject} (${standard}). Required: ${perSubject}, Found: ${questions.length}`;
                logger.error(errorMessage);
                throw new ApiError(400, errorMessage);
            }

            aggregatedQuestions.push(...questions);
        }
    }

    const test = await Test.create({
        testName: `CET Test - ${new Date().toISOString()}`,
        testDuration: duration,
        totalQuestions: aggregatedQuestions.length,
        testQuestions: aggregatedQuestions.map((q) => q._id),
        createdBy: user._id,
    });

    if (!test) {
        logger.error("Failed to create CET test for user", user._id);
        throw new ApiError(500, "CET test creation failed");
    }

    const testDetails = {
        test,
        questions: aggregatedQuestions.map((q) => ({
            question: q.questionText,
            options: q.options,
            answer: q.answer,
        })),
    };

    res.status(201).send(
        new ApiResponse(201, {testDetails}, "CET Test created successfully")
    );
});


export {getCustomTest, getCompanySpecificTest, createCETTest};
