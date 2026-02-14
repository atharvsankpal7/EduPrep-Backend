import { ExcelRowSchema } from "../ZodSchema/excelSchema";
import logger from "./logger";
import { ApiError } from "./ApiError";
import { z } from "zod";
import { findTopicByName } from "../db/helpers/topic.helpers";

interface ProcessedRow {
  questionText: string;
  options: string[];
  answer: number;
  topicId: number;
  explanation?: string;
  standard: number;
}

function sanitizeForCSV(value: string): string {
  if (/^[=+\-@]/.test(value)) {
    return `'${value}`;
  }
  return value;
}

export async function processExcelData(rows: any[]): Promise<ProcessedRow[]> {
  const processedQuestions: ProcessedRow[] = [];
  const topicCache = new Map<string, { id: number }>();

  try {
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
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
        const foundTopic = await findTopicByName(topicName);
        if (foundTopic) {
          topic = { id: foundTopic.id };
        }

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
        questionText: sanitizeForCSV(validatedRow.question),
        options: [
          sanitizeForCSV(validatedRow.option_1),
          sanitizeForCSV(validatedRow.option_2),
          sanitizeForCSV(validatedRow.option_3),
          sanitizeForCSV(validatedRow.option_4),
        ],
        answer: validatedRow.answer,
        topicId: topic.id,
        explanation: sanitizeForCSV(validatedRow.explanation),
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
