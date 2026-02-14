import asyncHandler from "../utils/asyncHandler";
import express from "express";
import logger from "../utils/logger";
import ApiResponse from "../utils/ApiResponse";
import {ApiError} from "../utils/ApiError";
import * as ExcelJS from "exceljs";
import * as fs from "fs";
import {processExcelData} from "../utils/excelProcessor";
import { createQuestions } from "../db/helpers/question.helpers";

export const saveExcel = asyncHandler(async (req: express.Request, res: express.Response) => {
    if (!req.file) {
        logger.warn("File not found, userId: " + req.user?.id);
        throw new ApiError(400, "File not found");
    }

    try {
        // Read the uploaded Excel file using ExcelJS to avoid vulnerabilities in xlsx
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(req.file.path);
        const worksheet = workbook.worksheets[0];

        const sheetData: any[] = [];
        const headers: {[key: number]: string} = {};

        // Get headers from first row
        const headerRow = worksheet.getRow(1);
        headerRow.eachCell((cell, colNumber) => {
            headers[colNumber] = cell.text ? cell.text.toString() : "";
        });

        // Get data
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header row
            const rowData: any = {};

            // Initialize all headers with empty string
            Object.values(headers).forEach(header => {
                if(header) rowData[header] = "";
            });

            row.eachCell((cell, colNumber) => {
                const header = headers[colNumber];
                if (header) {
                    // Extract value safely
                    let cellValue = "";
                    if (cell.value !== null && cell.value !== undefined) {
                        if (typeof cell.value === 'object') {
                             if ('text' in cell.value) {
                                 cellValue = (cell.value as any).text;
                             } else if ('result' in cell.value) {
                                 cellValue = String((cell.value as any).result);
                             } else {
                                 cellValue = String(cell.value);
                             }
                        } else {
                            cellValue = String(cell.value);
                        }
                    }
                    rowData[header] = cellValue;
                }
            });
            sheetData.push(rowData);
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
