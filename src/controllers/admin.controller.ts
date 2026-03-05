import express from "express";
import { ApiError } from "../utils/ApiError";
import ApiResponse from "../utils/ApiResponse";
import logger from "../utils/logger";
import { createAdminSchema, studentIdParamsSchema } from "../ZodSchema/userSchema";
import { validateType } from "../utils/zodValidator";
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

const getAllStudents = async (req: express.Request, res: express.Response) => {
    // Get pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    // Security Fix: Prevent DoS by capping the maximum limit per page
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
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

    // Optimize: Fetch total count and paginated students concurrently to reduce database wait time
    const [totalStudents, students] = await Promise.all([
      countStudents(filters),
      listStudents(filters, limit, skip)
    ]);

    logger.info("Admin retrieved student list", {
      adminId: req.loggedInUser.id,
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
};

/**
 * Create a new admin user
 */
const createAdmin = async (req: express.Request, res: express.Response) => {
    const { fullName, email, password } = validateType(createAdminSchema, req.body);

    // Check if user already exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      logger.warn("Admin with email already exists");
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
      createdBy: req.loggedInUser.id,
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
};

/**
 * Get details of a specific student
 */
const getStudentDetails = async (req: express.Request, res: express.Response) => {
    const { studentId: studentIdNumber } = validateType(studentIdParamsSchema, req.params);

    const existingUser = await findUserById(studentIdNumber);
    if (!existingUser) {
      logger.warn("Student not found", { studentId: studentIdNumber });
      throw new ApiError(404, "Student not found");
    }

    if (existingUser.role !== "student") {
      logger.warn("Requested ID is not a student", { studentId: studentIdNumber });
      throw new ApiError(400, "Requested ID is not a student");
    }
    const student = await findStudentById(studentIdNumber);
    if (!student) {
      logger.warn("Student not found", { studentId: studentIdNumber });
      throw new ApiError(404, "Student not found");
    }

    logger.info("Admin retrieved student details", {
      adminId: req.loggedInUser.id,
      studentId: studentIdNumber,
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
};

export { getAllStudents, createAdmin, getStudentDetails };
