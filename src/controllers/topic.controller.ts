import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import { CETDistribution } from "../models/tests/cetDistribution.model";
import { Topic } from "../models/topics/topic.model";
import { Subject } from "../models/topics/subject.model";
import ApiResponse from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import logger from "../utils/logger";

/**
 * Get all CET topics with their distribution information
 */
const getCETTopics = asyncHandler(async (req: Request, res: Response) => {
  try {
    // Get the CET distribution configuration
    const cetDistribution = await CETDistribution.findOne();
    
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
  } catch (error) {
    logger.error("Error fetching CET topics:", error);
    throw error;
  }
});

/**
 * Get all available topics grouped by subject
 */
const getAllTopics = asyncHandler(async (req: Request, res: Response) => {
  try {
    // Aggregate to get all topics with their subjects
    const topics = await Topic.aggregate([
      {
        $lookup: {
          from: "subjects",
          localField: "subjectId",
          foreignField: "_id",
          as: "subject"
        }
      },
      {
        $unwind: "$subject"
      },
      {
        $lookup: {
          from: "domains",
          localField: "subject.domainId",
          foreignField: "_id",
          as: "domain"
        }
      },
      {
        $unwind: "$domain"
      },
      {
        $group: {
          _id: "$subject.subjectName",
          subjectName: { $first: "$subject.subjectName" },
          domainName: { $first: "$domain.domainName" },
          educationLevel: { $first: "$domain.educationLevel" },
          topics: {
            $push: {
              topicId: "$_id",
              topicName: "$topicName"
            }
          }
        }
      },
      {
        $group: {
          _id: "$domainName",
          domainName: { $first: "$domainName" },
          educationLevel: { $first: "$educationLevel" },
          subjects: {
            $push: {
              subjectName: "$subjectName",
              topics: "$topics"
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          domainName: 1,
          educationLevel: 1,
          subjects: 1
        }
      }
    ]);

    res.status(200).json(
      new ApiResponse(200, { domains: topics }, "All topics fetched successfully")
    );
  } catch (error) {
    logger.error("Error fetching all topics:", error);
    throw error;
  }
});

/**
 * Get topics for a specific subject
 */
const getTopicsBySubject = asyncHandler(async (req: Request, res: Response) => {
  const { subjectName } = req.params;
  
  try {
    // Find the subject
    const subject = await Subject.findOne({ 
      subjectName: subjectName.toLowerCase() 
    });
    
    if (!subject) {
      logger.error(`Subject not found: ${subjectName}`);
      throw new ApiError(404, `Subject not found: ${subjectName}`);
    }
    
    // Find topics for this subject
    const topics = await Topic.find({ subjectId: subject._id });
    
    if (topics.length === 0) {
      logger.warn(`No topics found for subject: ${subjectName}`);
    }
    
    res.status(200).json(
      new ApiResponse(200, { 
        subject: subjectName,
        topics: topics.map(t => ({
          topicId: t._id,
          topicName: t.topicName
        }))
      }, "Topics fetched successfully")
    );
  } catch (error) {
    logger.error(`Error fetching topics for subject ${subjectName}:`, error);
    throw error;
  }
});

export { getCETTopics, getAllTopics, getTopicsBySubject };