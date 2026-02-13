import asyncHandler from "../utils/asyncHandler";
import express from "express";
import logger from "../utils/logger";
import ApiResponse from "../utils/ApiResponse";
import {ApiError} from "../utils/ApiError";
import * as XLSX from "xlsx";
import fs from "fs";
import {processExcelData} from "../utils/excelProcessor";
import { createQuestions } from "../db/helpers/question.helpers";

export const saveExcel = asyncHandler(async (req: express.Request, res: express.Response) => {
    if (!req.file) {
        logger.warn("File not found, userId: " + req.user?.id);
        throw new ApiError(400, "File not found");
    }

    try {
        // Read the uploaded Excel file
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {defval: ""});

        // Process the Excel data
        const processedQuestions = await processExcelData(sheetData);
        
        // Save questions to database
        const savedQuestions = await createQuestions(processedQuestions);

        if (!savedQuestions) {
            logger.warn("Questions couldn't be saved to database");
            throw new ApiError(400, "Questions not created");
        }

        logger.info(`${savedQuestions.length} questions saved successfully, firstId : ${savedQuestions[0].id}, lastId : ${savedQuestions[savedQuestions.length - 1].id}`);

        res.status(201).json(
            new ApiResponse(201, true, "Questions saved successfully")
        );
    } catch (error: unknown) {
        if (error instanceof ApiError) {
            throw error;
        } else {
            logger.error(`Unknown error processing Excel file named ${req.file.originalname} + Error: ${error}`);
            throw new ApiError(500, "Error processing Excel file");
        }
    } finally {
        // Clean up: Delete the uploaded file
        fs.unlinkSync(req.file.path);
    }
});
