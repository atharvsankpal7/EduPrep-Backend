import express from "express";
import asyncHandler from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import ApiResponse from "../utils/ApiResponse";
import logger from "../utils/logger";
import {
  userRegistrationSchema,
} from "../ZodSchema/userSchema";
import {
  clearUserRefreshToken,
  createUser,
  findUserByEmail,
  findUserByIdSecure,
  findUserByIdPublic,
} from "../db/helpers/user.helpers";
import { countActiveSessionsByUser, createSession, revokeSession } from "../db/helpers/session.helpers";
import { getMaxConcurrentSessions } from "../db/helpers/constants.helpers";

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
const registerStudent = asyncHandler(
  async (req: express.Request, res: express.Response) => {

    const parsed = userRegistrationSchema.safeParse(req.body);
    if (!parsed.success) {
      logger.warn("Validation errors during registration", {
        error: parsed.error,
      });
      throw new ApiError(400, "Invalid input", [parsed.error]);
    }

    const { fullName, email, password } = parsed.data;

    // Check if user already exists
    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      logger.warn("User with email already exists", { email });
      throw new ApiError(409, "User with this email  exists");
    }

    // Create the new user
    const newUser = await createUser({
      fullName,
      email: email.toLowerCase(),
      password,
    });

    const registeredUser = await findUserByIdPublic(newUser.id);

    if (!registeredUser) {
      logger.error("Failed to retrieve registered user from database", {
        userId: newUser.id,
      });
      throw new ApiError(500, "Something went wrong");
    }
    const maxSessions = await getMaxConcurrentSessions(1);
    const activeSessions = await countActiveSessionsByUser(newUser.id);
    if (activeSessions >= maxSessions) {
      throw new ApiError(403, "Concurrent session limit reached");
    }

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
  }
);

/**
 * Log in a student
 */
const loginUser = asyncHandler(
  async (req: express.Request, res: express.Response) => {
    const loggedInUser = req.loggedInUser;
    if (!loggedInUser) {
      throw new ApiError(401, "Unauthorized");
    }

    const maxSessions = await getMaxConcurrentSessions(1);
    const activeSessions = await countActiveSessionsByUser(loggedInUser.id);
    if (activeSessions >= maxSessions) {
      throw new ApiError(403, "Concurrent session limit reached");
    }

    const session = await createSession({
      userId: loggedInUser.id,
      userAgent: req.header("user-agent") || null,
      ipAddress: req.ip || null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const publicUser = await findUserByIdPublic(loggedInUser.id);
    logger.info("User logged in successfully", { userId: loggedInUser.id });

    // Respond with success, setting cookies for tokens
    res
      .status(200)
      .cookie("sessionId", session.id, sessionCookieOptions)
      .json(new ApiResponse(200, { user: publicUser }, "User logged in successfully"));
  }
);

/**
 * Log out a user
 */
const logoutUser = asyncHandler(
  async (req: express.Request, res: express.Response) => {
    const userId = req.loggedInUser.id;

    // Clear the refreshToken in the database
    const existingUser = await findUserByIdSecure(userId);
    if (!existingUser) {
      logger.error("Failed to log out user: User not found", { userId });
      throw new ApiError(404, "User not found");
    }

    await clearUserRefreshToken(userId);
    const sessionId = req.cookies?.sessionId;
    if (sessionId) {
      await revokeSession(sessionId);
    }

    logger.info("User logged out successfully", { userId });

    res
      .status(200)
      .clearCookie("sessionId")
      .json(new ApiResponse(200, {}, "User logged out successfully"));
  }
);

const getUser = asyncHandler(
  async (req: express.Request, res: express.Response) => {
    const userId = req.loggedInUser.id;
    if(!userId){
      throw new ApiError(401, "Unauthorized");
    }
    res.status(200).json(new ApiResponse(200, { user: req.loggedInUser }, "User fetched successfully"));
  }
);
export { registerStudent, loginUser, logoutUser, getUser };
