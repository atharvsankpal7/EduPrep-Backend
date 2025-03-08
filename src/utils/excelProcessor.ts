import { Subject } from "../models/topics/subject.model";
import { Topic } from "../models/topics/topic.model";
import { ExcelRowSchema } from "../ZodSchema/excelSchema";
import logger from "./logger";
import { ApiError } from "./ApiError";
import { z } from "zod";
import { log } from "winston";

interface ProcessedRow {
  questionText: string;
  options: string[];
  answer: number;
  topicId: string;
  explanation?: string;
  standard: number;
}

export async function processExcelData(rows: any[]): Promise<ProcessedRow[]> {
  const processedQuestions: ProcessedRow[] = [];
  const topicCache = new Map<string, any>();

  try {
    for (const [index, row] of rows.entries()) {
      // Validate row data
      const validation = ExcelRowSchema.safeParse(row);
      if(!validation.success) {
        logger.error(`Invalid data in Excel row ${index + 2}: ${JSON.stringify(row)}`);
        continue;
        // throw new ApiError(400, `Invalid data in Excel row ${index + 2}`);
      }
      const validatedRow = validation.data;
      // Process topic
      const topicName = validatedRow.topics.toLowerCase().trimStart();
      let topic = topicCache.get(topicName);

      if (!topic) {
        topic = await Topic.findOne({ topicName });

        if (!topic) {
          
          logger.error(
            `Invalid topic in Excel row ${index + 2}: ${topicName}`
          );
          continue;
          // throw new ApiError(
          //   400,
          //   `Topic "${topicName}" not found in database. Please check row ${
          //     index + 2
          //   } in Excel file.`
          // );
        } else topicCache.set(topicName, topic);
      }

      // Prepare question data
      processedQuestions.push({
        questionText: validatedRow.question,
        options: [
          validatedRow.option_1,
          validatedRow.option_2,
          validatedRow.option_3,
          validatedRow.option_4,
        ],
        answer: validatedRow.answer,
        topicId: topic._id.toString(),
        explanation: validatedRow.explanation,
        standard: validatedRow.standard,
      });
    }

    return processedQuestions;
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error("Validation error:", error);
      throw new ApiError(
        400,
        "Invalid data format in Excel file",
        error.errors.map((e) => e.message)
      );
    }
    throw error;
  }
}