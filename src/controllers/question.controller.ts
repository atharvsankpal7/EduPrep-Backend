import asyncHandler from "../utils/asyncHandler";
import express from "express";
import logger from "../utils/logger";
import ApiResponse from "../utils/ApiResponse";
import {ApiError} from "../utils/ApiError";
import fs from "fs";
import path from "path";
import { Worker } from "worker_threads";
import {processExcelData} from "../utils/excelProcessor";
import { createQuestions } from "../db/helpers/question.helpers";

export const saveExcel = asyncHandler(async (req: express.Request, res: express.Response) => {
    if (!req.file) {
        logger.warn("File not found, userId: " + req.user?.id);
        throw new ApiError(400, "File not found");
    }

    try {
        // Offload Excel parsing to a worker thread to avoid blocking the event loop
        const isTs = __filename.endsWith(".ts");
        const workerPath = path.resolve(__dirname, "../workers/excelWorker" + (isTs ? ".ts" : ".js"));

        const sheetData = await new Promise<any[]>((resolve, reject) => {
            const worker = new Worker(workerPath, {
                workerData: { filePath: req.file!.path },
                execArgv: isTs ? ["-r", "ts-node/register"] : undefined
            });

            worker.on("message", (message) => {
                if (message.success) {
                    resolve(message.data);
                } else {
                    reject(new Error(message.error || "Unknown worker error"));
                }
            });

            worker.on("error", (err) => {
                reject(err);
            });

            worker.on("exit", (code) => {
                if (code !== 0) {
                    reject(new Error(`Worker stopped with exit code ${code}`));
                }
            });
        });

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
