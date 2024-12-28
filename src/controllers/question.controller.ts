import asyncHandler from "../utils/asyncHandler";
import express from "express";
import logger from "../utils/logger";
import {AuthenticatedRequest} from "../middleware/auth.middleware";
import ApiResponse from "../utils/ApiResponse";
import {ApiError} from "../utils/ApiError";
import * as XLSX from "xlsx";
import {Question} from "../models/questions/questions.model.ts";
import {ExcelRowSchema} from "../ZodSchema/excelSchema.ts";
import {Topic} from "../models/topics/topic.model.ts";
import mongoose from "mongoose";

const getTopicId = async (topicName: string): Promise<{
    subjectId: mongoose.Schema.Types.ObjectId,
    topicId: mongoose.Types.ObjectId
}> => {

    const topic = await Topic.findOne({topicName});
    if (!topic) {
        throw new ApiError(404, "Topic not found");
    }
    return {
        subjectId: topic.subjectId,
        topicId: topic.id,
    }
};

// TODO: update this function later
// const getOrCreateTopicId = async (
//     subjectName: string,
//     topicName: string,
//     domainId: string, // Domain must be passed explicitly for new subjects
//     topicDescription?: string
// ) => {
//     // Find or create the subject
//     let subject = await Subject.findOne({subjectName});
//     if (!subject) {
//         subject = new Subject({subjectName, domainId});
//         await subject.save();
//     }
//
//     // Find or create the topic
//     let topic = await Topic.findOne({topicName, subjectId: subject.id});
//     if (!topic) {
//         topic = new Topic({
//             topicName,
//             subjectId: subject.id,
//             description: topicDescription || "",
//         });
//         await topic.save();
//     }
//
//     return {
//         subjectId: subject.id,
//         topicId: topic.id,
//     };
// };


const createQuestionsUpdateDatabase = async (questions: Awaited<{
    questionText: string;
    options: string[];
    correctOption: number;
    topicIds: mongoose.Types.ObjectId[];
    difficultyLevel: number;
    explanation: string
}>[]) => {
    const savedQuestions = await Question.insertMany(questions);
    if (!savedQuestions) {
        logger.warn("Questions couldn't be saved to database");
        throw new ApiError(400, "Questions not created");
    }
    logger.info(`${savedQuestions.length} questions saved successfully, firstId : ${savedQuestions[0]._id}, lastId : ${savedQuestions[savedQuestions.length - 1]._id}`);
    return savedQuestions;
};

const saveExcel = asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    if (!req.file) {
        logger.warn("File not found, userId: " + req.user?.id);
        throw new ApiError(400, "File not found");
    }

    try {
        // Read the uploaded Excel file
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0]; // Assuming the data is in the first sheet
        const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {defval: ""});
        // Map and validate data for database insertion
        const questions = await Promise.all(sheetData.map(async (row) => {

            const validatedRow = ExcelRowSchema.parse(row);

            // Resolve topic IDs using getTopicId
            const topicIds = [];
            const topicsList = validatedRow.topics.split(',').map(topic => topic.trim()); // Split comma separated topics
            for (const topicName of topicsList) {
                const {topicId} = await getTopicId(topicName);
                if (topicId) {
                    topicIds.push(topicId)
                } else {
                    logger.warn(`Topic not found: ${topicName}`, {userId: req.user?.id});
                    throw new ApiError(404, `Topic not found: ${topicName}`);
                }
            }

            return {
                questionText: validatedRow.question,
                options: [
                    validatedRow.option_1,
                    validatedRow.option_2,
                    validatedRow.option_3,
                    validatedRow.option_4,
                ],
                correctOption: validatedRow.answer,
                topicIds: topicIds, // Assign resolved topic IDs
                difficultyLevel: validatedRow.standard,
                explanation: validatedRow.explanation,
            };
        }));

        // Save questions to the database using helper function
        await createQuestionsUpdateDatabase(questions);
        res.status(201).json(new ApiResponse(201, true, "Questions saved successfully"));
    } catch (error: unknown) {
        if (error instanceof ApiError) {
            throw error;
        } else {
            logger.error(`Unknown error processing Excel file named ${req.file.originalname} + Error: ${error}`, {userId: req.user?.id});
            throw new ApiError(500, "error processing Excel file");
        }
    }
    // finally { // Deleting the file after processing
    //     fs.unlinkSync(req.file.path);
    // }
});
export {saveExcel}