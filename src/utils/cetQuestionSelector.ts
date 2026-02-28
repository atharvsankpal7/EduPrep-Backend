import { ApiError } from "./ApiError";
import logger from "./logger";
import { getCETDistribution as fetchCETDistribution } from "../db/helpers/distribution.helpers";
import { getRandomQuestionIdsFromTopics } from "../db/helpers/question.helpers";
import { findTopicsByNames } from "../db/helpers/topic.helpers";

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

    // 1. Gather all topic names that need resolution
    const topicsToResolve = new Set<string>();
    distribution.distributions.forEach((subject) => {
      subject.topics.forEach((topic) => {
        if (!topic.topicId) {
          topicsToResolve.add(topic.topicName);
        }
      });
    });

    // 2. Batch resolve topic IDs
    const topicMap = new Map<string, number>();
    if (topicsToResolve.size > 0) {
      const resolvedTopics = await findTopicsByNames(Array.from(topicsToResolve));
      resolvedTopics.forEach((t) => topicMap.set(t.topicName, t.id));
    }

    // 3. Process all topics in parallel
    const promises: Promise<string[]>[] = [];

    for (const subjectDist of distribution.distributions) {
      for (const topic of subjectDist.topics) {
        const topicId = topic.topicId ?? topicMap.get(topic.topicName);

        if (!topicId) {
          logger.warn(`Topic not found: ${topic.topicName}`);
          throw new ApiError(404, `Topic not found: ${topic.topicName}`);
        }

        // Add to total marks calculation immediately
        totalMarks += topic.questionCount * topic.marksPerQuestion;

        // Queue the question fetch
        promises.push(
          getRandomQuestionIdsFromTopics([topicId], topic.questionCount).then(
            (ids) => {
              if (ids.length < topic.questionCount) {
                logger.warn(
                  `Insufficient questions for topic ${topic.topicName}. Needed: ${topic.questionCount}, Found: ${ids.length}`
                );
                throw new ApiError(
                  400,
                  `Insufficient questions for topic ${topic.topicName}`
                );
              }
              return ids;
            }
          )
        );
      }
    }

    // 4. Wait for all question fetches to complete
    const results = await Promise.all(promises);
    allSelectedQuestions = results.flat();

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
