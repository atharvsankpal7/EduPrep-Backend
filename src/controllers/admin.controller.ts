import express from "express";
import asyncHandler from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import ApiResponse from "../utils/ApiResponse";
import logger from "../utils/logger";
import { createAdminSchema } from "../ZodSchema/userSchema";
import {
  countStudents,
  createUser,
  findStudentById,
  findUserByEmail,
  findUserById,
  findUserByIdPublic,
  listStudents,
} from "../db/helpers/user.helpers";

/**
 * Get all students sorted by creation date in descending order
 */

const getAllStudents = asyncHandler(
  async (req: express.Request, res: express.Response) => {
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

    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : undefined;
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : undefined;

    if (startDate && Number.isNaN(startDate.getTime())) {
      throw new ApiError(400, "Invalid startDate");
    }
    if (endDate && Number.isNaN(endDate.getTime())) {
      throw new ApiError(400, "Invalid endDate");
    }

    const filters = {
      search: req.query.search ? String(req.query.search) : undefined,
      startDate,
      endDate,
    };

    // Get total count for pagination
    const totalStudents = await countStudents(filters);

    // Get students sorted by creation date in descending order
    const students = await listStudents(filters, limit, skip);

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
  async (req: express.Request, res: express.Response) => {
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
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      logger.warn("Admin with email already exists", { email });
      throw new ApiError(409, "User with this email already exists");
    }

    // Create the new admin
    const newAdmin = await createUser({
      fullName,
      email: email.toLowerCase(),
      password,
      role: "admin",
    });

    const createdAdmin = await findUserByIdPublic(newAdmin.id);
    if (!createdAdmin) {
      logger.error("Failed to retrieve created admin", { adminId: newAdmin.id });
      throw new ApiError(500, "Something went wrong");
    }

    logger.info("New admin created", {
      createdBy: req.user?.id,
      newAdminId: newAdmin.id,
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
  async (req: express.Request, res: express.Response) => {
    // Check if the user is an admin
    if (req.user?.role !== "admin") {
      logger.warn("Unauthorized access attempt to admin endpoint", {
        userId: req.user?.id,
      });
      throw new ApiError(403, "Unauthorized: Admin access required");
    }

    const { studentId } = req.params;
    const studentIdNumber = Number(studentId);
    if (Number.isNaN(studentIdNumber)) {
      throw new ApiError(400, "Invalid studentId");
    }

    const existingUser = await findUserById(studentIdNumber);
    if (!existingUser) {
      logger.warn("Student not found", { studentId });
      throw new ApiError(404, "Student not found");
    }

    if (existingUser.role !== "student") {
      logger.warn("Requested ID is not a student", { studentId });
      throw new ApiError(400, "Requested ID is not a student");
    }
    const student = await findStudentById(studentIdNumber);
    if (!student) {
      logger.warn("Student not found", { studentId });
      throw new ApiError(404, "Student not found");
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
