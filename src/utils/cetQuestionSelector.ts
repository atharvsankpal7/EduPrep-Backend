import mongoose from "mongoose";
import { Question } from "../models/questions/questions.model";
import { CETDistribution } from "../models/tests/cetDistribution.model";
import { Topic } from "../models/topics/topic.model";
import { ApiError } from "./ApiError";
import logger from "./logger";

interface QuestionDistribution {
  questionIds: string[];
  totalMarks: number;
}

export async function getCETQuestions(): Promise<QuestionDistribution> {
  try {
    const distribution = await CETDistribution.findOne();
    if (!distribution) {
      throw new ApiError(404, "CET distribution configuration not found");
    }

    let allSelectedQuestions: string[] = [];
    let totalMarks = 0;

    for (const subjectDist of distribution.distributions) {
      for (const topic of subjectDist.topics) {
        // Find topic ID from the Topic model
        const topicDoc = await Topic.findOne({
          topicName: topic.topicName.toLowerCase(),
        });

        if (!topicDoc) {
          logger.warn(`Topic not found: ${topic.topicName}`);
          throw new ApiError(404, `Topic not found: ${topic.topicName}`);
        }
        console.log(topicDoc.id);
        // Get questions for this specific topic
        const topicQuestions = await Question.aggregate([
          {
            $match: {
              topicId: new mongoose.Types.ObjectId(topicDoc.id),
            },
          },
          { $sample: { size: topic.questionCount } },
          { $project: { _id: 1 } },
        ]);
        console.log(topicQuestions);
        console.log(topic.topicName);
        if (topicQuestions.length < topic.questionCount) {
          logger.warn(
            `Insufficient questions for topic ${topic.topicName}. Needed: ${topic.questionCount}, Found: ${topicQuestions.length}`
          );
          throw new ApiError(
            400,
            `Insufficient questions for topic ${topic.topicName}`
          );
        }

        // Add selected questions and calculate marks
        allSelectedQuestions = [
          ...allSelectedQuestions,
          ...topicQuestions.map((q) => q._id.toString()),
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
    const distribution = await CETDistribution.findOne();
    if (!distribution) {
      throw new ApiError(404, "CET distribution configuration not found");
    }

    return distribution.distributions;
  } catch (error) {
    logger.error("Error fetching CET distribution:", error);
    throw error;
  }
}
