import { ApiError } from "./ApiError";
import logger from "./logger";
import { getCETDistribution as fetchCETDistribution } from "../db/helpers/distribution.helpers";
import { getRandomQuestionIdsFromTopics } from "../db/helpers/question.helpers";
import { findTopicByName, findTopicsByNames } from "../db/helpers/topic.helpers";

interface QuestionDistribution {
  questionIds: string[];
  totalMarks: number;
}

export async function getCETQuestions(): Promise<QuestionDistribution> {
  try {
    const distribution = await fetchCETDistribution();
    if (!distribution) {
      throw new ApiError(404, "CET distribution configuration not found");
    }

    // PERFORMANCE OPTIMIZATION:
    // 1. Flatten the nested structure to process topics efficiently.
    // 2. Batch fetch missing topic IDs to avoid N+1 queries.
    // 3. Parallelize question fetching using Promise.all.

    const topicsToResolve = new Set<string>();
    const allTopics: Array<{
      topicName: string;
      topicId?: number;
      questionCount: number;
      marksPerQuestion: number;
    }> = [];

    // Phase 1: Collection & Flattening
    for (const subjectDist of distribution.distributions) {
      for (const topic of subjectDist.topics) {
        allTopics.push(topic);
        if (!topic.topicId) {
          topicsToResolve.add(topic.topicName);
        }
      }
    }

    // Phase 2: Batch ID Resolution
    const topicIdMap = new Map<string, number>();
    if (topicsToResolve.size > 0) {
      const resolvedTopics = await findTopicsByNames(Array.from(topicsToResolve));
      for (const t of resolvedTopics) {
        topicIdMap.set(t.topicName, t.id);
      }
    }

    // Phase 3: Parallel Execution
    const questionPromises = allTopics.map(async (topic) => {
      let topicId = topic.topicId;

      // Resolve ID from cache if missing
      if (!topicId) {
        topicId = topicIdMap.get(topic.topicName);
      }

      // Fallback: Individual lookup (should rarely happen if batch fetch works)
      if (!topicId) {
        const found = await findTopicByName(topic.topicName);
        if (found) topicId = found.id;
      }

      if (!topicId) {
        logger.warn(`Topic not found: ${topic.topicName}`);
        throw new ApiError(404, `Topic not found: ${topic.topicName}`);
      }

      // Fetch questions for this topic
      const topicQuestionIds = await getRandomQuestionIdsFromTopics(
        [topicId],
        topic.questionCount
      );

      if (topicQuestionIds.length < topic.questionCount) {
        logger.warn(
          `Insufficient questions for topic ${topic.topicName}. Needed: ${topic.questionCount}, Found: ${topicQuestionIds.length}`
        );
        throw new ApiError(
          400,
          `Insufficient questions for topic ${topic.topicName}`
        );
      }

      return {
        ids: topicQuestionIds,
        marks: topic.questionCount * topic.marksPerQuestion,
      };
    });

    // Execute all tasks concurrently
    const results = await Promise.all(questionPromises);

    // Phase 4: Aggregation
    const allSelectedQuestions: string[] = [];
    let totalMarks = 0;

    for (const result of results) {
      allSelectedQuestions.push(...result.ids);
      totalMarks += result.marks;
    }

    return {
      questionIds: allSelectedQuestions,
      totalMarks,
    };
  } catch (error) {
    logger.error("Error in CET question selection:", error);
    throw error;
  }
}

/**
 * Get the distribution of questions for CET by topic
 */
export async function getCETDistribution() {
  try {
    const distribution = await fetchCETDistribution();
    if (!distribution) {
      throw new ApiError(404, "CET distribution configuration not found");
    }

    return distribution.distributions;
  } catch (error) {
    logger.error("Error fetching CET distribution:", error);
    throw error;
  }
}
