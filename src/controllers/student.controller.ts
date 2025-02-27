import express from "express";
import asyncHandler from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { User } from "../models/user/user.model";
import ApiResponse from "../utils/ApiResponse";
import logger from "../utils/logger";
import {
  userLoginSchema,
  userRegistrationSchema,
} from "../ZodSchema/userSchema.ts";
import generateAccessAndRefreshToken from "../utils/tokenGenerator.ts";
import { AuthenticatedRequest } from "../middleware/auth.middleware.ts";

// Cookie options
const accessTokenCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  maxAge: 15 * 60 * 1000, // 15 minutes
  path: "/",
};
const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/",
};

/**
 * Register a new student
 */
const registerStudent = asyncHandler(
  async (req: express.Request, res: express.Response) => {
    // Convert urn to number before validation
    if (req.body.urn) {
      const urn = Number(req.body.urn);
      if (isNaN(urn)) {
        logger.warn("Invalid URN format", { urn: req.body.urn });
        throw new ApiError(400, "Invalid URN format");
      }
      req.body.urn = urn;
    }
    console.log(req.body);
    const parsed = userRegistrationSchema.safeParse(req.body);
    if (!parsed.success) {
      logger.warn("Validation errors during registration", { error: parsed.error });
      throw new ApiError(400, "Invalid input", [parsed.error]);
    }

    const { fullName, urn, email, password } = parsed.data;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { urn }],
    });

    if (existingUser) {
      logger.warn("User with email or URN already exists", { email, urn });
      throw new ApiError(409, "User with this email or URN already exists");
    }

    // Create the new user
    const newUser = await User.create({
      fullName,
      urn,
      email,
      password,
    });

    const registeredUser = await User.findById(newUser._id).select("-password");
    if (!registeredUser) {
      logger.error("Failed to retrieve registered user from database", {
        userId: newUser._id,
      });
      throw new ApiError(500, "Something went wrong");
    }
    // Generate tokens
    const { accessToken, user } = await generateAccessAndRefreshToken(
      newUser._id
    );

    logger.info("User registered successfully", { userId: newUser._id });
     res
      .status(201)
      .cookie("accessToken", accessToken, accessTokenCookieOptions)
      .cookie("refreshToken", user.refreshToken, refreshTokenCookieOptions)
      .json(
        new ApiResponse(
          201,
          { user:registeredUser },
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
    // Convert urn to number before validation, ensuring it's valid
    if (req.body.urn) {
      const urn = Number(req.body.urn);
      if (isNaN(urn)) {
        logger.warn("Invalid URN format", { urn: req.body.urn });
        throw new ApiError(400, "Invalid URN format");
      }
      req.body.urn = urn;
    }

    // Validate request body using schema
    const parsed = userLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.errors.map((err) => err.message);
      logger.warn("Validation errors during login", { errors });
      throw new ApiError(400, "Invalid input", errors);
    }

    const { urn, email, password } = parsed.data;

    // Find the existing user by either email or urn
    let existingUser;
    if (email) {
      existingUser = await User.findOne({ email });
    }
    if (urn) {
      existingUser = await User.findOne({ urn });
    }

    if (!existingUser) {
      logger.warn(
        `User not found during login for email: ${email} or urn: ${urn}`
      );
      throw new ApiError(404, "User not found");
    }

    // Check if password is correct
    const isPasswordCorrect = await existingUser.isPasswordCorrect(password);
    if (!isPasswordCorrect) {
      logger.warn("Incorrect password during login", {
        userId: existingUser._id,
      });
      throw new ApiError(401, "Wrong password");
    }

    // Generate access and refresh tokens
    const { accessToken, user } = await generateAccessAndRefreshToken(
      existingUser._id
    );

    logger.info("User logged in successfully", { userId: existingUser._id });

    // Respond with success, setting cookies for tokens
    res
      .status(200)
      .cookie("accessToken", accessToken, accessTokenCookieOptions)
      .cookie("refreshToken", user.refreshToken, refreshTokenCookieOptions)
      .json(
        new ApiResponse(
          200,
          { user },
          "User logged in successfully"
        )
      );
  }
);

/**
 * Log out a user
 */
const logoutUser = asyncHandler(
  async (req: AuthenticatedRequest, res: express.Response) => {
    const userId = req.user?.id;
    // Clear the refreshToken in the database
    const updatedUser = await User.findByIdAndUpdate(userId, {
      $unset: { refreshToken: 1 },
    });

    if (!updatedUser) {
      logger.error("Failed to log out user: User not found", { userId });
      throw new ApiError(404, "User not found");
    }

    logger.info("User logged out successfully", { userId });

    res
      .status(200)
      .clearCookie("accessToken", accessTokenCookieOptions)
      .clearCookie("refreshToken", refreshTokenCookieOptions)
      .json(new ApiResponse(200, {}, "User logged out successfully"));
  }
);

export { registerStudent, loginUser, logoutUser };
