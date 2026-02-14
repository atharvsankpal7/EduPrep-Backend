import { Request, Response } from "express";
import ApiResponse from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import logger from "../utils/logger";
import { getCETDistribution } from "../db/helpers/distribution.helpers";
import { findSubjectByName, getTopicsBySubject as fetchTopicsBySubject, getTopicsWithSubject } from "../db/helpers/topic.helpers";
import { subjectNameParamsSchema } from "../ZodSchema/topicSchema";
import { validateType } from "../utils/zodValidator";

/**
 * Get all CET topics with their distribution information
 */
const getCETTopics = async (_req: Request, res: Response) => {
  // Get the CET distribution configuration
  const cetDistribution = await getCETDistribution();

  if (!cetDistribution) {
    logger.error("CET distribution configuration not found");
    throw new ApiError(404, "CET distribution configuration not found");
  }

  // Transform the data to match the required format
  const topicsBySubject = cetDistribution.distributions.map(dist => {
    return {
      subject: dist.subject,
      standard: dist.standard,
      topics: dist.topics.map(topic => ({
        topicName: topic.topicName,
        questionCount: topic.questionCount,
        topicId: topic.topicId
      }))
    };
  });

  res.status(200).json(
    new ApiResponse(200, { topicsBySubject }, "CET topics fetched successfully")
  );
};

/**
 * Get all available topics grouped by subject
 */
const getAllTopics = async (_req: Request, res: Response) => {
  // Aggregate to get all topics with their subjects
  const rows = await getTopicsWithSubject();
  const domainMap = new Map<string, { domainName: string; educationLevel: string; subjects: Map<string, { subjectName: string; topics: { topicId: number; topicName: string }[] }> }>();

  rows.forEach((row) => {
    if (!row.domainName || !row.subjectName) {
      return;
    }

    if (!domainMap.has(row.domainName)) {
      domainMap.set(row.domainName, {
        domainName: row.domainName,
        educationLevel: row.educationLevel ?? "",
        subjects: new Map(),
      });
    }

    const domain = domainMap.get(row.domainName)!;
    if (!domain.subjects.has(row.subjectName)) {
      domain.subjects.set(row.subjectName, {
        subjectName: row.subjectName,
        topics: [],
      });
    }

    domain.subjects.get(row.subjectName)!.topics.push({
      topicId: row.id,
      topicName: row.topicName,
    });
  });

  const topics = Array.from(domainMap.values()).map((domain) => ({
    domainName: domain.domainName,
    educationLevel: domain.educationLevel,
    subjects: Array.from(domain.subjects.values()),
  }));

  res.status(200).json(
    new ApiResponse(200, { domains: topics }, "All topics fetched successfully")
  );
};

/**
 * Get topics for a specific subject
 */
const getTopicsBySubject = async (req: Request, res: Response) => {
  const { subjectName } = validateType(subjectNameParamsSchema, req.params);

  // Find the subject
  const subject = await findSubjectByName(subjectName);

  if (!subject) {
    logger.error(`Subject not found: ${subjectName}`);
    throw new ApiError(404, `Subject not found: ${subjectName}`);
  }

  // Find topics for this subject
  const topics = await fetchTopicsBySubject(subject.id);

  if (topics.length === 0) {
    logger.warn(`No topics found for subject: ${subjectName}`);
  }

  res.status(200).json(
    new ApiResponse(200, {
      subject: subjectName,
      topics: topics.map(t => ({
        topicId: t.id,
        topicName: t.topicName
      }))
    }, "Topics fetched successfully")
  );
};

export { getCETTopics, getAllTopics, getTopicsBySubject };
