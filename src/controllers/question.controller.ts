import express from "express";
import path from "path";
import { Worker } from "worker_threads";
import logger from "../utils/logger";
import ApiResponse from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import * as fs from "fs";
import { processValidatedRows } from "../utils/excelProcessor";
import { createQuestions } from "../db/helpers/question.helpers";
import type { WorkerResult } from "../workers/excelParser.worker";

const WORKER_PATH = path.resolve(__dirname, "../workers/excelParser.worker.ts");

function runExcelWorker(filePath: string): Promise<WorkerResult> {
    return new Promise((resolve, reject) => {
        const worker = new Worker(WORKER_PATH, {
            workerData: { filePath },
            execArgv: ["--require", "ts-node/register"],
        });

        worker.on("message", (result: WorkerResult) => resolve(result));
        worker.on("error", (err) => reject(err));
        worker.on("exit", (code) => {
            if (code !== 0) {
                reject(new Error(`Excel worker exited with code ${code}`));
            }
        });
    });
}

const safeDeleteUploadedFile = async (filePath: string) => {
    try {
        await fs.promises.unlink(filePath);
    } catch (error) {
        logger.warn(`Unable to delete uploaded file at ${filePath}`, { error });
    }
};

export const saveExcel = async (req: express.Request, res: express.Response) => {
    const uploadedFile = req.file;
    if (!uploadedFile) {
        logger.warn("File not found, userId: " + req.loggedInUser.id);
        throw new ApiError(400, "File not found");
    }

    try {
        logger.info(`Starting Excel worker for file: ${uploadedFile.originalname}`);
        const workerResult = await runExcelWorker(uploadedFile.path);

        for (const err of workerResult.errors) {
            logger.error(err);
        }

        if (workerResult.rows.length === 0) {
            throw new ApiError(400, "No valid questions found in the uploaded file");
        }

        const processedQuestions = await processValidatedRows(
            workerResult.rows,
            workerResult.uniqueTopics,
        );

        const savedQuestions = await createQuestions(processedQuestions);

        if (!savedQuestions) {
            logger.warn("Questions couldn't be saved to database");
            throw new ApiError(400, "Questions not created");
        }

        logger.info(
            `${savedQuestions.length} questions saved successfully, firstId : ${savedQuestions[0].id}, lastId : ${savedQuestions[savedQuestions.length - 1].id}`
        );

        res.status(201).json(
            new ApiResponse(201, true, "Questions saved successfully")
        );
    } finally {
        await safeDeleteUploadedFile(uploadedFile.path);
    }
};
