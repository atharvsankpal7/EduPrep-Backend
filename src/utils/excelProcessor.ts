import { ExcelRowSchema } from "../ZodSchema/excelSchema";
import logger from "./logger";
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

// Define the type inferred from schema for type safety
type ExcelRow = z.infer<typeof ExcelRowSchema>;

function sanitizeForCSV(value: string): string {
  if (/^[=+\-@]/.test(value)) {
    return `'${value}`;
  }
  return value;
}

export async function processExcelData(rows: unknown[]): Promise<ProcessedRow[]> {
  const processedQuestions: ProcessedRow[] = [];
  const topicCache = new Map<string, { id: number }>();

  // Store validated rows to avoid re-parsing and re-iterating raw data
  const validatedRows: { data: ExcelRow; originalIndex: number }[] = [];
  const uniqueTopics = new Set<string>();

  // 1. Single pass for validation and topic collection
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const validation = ExcelRowSchema.safeParse(row);

    if (!validation.success) {
      logger.error(`Invalid data in Excel row ${index + 2}: ${JSON.stringify(row)}`);
      continue;
    }

    const validatedRow = validation.data;
    // Schema ensures topics is lowercased string. We trim just in case.
    const topicName = validatedRow.topics.trim();

    uniqueTopics.add(topicName);
    validatedRows.push({ data: validatedRow, originalIndex: index });
  }

  // 2. Batch fetch topics
  if (uniqueTopics.size > 0) {
    try {
      const foundTopics = await findTopicsByNames(Array.from(uniqueTopics));
      for (const topic of foundTopics) {
        topicCache.set(topic.topicName.toLowerCase(), { id: topic.id });
      }
    } catch (error) {
      logger.warn("Failed to batch fetch topics, falling back to individual lookups", error);
    }
  }

  // 3. Process validated rows
  for (const { data: validatedRow, originalIndex } of validatedRows) {
    const topicName = validatedRow.topics.trim();
    let topic = topicCache.get(topicName);

    if (!topic) {
      // Fallback for safety in case of cache miss (e.g. topic not found in batch fetch)
      const foundTopic = await findTopicByName(topicName);
      if (foundTopic) {
        topic = { id: foundTopic.id };
        // Update cache for future hits
        topicCache.set(topicName, topic);
      }
    }

    if (!topic) {
      logger.error(`Topic "${topicName}" not found in database. Row ${originalIndex + 2}`);
      continue;
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
