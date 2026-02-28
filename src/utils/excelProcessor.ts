import logger from "./logger";
import { findTopicByName, findTopicsByNames } from "../db/helpers/topic.helpers";
import type { ValidatedRow } from "../workers/excelParser.worker";

interface ProcessedRow {
  questionText: string;
  options: string[];
  answer: number;
  topicId: number;
  explanation?: string;
  standard: number;
}

export async function processValidatedRows(
  validatedRows: ValidatedRow[],
  uniqueTopics: string[],
): Promise<ProcessedRow[]> {
  const processedQuestions: ProcessedRow[] = [];
  const topicCache = new Map<string, { id: number }>();

  if (uniqueTopics.length > 0) {
    try {
      const foundTopics = await findTopicsByNames(uniqueTopics);
      for (const topic of foundTopics) {
        topicCache.set(topic.topicName.toLowerCase(), { id: topic.id });
      }
    } catch (error) {
      logger.warn("Failed to batch fetch topics, falling back to individual lookups", error);
    }
  }

  for (const { data: validatedRow, originalIndex } of validatedRows) {
    const topicName = validatedRow.topics.trim();
    let topic = topicCache.get(topicName);

    if (!topic) {
      const foundTopic = await findTopicByName(topicName);
      if (foundTopic) {
        topic = { id: foundTopic.id };
        topicCache.set(topicName, topic);
      }
    }

    if (!topic) {
      logger.error(`Topic "${topicName}" not found in database. Row ${originalIndex + 2}`);
      continue;
    }

    processedQuestions.push({
      questionText: validatedRow.question,
      options: [
        validatedRow.option_1,
        validatedRow.option_2,
        validatedRow.option_3,
        validatedRow.option_4,
      ],
      answer: validatedRow.answer,
      topicId: topic.id,
      explanation: validatedRow.explanation,
      standard: validatedRow.standard,
    });
  }

  return processedQuestions;
}
