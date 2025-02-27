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
import {IUser} from "../types/databaseSchema.types.ts";
import {AuthenticatedRequest} from "../middleware/auth.middleware.ts";
import {Topic} from "../models/topics/topic.model.ts";
import {getCETQuestions} from "../utils/cetQuestionSelector";
import {Schema} from "mongoose";

// Custom Request interface to include user
interface Request extends ExpressRequest {
    user?: IUser;
}

// creates the test with the given specifications and saves it in the database
const createCustomTest = async (user: IUser, body: any) => {
    const {time, numberOfQuestions, topicList, educationLevel} = body;
    const validationResult = customTestSchema.safeParse({
        time,
        numberOfQuestions,
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

    const allTopics = await Topic.find({
        topicName: {$in: validatedTopicList},
    });

    if (allTopics.length === 0) {
        throw new ApiError(400, "At least one topic is required.");
    }

    const selectedQuestions = await Question.aggregate([
        // { $match: { topicName: { $in: validatedTopicList } } },
        {$sample: {size: totalQuestions}},
    ]);

    const test = await Test.create({
        testName: "Custom Test " + Date.now(),
        testDuration: validatedTime,
        totalQuestions: totalQuestions,
        testQuestions: selectedQuestions,
        createdBy: user._id,
    });

    const testDetails: TCreateTestResponse = {
        test: test,
        questions: selectedQuestions.map((q) => ({
            question: q.questionText,
            options: q.options,
            answer: q.answer,
        })),
    };

    return {testDetails};
};

//
const getCustomTest = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        throw new ApiError(401, "Unauthorized");
    }
    const {testDetails} = await createCustomTest(req.user, req.body);
    res
        .status(201)
        .send(new ApiResponse(201, {testDetails}, "Test Creation successful"));
});

// Controller for creating a company-specific test
const getCompanySpecificTest = asyncHandler(async (req: Request, res: Response) => {
        if (!req.user) {
            throw new ApiError(401, "Unauthorized");
        }
        const {companyName} = req.params;
        const testDetails = await CompanySpecificTestDetails.findOne({
            companyName,
        });

        if (!testDetails) {
            logger.error(
                "Request for company ",
                companyName,
                " not found by user ",
                req.user._id
            );
            throw new ApiError(404, "Company-specific test details not found");
        }

        logger.info(
            "Test created for company ",
            companyName,
            " by user ",
            req.user._id
        );

        const {testDetails: customTestDetails} = await createCustomTest(
            req.user,
            {
                time: testDetails.time,
                numberOfQuestions: testDetails.numberOfQuestions,
                topicList: testDetails.topicList,
                educationLevel: "undergraduate",
            }
        );

        res
            .status(201)
            .send(
                new ApiResponse(
                    201,
                    {testDetails: customTestDetails},
                    "Company-specific test created"
                )
            );
    }
);

const getTestWithId = asyncHandler(async (req: Request, res: Response) => {
    const {id} = req.params;

    // Find test and populate sections
    const test = await Test.findById(id);
    if (!test) {
        logger.error(`Test not found with id: ${id}`);
        throw new ApiError(404, "Test not found");
    }

    // Get all question IDs from all sections
    const allQuestionIds = test.sections.reduce((acc, section) => {
        return [...acc, ...section.questions];
    }, [] as Schema.Types.ObjectId[]);

    // Fetch all questions
    const questions = await Question.find({_id: {$in: allQuestionIds}});

    // Create a map for quick question lookup
    const questionMap = new Map(questions.map(q => [q.id, q]));

    // Organize questions by section
    const sectionsWithQuestions = test.sections.map(section => ({
        sectionName: section.sectionName,
        sectionDuration: section.sectionDuration,
        totalQuestions: section.totalQuestions,
        questions: section.questions.map(qId => {
            const question = questionMap.get(qId.toString());
            if (!question) {
                logger.error(`Question not found: ${qId}`);
                throw new ApiError(500, "Question data inconsistency detected");
            }
            return {
                _id: question._id,
                questionText: question.questionText,
                options: question.options,
                answer: question.answer,
                explanation: question.explanation
            };
        })
    }));

    // Prepare response
    const testResponse = {
        _id: test._id,
        testName: test.testName,
        totalDuration: test.totalDuration,
        totalQuestions: test.totalQuestions,
        sections: sectionsWithQuestions,
        expiryTime: test.expiryTime,
    };

    res.status(200).send(
        new ApiResponse(200, {test: testResponse}, "Test fetched successfully")
    );
});

// Update the createCETTest function

const createCETTest = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
        const user = req.user!;

        const {questionIds} = await getCETQuestions();

        // Fetch all questions with their topics and subjects
        const questions = await Question.aggregate([
            {
                $match: {
                    _id: {$in: questionIds}
                }
            },
            {
                $lookup: {
                    from: "topics",
                    localField: "topicIds",
                    foreignField: "_id",
                    as: "topics"
                }
            },
            {
                $lookup: {
                    from: "subjects",
                    localField: "topics.subjectId",
                    foreignField: "_id",
                    as: "subjects"
                }
            }
        ]);

        // Categorize questions by subject
        const physicsQuestions = questions.filter(q =>
            q.subjects.some((s: { subjectName: string; }) =>
                s.subjectName.toLowerCase() === 'physics'
            )
        ).slice(0, 50);

        const chemistryQuestions = questions.filter(q =>
            q.subjects.some((s: { subjectName: string; }) =>
                s.subjectName.toLowerCase() === 'chemistry'
            )
        ).slice(0, 50);

        const mathsQuestions = questions.filter(q =>
            q.subjects.some((s: { subjectName: string; }) =>
                s.subjectName.toLowerCase() === 'mathematics'
            )
        ).slice(0, 50);

        // Validate we have enough questions for each section
        if (physicsQuestions.length < 50 || chemistryQuestions.length < 50 || mathsQuestions.length < 50) {
            logger.error("Insufficient questions for CET test sections", {
                physics: physicsQuestions.length,
                chemistry: chemistryQuestions.length,
                maths: mathsQuestions.length
            });
            throw new ApiError(500, "Insufficient questions available for test creation");
        }

        // Extract just the question IDs
        const physicsChemQuestions = [
            ...physicsQuestions.map(q => q._id),
            ...chemistryQuestions.map(q => q._id)
        ];

        const mathsQuestionIds = mathsQuestions.map(q => q._id);

        // Create test with sections
        const sections = [
            {
                sectionName: "Physics and Chemistry",
                sectionDuration: 90, // 90 minutes
                questions: physicsChemQuestions,
                totalQuestions: 100
            },
            {
                sectionName: "Mathematics",
                sectionDuration: 90, // 90 minutes
                questions: mathsQuestionIds,
                totalQuestions: 50
            }
        ]
        const test = await Test.create({
            testName: "CET Test " + Date.now(),
            sections,
            totalDuration: 180, // Total duration in minutes
            totalQuestions: sections.reduce((x, e) => e.totalQuestions + x, 0), // Total questions across all sections
            createdBy: user._id
        });

        const testDetails = {
            testId: test.id,
            name: test.testName,
            duration: test.totalDuration,
            totalQuestions: test.totalQuestions,
            sections: test.sections.map(section => ({
                name: section.sectionName,
                duration: section.sectionDuration,
                questionCount: section.totalQuestions
            }))
        };

        res.status(201).send(
            new ApiResponse(201, {testDetails}, "CET Test created successfully")
        );
    }
);
export {getCustomTest, getCompanySpecificTest, createCETTest, getTestWithId};
