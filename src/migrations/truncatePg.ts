import dotenv from "dotenv";
import {  db } from "../db/connection";
import { sql } from "drizzle-orm";
import logger from "../utils/logger";

dotenv.config({ path: "./.env" });

async function truncateDatabase() {
  try {
    await db.execute(sql`
      TRUNCATE TABLE
        test_result_answers,
        test_results,
        test_section_questions,
        test_sections,
        tests,
        sessions,
        company_specific_tests,
        cet_distributions,
        questions,
        topics,
        subjects,
        domains,
        users,
        constants
      RESTART IDENTITY CASCADE;
    `);

    logger.info("PostgreSQL database truncated successfully");
  } catch (error) {
    logger.error("Failed to truncate PostgreSQL database:", error);
    process.exitCode = 1;
  }
}

truncateDatabase();

