import dotenv from "dotenv";
import logger from "./logger";
import { connectToDatabase, closeDatabase } from "../db/connection";
import { createUser, findAnyAdmin } from "../db/helpers/user.helpers";

dotenv.config();

async function seedAdmin() {
  try {
    await connectToDatabase();
    logger.info("Connected to PostgreSQL for admin seeding");

    // Check if admin already exists
    const adminExists = await findAnyAdmin();
    
    if (adminExists) {
      logger.info("Admin user already exists, skipping seed");
      return;
    }

    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      throw new Error("ADMIN_PASSWORD environment variable is not set");
    }

    // Create admin user
    const admin = await createUser({
      fullName: "System Admin",
      email: "admin@example.com",
      password: adminPassword,
      role: "admin"
    });

    logger.info(`Admin user created with ID: ${admin.id}`);




  } catch (error) {
    logger.error("Error seeding admin user:", error);
  } finally {
    await closeDatabase();
  }
}

// Run the seed function
seedAdmin();
