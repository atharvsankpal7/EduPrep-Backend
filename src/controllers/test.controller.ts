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
        console.log(validationResult.error);
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
        }))
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
const getCompanySpecificTest = asyncHandler(
    async (req: Request, res: Response) => {
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

// Controller for creating a CET test
const createCETTest = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {

        const user = req.user!;

        const topicList = await Topic.find({})
        const topicListName = topicList.map((topic) => topic.topicName);
        const savedTest = await createCustomTest(user, {
            time: 180 * 60,
            numberOfQuestions: 100,
            topicList: topicListName,
            educationLevel: "juniorCollege"
        });
        const testDetails = {
            testId: savedTest.testDetails.test.id,
            name: savedTest.testDetails.test.testName,
            duration: savedTest.testDetails.test.testDuration,
            totalQuestions: savedTest.testDetails.test.totalQuestions,
        }
        res
            .status(201)
            .send(
                new ApiResponse(201, {testDetails}, "CET Test created successfully")
            );
    }
);

const getTestWithId = asyncHandler(async (req: Request, res: Response) => {
    const {id} = req.params;

    const test = await Test.findById(id);
    if (!test) {
        throw new ApiError(404, "Test not found");
    }
    const questionIds = test.testQuestions;

    const questions = await Question.find({_id: {$in: questionIds}});

    res.status(200).send(
        new ApiResponse(200, {test, questions}, "Test fetched successfully")
    );
});
// {
//     "statusCode": 201,
//     "data": {
//     "testDetails": {
//         "testId": "6773c7ac1d00a61f44a5c805",
//             "name": "Custom Test 1735641004066",
//             "duration": 180,
//             "totalQuestions": 100
//     }
// },
//     "message": "CET Test created successfully",
//     "success": true
// }


export {
    getCustomTest, getCompanySpecificTest, createCETTest, getTestWithId
};
