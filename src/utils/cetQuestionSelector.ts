import { ApiError } from "./ApiError";
import logger from "./logger";
import { getCETDistribution as fetchCETDistribution } from "../db/helpers/distribution.helpers";


interface QuestionDistribution {
  questionIds: string[];

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
