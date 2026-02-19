import { ApiError } from "./ApiError";
import logger from "./logger";
import { getCETDistribution as fetchCETDistribution } from "../db/helpers/distribution.helpers";
import { getRandomQuestionIdsFromTopics } from "../db/helpers/question.helpers";
import { findTopicByName } from "../db/helpers/topic.helpers";

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

    let allSelectedQuestions: string[] = [];
    let totalMarks = 0;

    for (const subjectDist of distribution.distributions) {
      for (const topic of subjectDist.topics) {
        const topicId = topic.topicId ?? (await findTopicByName(topic.topicName))?.id;

        if (!topicId) {
          logger.warn(`Topic not found: ${topic.topicName}`);
          throw new ApiError(404, `Topic not found: ${topic.topicName}`);
        }

        // Get questions for this specific topic
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

        // Add selected questions and calculate marks
        allSelectedQuestions = [
          ...allSelectedQuestions,
          ...topicQuestionIds,
        ];
        totalMarks += topic.questionCount * topic.marksPerQuestion;
      }
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
