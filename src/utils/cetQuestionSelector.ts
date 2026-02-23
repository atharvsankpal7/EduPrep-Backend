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

    // Optimization: Parallelize topic resolution and question fetching
    const uniqueTopicNames = new Set<string>();
    const allTopics: {
      topicName: string;
      questionCount: number;
      marksPerQuestion: number;
      topicId?: number;
    }[] = [];

    // First pass: collect unique names and flatten list
    for (const subjectDist of distribution.distributions) {
      for (const topic of subjectDist.topics) {
        allTopics.push(topic);
        if (!topic.topicId) {
          uniqueTopicNames.add(topic.topicName);
        }
      }
    }

    // Batch resolve missing IDs
    const topicIdMap = new Map<string, number>();
    if (uniqueTopicNames.size > 0) {
      const foundTopics = await findTopicsByNames(Array.from(uniqueTopicNames));
      for (const t of foundTopics) {
        topicIdMap.set(t.topicName, t.id);
      }
    }

    // Parallel question fetching
    const questionTasks = allTopics.map(async (topic) => {
      let topicId = topic.topicId;
      if (!topicId) {
        topicId = topicIdMap.get(topic.topicName);
        // Fallback: If not in batch result, try individual lookup
        if (!topicId) {
          const t = await findTopicByName(topic.topicName);
          if (t) topicId = t.id;
        }
      }

      if (!topicId) {
        logger.warn(`Topic not found: ${topic.topicName}`);
        throw new ApiError(404, `Topic not found: ${topic.topicName}`);
      }

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

    const results = await Promise.all(questionTasks);

    // Aggregate results
    let allSelectedQuestions: string[] = [];
    let totalMarks = 0;

    for (const res of results) {
      allSelectedQuestions.push(...res.ids);
      totalMarks += res.marks;
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
