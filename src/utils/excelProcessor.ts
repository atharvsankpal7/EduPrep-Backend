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
  const validRows: z.infer<typeof ExcelRowSchema>[] = [];
  const uniqueTopics = new Set<string>();

  // 1. Single pass: Validate rows and collect unique topics
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const validation = ExcelRowSchema.safeParse(row);

    if (!validation.success) {
      logger.error(`Invalid data in Excel row ${index + 2}: ${JSON.stringify(row)}`);
      continue;
    }

    const validatedRow = validation.data;
    validRows.push(validatedRow);
    // Topics are already lowercased and trimmed by the schema
    uniqueTopics.add(validatedRow.topics);
  }

  // 2. Batch fetch topics
  const topicCache = new Map<string, { id: number }>();
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

  // 3. Process valid rows
  for (const validatedRow of validRows) {
      const topicName = validatedRow.topics;
      let topic = topicCache.get(topicName);

      if (!topic) {
        // Fallback for safety in case of cache miss or race condition
        const foundTopic = await findTopicByName(topicName);
        if (foundTopic) {
          topic = { id: foundTopic.id };
          topicCache.set(topicName, topic);
        } else {
          logger.error(`Invalid topic: ${topicName}`);
          continue;
        }
      }

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
