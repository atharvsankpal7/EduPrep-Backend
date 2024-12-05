import express from "express";
import asyncHandler from "../utils/asyncHandler";
import {ApiError} from "../utils/ApiError";
import {User} from "../models/student.model";
import {z} from "zod";
import ApiResponse from "../utils/ApiResponse";
import logger from "../utils/logger";

// Zod schema for student registration
const studentSchema = z.object({
    fullName: z.string().min(1, "Full name is required"),
    urn: z.number().min(8, "Enter valid URN"),
    email: z.string().email("Invalid email format"),
    password: z.string()
        .min(8, "Password must be at least 8 characters long")
        .max(64, "Password length should be less than 64"),
});

const generateAccessAndRefreshToken = async (userId: unknown) => {
    try {
        let user = await User.findById(userId).select("-password -refreshToken");
        if (!user) {
            throw new ApiError(404, "Invalid user id!");
        }

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        if (!accessToken || !refreshToken) {
            throw new ApiError(500, "Error generating tokens");
        }

        user.refreshToken = refreshToken;
        user = await user.save({validateBeforeSave: false});

        return {user, accessToken};
    } catch (err: unknown) {
        if (err instanceof ApiError) {
            throw err;
        }
        if (err instanceof Error) {
            logger.error(`Error generating tokens: ${err.message}`, {stack: err.stack, userId});
        }
        throw new ApiError(500, "Internal server error");
    }
};


// Cookie options
const cookieOptions = {
    httpOnly: true,
    secure: true, // Ensure this is true in production
    sameSite: "strict" as const,
};

/**
 * Register a new student
 */
const registerStudent = asyncHandler(async (req: express.Request, res: express.Response) => {
    const parsed = studentSchema.safeParse(req.body);

    if (!parsed.success) {
        const errors = parsed.error.errors.map((err) => err.message);
        logger.warn("Validation errors during registration", {errors});
        throw new ApiError(400, "Invalid input", errors);
    }

    const {fullName, urn, email, password} = parsed.data;

    // Check if user already exists
    const existingUser = await User.findOne({
        $or: [{email}, {urn}],
    });

    if (existingUser) {
        logger.warn("User with email or URN already exists", {email, urn});
        throw new ApiError(409, "User with this email or URN already exists");
    }

    // Create the new user
    const newUser = await User.create({
        fullName,
        urn,
        email,
        password,
    });

    const registeredUser = await User.findById(newUser._id).select("-password -refreshToken");

    if (!registeredUser) {
        logger.error("Failed to retrieve registered user from database", {userId: newUser._id});
        throw new ApiError(500, "Something went wrong");
    }

    logger.info("User registered successfully", {userId: newUser._id});
    res.status(201).json(new ApiResponse(201, registeredUser, "User registered successfully"));
});

/**
 * Log in a student
 */
const loginStudent = asyncHandler(async (req: express.Request, res: express.Response) => {
    const {email, urn, password} = req.body;

    const existingUser = await User.findOne({$or: [{email}, {urn}]});

    if (!existingUser) {
        logger.warn("User not found during login", {email, urn});
        throw new ApiError(404, "User not found");
    }

    const isPasswordCorrect = await existingUser.isPasswordCorrect(password);

    if (!isPasswordCorrect) {
        logger.warn("Incorrect password during login", {userId: existingUser._id});
        throw new ApiError(401, "Wrong password");
    }

    const {accessToken, user} = await generateAccessAndRefreshToken(existingUser._id);

    logger.info("User logged in successfully", {userId: existingUser._id});

    res.status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", user.refreshToken, cookieOptions)
        .json(new ApiResponse(200, {user, accessToken}, "User logged in successfully"));
});

/**
 * Log out a user
 */
const logoutUser = asyncHandler(async (req: express.Request, res: express.Response) => {
    const userId = req.body._id;

    // Clear the refreshToken in the database
    const updatedUser = await User.findByIdAndUpdate(userId, {
        $unset: {refreshToken: 1},
    });

    if (!updatedUser) {
        logger.error("Failed to log out user: User not found", {userId});
        throw new ApiError(404, "User not found");
    }

    logger.info("User logged out successfully", {userId});

    res.status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(new ApiResponse(200, {}, "User logged out successfully"));
});

export {registerStudent, loginStudent, logoutUser};
