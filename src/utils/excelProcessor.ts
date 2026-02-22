import { ExcelRowSchema } from "../ZodSchema/excelSchema";
import logger from "./logger";
import { ApiError } from "./ApiError";
import { z } from "zod";
import { findTopicByName, findTopicsByNames } from "../db/helpers/topic.helpers";

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
    const uniqueTopics = new Set<string>();
    for (const row of rows) {
      if (row?.topics && typeof row.topics === "string") {
        uniqueTopics.add(row.topics.toLowerCase().trimStart());
      }
    }

    if (uniqueTopics.size > 0) {
      const allTopics = Array.from(uniqueTopics);
      // Batch size to prevent DB driver errors with too many parameters
      const BATCH_SIZE = 1000;

      for (let i = 0; i < allTopics.length; i += BATCH_SIZE) {
        const batch = allTopics.slice(i, i + BATCH_SIZE);
        const foundTopics = await findTopicsByNames(batch);
        for (const topic of foundTopics) {
          topicCache.set(topic.topicName.toLowerCase(), { id: topic.id });
        }
      }
    }
  } catch (error) {
    logger.warn("Failed to batch fetch topics, falling back to individual lookups", error);
  }


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
        // Fallback for safety in case of cache miss or race condition
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
  
}
