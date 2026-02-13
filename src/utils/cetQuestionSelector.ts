import { ApiError } from "./ApiError";
import logger from "./logger";
import { getCETDistribution as fetchCETDistribution } from "../db/helpers/distribution.helpers";
import { getRandomQuestionsFromTopics } from "../db/helpers/question.helpers";
import { findTopicByName } from "../db/helpers/topic.helpers";
import { Question } from "../db/schema/questions";

export interface EnrichedQuestion extends Question {
  subjectName: string;
  topicName: string;
}

interface QuestionDistribution {
  questionIds: string[];
  totalMarks: number;
  questions: EnrichedQuestion[];
}

export async function getCETQuestions(): Promise<QuestionDistribution> {
  try {
    const distribution = await fetchCETDistribution();
    if (!distribution) {
      throw new ApiError(404, "CET distribution configuration not found");
    }

    // Flatten all topics from all subjects into a single list of tasks
    const tasks = distribution.distributions.flatMap((subjectDist) =>
      subjectDist.topics.map(async (topic) => {
        const topicId =
          topic.topicId ?? (await findTopicByName(topic.topicName))?.id;

        if (!topicId) {
          logger.warn(`Topic not found: ${topic.topicName}`);
          throw new ApiError(404, `Topic not found: ${topic.topicName}`);
        }

        // Get questions for this specific topic
        const topicQuestions = await getRandomQuestionsFromTopics(
          [topicId],
          topic.questionCount
        );

        if (topicQuestions.length < topic.questionCount) {
          logger.warn(
            `Insufficient questions for topic ${topic.topicName}. Needed: ${topic.questionCount}, Found: ${topicQuestions.length}`
          );
          throw new ApiError(
            400,
            `Insufficient questions for topic ${topic.topicName}`
          );
        }

        const marks = topic.questionCount * topic.marksPerQuestion;

        // Enrich questions with subject and topic names
        const enrichedQuestions: EnrichedQuestion[] = topicQuestions.map(
          (q) => ({
            ...q,
            subjectName: subjectDist.subject,
            topicName: topic.topicName,
          })
        );

        return {
          questions: enrichedQuestions,
          marks,
        };
      })
    );

    // Execute all tasks in parallel
    const results = await Promise.all(tasks);

    // Aggregate results
    const allEnrichedQuestions = results.flatMap((r) => r.questions);
    const totalMarks = results.reduce((sum, r) => sum + r.marks, 0);
    const questionIds = allEnrichedQuestions.map((q) => q.id);

    return {
      questionIds,
      totalMarks,
      questions: allEnrichedQuestions,
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
