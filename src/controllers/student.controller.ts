import express from "express";
import { ApiError } from "../utils/ApiError";
import ApiResponse from "../utils/ApiResponse";
import logger from "../utils/logger";
import {
  userRegistrationSchema,
} from "../ZodSchema/userSchema";
import { validateType } from "../utils/zodValidator";
import {
  clearUserRefreshToken,
  createUser,
} from "../db/helpers/user.helpers";
import { createSession, revokeSession } from "../db/helpers/session.helpers";
import { haveMaxSessionReached } from "../db/helpers/constants.helpers";

// Cookie options
const sessionSameSite: "none" | "lax" =
  process.env.NODE_ENV === "production" ? "none" : "lax";

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: sessionSameSite,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/",
};

/**
 * Register a new student
 */
const registerStudent = async (req: express.Request, res: express.Response) => {
  const { fullName, email, password } = validateType(userRegistrationSchema, req.body);

  // Create the new user
  let newUser;
  try {
    newUser = await createUser({
      fullName,
      email: email.toLowerCase(),
      password,
    });
  } catch (error: any) {
    // 23505 is PostgreSQL error code for unique violation
    if (error.code === "23505") {
      logger.warn("Registration failed: user already exists");
      throw new ApiError(409, "User with this email already exists");
    }
    throw error;
  }

  // Performance Optimization: Map the created user object directly to avoid a redundant database query
  const registeredUser = {
    id: newUser.id,
    email: newUser.email,
    fullName: newUser.fullName,
    role: newUser.role,
    createdAt: newUser.createdAt,
    updatedAt: newUser.updatedAt,
  };

  // Performance Optimization: Removed haveMaxSessionReached check because a newly created user has 0 sessions.

  const session = await createSession({
    userId: newUser.id,
    userAgent: req.header("user-agent") || null,
    ipAddress: req.ip || null,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  logger.info("User registered successfully", { userId: newUser.id });
  res
    .status(201)
    .cookie("sessionId", session.id, sessionCookieOptions)
    .json(
      new ApiResponse(
        201,
        { user: registeredUser },
        "User registered successfully"
      )
    );
};

/**
 * Log in a student
 */
const loginUser = async (req: express.Request, res: express.Response) => {
  const loggedInUser = req.loggedInUser;
  if (!loggedInUser) {
    throw new ApiError(401, "Unauthorized");
  }

  const maxSessionReached = await haveMaxSessionReached(loggedInUser.id);

  if (maxSessionReached) {
    throw new ApiError(403, "Concurrent session limit reached");
  }

  const session = await createSession({
    userId: loggedInUser.id,
    userAgent: req.header("user-agent") || null,
    ipAddress: req.ip || null,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  // Performance Optimization: Use req.loggedInUser directly instead of fetching from DB again
  const publicUser = {
    id: loggedInUser.id,
    email: loggedInUser.email,
    fullName: loggedInUser.fullName,
    role: loggedInUser.role,
    createdAt: loggedInUser.createdAt,
    updatedAt: loggedInUser.updatedAt,
  };
  logger.info("User logged in successfully", { userId: loggedInUser.id });

  // Respond with success, setting cookies for tokens
  res
    .status(200)
    .cookie("sessionId", session.id, sessionCookieOptions)
    .json(new ApiResponse(200, { user: publicUser }, "User logged in successfully"));
};

/**
 * Log out a user
 */
const logoutUser = async (req: express.Request, res: express.Response) => {
  const userId = req.loggedInUser.id;

  // Performance Optimization: Removed redundant user existence check (already verified by auth middleware)
  // and parallelized the session/token clearing operations.
  const sessionId = req.cookies?.sessionId;
  const logoutTasks: Promise<void>[] = [clearUserRefreshToken(userId)];

  if (sessionId) {
    logoutTasks.push(revokeSession(sessionId));
  }

  await Promise.all(logoutTasks);

  logger.info("User logged out successfully", { userId });

  res
    .status(200)
    .clearCookie("sessionId")
    .json(new ApiResponse(200, {}, "User logged out successfully"));
};

const getUser = async (req: express.Request, res: express.Response) => {
  const userId = req.loggedInUser.id;
  if (!userId) {
    throw new ApiError(401, "Unauthorized");
  }
  res.status(200).json(new ApiResponse(200, { user: req.loggedInUser }, "User fetched successfully"));
};
export { registerStudent, loginUser, logoutUser, getUser };
