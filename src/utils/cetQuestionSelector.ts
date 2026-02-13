import { ApiError } from "./ApiError";
import logger from "./logger";
import { getCETDistribution as fetchCETDistribution } from "../db/helpers/distribution.helpers";
import { findTopicsByNames } from "../db/helpers/topic.helpers";
import { db } from "../db/connection";
import { questions } from "../db/schema";
import { inArray, sql } from "drizzle-orm";

interface QuestionDistribution {
  questionIds: string[];
  totalMarks: number;
}

interface TopicRequirement {
  topicName: string;
  topicId: number;
  questionCount: number;
  marksPerQuestion: number;
}

export async function getCETQuestions(): Promise<QuestionDistribution> {
  try {
    const distribution = await fetchCETDistribution();
    if (!distribution) {
      throw new ApiError(404, "CET distribution configuration not found");
    }

    const allTopics = distribution.distributions.flatMap((subjectDist) =>
      subjectDist.topics.map((t) => ({
        topicName: t.topicName,
        topicId: t.topicId,
        questionCount: t.questionCount,
        marksPerQuestion: t.marksPerQuestion,
      }))
    );

    const namesNeedingResolution = allTopics
      .filter((t) => !t.topicId)
      .map((t) => t.topicName);

    let nameToIdMap = new Map<string, number>();
    if (namesNeedingResolution.length > 0) {
      const resolved = await findTopicsByNames(namesNeedingResolution);
      nameToIdMap = new Map(resolved.map((t) => [t.topicName, t.id]));
    }

    const topicRequirements: TopicRequirement[] = allTopics.map((t) => {
      const resolvedId = t.topicId ?? nameToIdMap.get(t.topicName);
      if (!resolvedId) {
        logger.warn(`Topic not found: ${t.topicName}`);
        throw new ApiError(404, `Topic not found: ${t.topicName}`);
      }
      return { ...t, topicId: resolvedId };
    });

    const allTopicIds = [...new Set(topicRequirements.map((t) => t.topicId))];
    const maxPerTopic = Math.max(...topicRequirements.map((t) => t.questionCount));

    const rankedSubquery = db
      .select({
        id: questions.id,
        topicId: questions.topicId,
        rowNum: sql<number>`ROW_NUMBER() OVER (PARTITION BY ${questions.topicId} ORDER BY RANDOM())`.as("row_num"),
      })
      .from(questions)
      .where(inArray(questions.topicId, allTopicIds))
      .as("ranked");

    const rows = await db
      .select({
        id: rankedSubquery.id,
        topicId: rankedSubquery.topicId,
        rowNum: rankedSubquery.rowNum,
      })
      .from(rankedSubquery)
      .where(sql`${rankedSubquery.rowNum} <= ${maxPerTopic}`);

    const questionsByTopic = new Map<number, string[]>();
    for (const row of rows) {
      const list = questionsByTopic.get(row.topicId) ?? [];
      list.push(row.id);
      questionsByTopic.set(row.topicId, list);
    }

    let allSelectedQuestions: string[] = [];
    let totalMarks = 0;

    for (const req of topicRequirements) {
      const available = questionsByTopic.get(req.topicId) ?? [];
      if (available.length < req.questionCount) {
        logger.warn(
          `Insufficient questions for topic ${req.topicName}. Needed: ${req.questionCount}, Found: ${available.length}`
        );
        throw new ApiError(
          400,
          `Insufficient questions for topic ${req.topicName}`
        );
      }
      allSelectedQuestions.push(...available.slice(0, req.questionCount));
      totalMarks += req.questionCount * req.marksPerQuestion;
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
