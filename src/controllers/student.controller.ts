import express from "express";
import asyncHandler from "../utils/asyncHandler";
import {ApiError} from "../utils/ApiError";
import {User} from "../models/user/user.model";
import ApiResponse from "../utils/ApiResponse";
import logger from "../utils/logger";
import {userRegistrationSchema} from "../ZodSchema/userSchema.ts";


const generateAccessAndRefreshToken = async (userId: unknown) => {

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
    const parsed = userRegistrationSchema.safeParse(req.body);

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
    const parsed = userRegistrationSchema.safeParse(req.body);
    if(!parsed.success){
        const errors = parsed.error.errors.map((err) => err.message);
        logger.warn("Validation errors during login", {errors});
        throw new ApiError(400, "Invalid input", errors);
    }
    const {urn, email, password} = parsed.data;

    const existingUser = await User.findOne({$or: [{email}, {urn}]});

    if (!existingUser) {
        logger.warn(`User not found during login email : ${email} or urn : ${urn}`);
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
