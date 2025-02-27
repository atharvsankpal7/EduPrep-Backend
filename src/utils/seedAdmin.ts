import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "../models/user/user.model";
import logger from "./logger";

dotenv.config();

async function seedAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI!);
    logger.info("Connected to MongoDB for admin seeding");

    // Check if admin already exists
    const adminExists = await User.findOne({ role: "admin" });
    
    if (adminExists) {
      logger.info("Admin user already exists, skipping seed");
      return;
    }

    // Create admin user
    const admin = await User.create({
      fullName: "System Admin",
      email: "admin@example.com",
      password: "Admin@123456", // This should be changed after first login
      urn: 9999999999,
      role: "admin"
    });

    logger.info(`Admin user created with ID: ${admin._id}`);
    console.log("Admin user created successfully");
    console.log("Email: admin@example.com");
    console.log("Password: Admin@123456");
    console.log("Please change this password after first login");

  } catch (error) {
    logger.error("Error seeding admin user:", error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the seed function
seedAdmin();