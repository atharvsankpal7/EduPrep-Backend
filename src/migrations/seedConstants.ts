import dotenv from "dotenv";
import logger from "../utils/logger";
import { connectToDatabase, closeDatabase } from "../db/connection";
import { upsertConstant } from "../db/helpers/constants.helpers";

dotenv.config({ path: "./.env" });

async function seedConstants() {
  try {
    await connectToDatabase();
    await upsertConstant("MAX_CONCURRENT_SESSION_COUNT", {
      MAX_CONCURRENT_SESSION_COUNT: 1,
    });
    logger.info("Constants seeded successfully");
  } catch (error) {
    logger.error("Failed to seed constants:", error);
    process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
}

seedConstants();
