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

  // Store valid rows to avoid re-parsing
  const validRows: { data: z.infer<typeof ExcelRowSchema>, originalIndex: number }[] = [];
  const uniqueTopics = new Set<string>();

  // Pass 1: Validate and collect topics
  for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      // Validate row data
      const validation = ExcelRowSchema.safeParse(row);

      if(!validation.success) {
        logger.error(`Invalid data in Excel row ${index + 2}: ${JSON.stringify(row)}`);
        continue;
      }

      const validatedRow = validation.data;
      // validatedRow.topics is already lowercase due to schema transform
      const topicName = validatedRow.topics.trimStart();

      validRows.push({ data: validatedRow, originalIndex: index });
      uniqueTopics.add(topicName);
  }

  // Batch fetch topics
  try {
    if (uniqueTopics.size > 0) {
      const foundTopics = await findTopicsByNames(Array.from(uniqueTopics));
      for (const topic of foundTopics) {
        topicCache.set(topic.topicName.toLowerCase(), { id: topic.id });
      }
    }
  } catch (error) {
    logger.warn("Failed to batch fetch topics, falling back to individual lookups", error);
  }

  // Pass 2: Process using cache
  for (const { data: validatedRow, originalIndex } of validRows) {
      const topicName = validatedRow.topics.trimStart();
      let topic = topicCache.get(topicName);

      if (!topic) {
        // Fallback for safety in case of cache miss or race condition
        const foundTopic = await findTopicByName(topicName);
        if (foundTopic) {
          topic = { id: foundTopic.id };
          // Update cache
          topicCache.set(topicName, topic);
        }

        if (!topic) {
          logger.error(
            `Invalid topic in Excel row ${originalIndex + 2}: ${topicName}`
          );
          continue;
        }
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
