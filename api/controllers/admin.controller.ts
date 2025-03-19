import express from "express";
import asyncHandler from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { User } from "../models/user/user.model";
import ApiResponse from "../utils/ApiResponse";
import logger from "../utils/logger";
import { createAdminSchema } from "../ZodSchema/userSchema";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { IUser } from "../types/databaseSchema.types";

/**
 * Get all students sorted by creation date in descending order
 */

const getAllStudents = asyncHandler(
  async (req: AuthenticatedRequest, res: express.Response) => {
    // Check if the user is an admin
    if (req.user?.role !== "admin") {
      logger.warn("Unauthorized access attempt to admin endpoint", {
        userId: req.user?.id,
      });
      throw new ApiError(403, "Unauthorized: Admin access required");
    }

    // Get pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter: any = { role: "student" };

    if (req.query.city) {
      filter.city = req.query.city;
    }

    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate) {
        filter.createdAt.$gte = new Date(req.query.startDate as string);
      }
      if (req.query.endDate) {
        filter.createdAt.$lte = new Date(req.query.endDate as string);
      }
    }

    if (req.query.search) {
      filter.fullName = { $regex: req.query.search, $options: "i" };
    }

    // Get total count for pagination
    const totalStudents = await User.countDocuments(filter);

    // Get students sorted by creation date in descending order
    let students = await User.find(filter)
      .select("-password -refreshToken")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    logger.info("Admin retrieved student list", {
      adminId: req.user?.id,
      count: students.length,
    });
    
    res.status(200).json(
      new ApiResponse(
        200,
        {
          students,
          pagination: {
            total: totalStudents,
            page,
            limit,
            pages: Math.ceil(totalStudents / limit),
          },
        },
        "Students retrieved successfully"
      )
    );
  });

/**
 * Create a new admin user
 */
const createAdmin = asyncHandler(
  async (req: AuthenticatedRequest, res: express.Response) => {
    // Only super admins can create other admins
    if (req.user?.role !== "admin") {
      logger.warn("Unauthorized attempt to create admin", {
        userId: req.user?.id,
      });
      throw new ApiError(403, "Unauthorized: Admin access required");
    }

    const parsed = createAdminSchema.safeParse(req.body);
    if (!parsed.success) {
      logger.warn("Validation errors during admin creation", {
        error: parsed.error,
      });
      throw new ApiError(400, "Invalid input", [parsed.error]);
    }

    const { fullName, email, password } = parsed.data;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      logger.warn("Admin with email already exists", { email });
      throw new ApiError(409, "User with this email already exists");
    }

    // Generate a unique URN for admin (using timestamp)
    const urn = parseInt(`99${Date.now().toString().slice(-8)}`);

    // Create the new admin
    const newAdmin = await User.create({
      fullName,
      email,
      password,
      urn,
      role: "admin",
    });

    const createdAdmin = await User.findById(newAdmin._id).select(
      "-password -refreshToken"
    );

    logger.info("New admin created", {
      createdBy: req.user?.id,
      newAdminId: newAdmin._id,
    });

    res
      .status(201)
      .json(
        new ApiResponse(
          201,
          { admin: createdAdmin },
          "Admin created successfully"
        )
      );
  }
);

/**
 * Get details of a specific student
 */
const getStudentDetails = asyncHandler(
  async (req: AuthenticatedRequest, res: express.Response) => {
    // Check if the user is an admin
    if (req.user?.role !== "admin") {
      logger.warn("Unauthorized access attempt to admin endpoint", {
        userId: req.user?.id,
      });
      throw new ApiError(403, "Unauthorized: Admin access required");
    }

    const { studentId } = req.params;

    const student = await User.findById(studentId).select(
      "-password -refreshToken"
    );

    if (!student) {
      logger.warn("Student not found", { studentId });
      throw new ApiError(404, "Student not found");
    }

    if (student.role !== "student") {
      logger.warn("Requested ID is not a student", { studentId });
      throw new ApiError(400, "Requested ID is not a student");
    }

    logger.info("Admin retrieved student details", {
      adminId: req.user?.id,
      studentId,
    });

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { student },
          "Student details retrieved successfully"
        )
      );
  }
);

export { getAllStudents, createAdmin, getStudentDetails };
