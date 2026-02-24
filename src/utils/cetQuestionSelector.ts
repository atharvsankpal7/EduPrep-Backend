import { ApiError } from "./ApiError";
import logger from "./logger";
import { getCETDistribution as fetchCETDistribution } from "../db/helpers/distribution.helpers";
import { getRandomQuestionIdsFromTopics } from "../db/helpers/question.helpers";
import { findTopicByName } from "../db/helpers/topic.helpers";

interface QuestionDistribution {
  questionIds: string[];
  totalMarks: number;
  subjectQuestionIds: Record<string, string[]>;
}

export async function getCETQuestions(): Promise<QuestionDistribution> {
  try {
    const distribution = await fetchCETDistribution();
    if (!distribution) {
      throw new ApiError(404, "CET distribution configuration not found");
    }

    let allSelectedQuestions: string[] = [];
    let totalMarks = 0;
    const subjectQuestionIds: Record<string, string[]> = {};

    for (const subjectDist of distribution.distributions) {
      const normalizedSubject = subjectDist.subject.toLowerCase();
      if (!subjectQuestionIds[normalizedSubject]) {
        subjectQuestionIds[normalizedSubject] = [];
      }

      for (const topic of subjectDist.topics) {
        const topicId = topic.topicId ?? (await findTopicByName(topic.topicName))?.id;

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

        allSelectedQuestions = [...allSelectedQuestions, ...topicQuestionIds];
        subjectQuestionIds[normalizedSubject].push(...topicQuestionIds);
        totalMarks += topic.questionCount * topic.marksPerQuestion;
      }
    }

    return {
      questionIds: allSelectedQuestions,
      totalMarks,
      subjectQuestionIds,
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
