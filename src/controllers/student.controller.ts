import express from "express";
import asyncHandler from "../utils/asyncHandler";
import {ApiError} from "../utils/ApiError";
import {User} from "../models/user/user.model";
import ApiResponse from "../utils/ApiResponse";
import logger from "../utils/logger";
import {userLoginSchema, userRegistrationSchema} from "../ZodSchema/userSchema.ts";
import generateAccessAndRefreshToken from "../utils/tokenGenerator.ts";


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
    // Convert urn to number before validation
    if (req.body.urn) {
        const urn = Number(req.body.urn);
        if (isNaN(urn)) {
            logger.warn("Invalid URN format", {urn: req.body.urn});
            throw new ApiError(400, "Invalid URN format");
        }
        req.body.urn = urn;
    } 

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
const loginUser = asyncHandler(async (req: express.Request, res: express.Response) => {
    // Convert urn to number before validation, ensuring it's valid
    if (req.body.urn) {
        const urn = Number(req.body.urn);
        if (isNaN(urn)) {
            logger.warn("Invalid URN format", {urn: req.body.urn});
            throw new ApiError(400, "Invalid URN format");
        }
        req.body.urn = urn;
    }

    console.log(req.body);

    // Validate request body using schema
    const parsed = userLoginSchema.safeParse(req.body);
    if (!parsed.success) {
        const errors = parsed.error.errors.map((err) => err.message);
        logger.warn("Validation errors during login", {errors});
        throw new ApiError(400, "Invalid input", errors);
    }

    const {urn, email, password} = parsed.data;

    // Find the existing user by either email or urn
    let existingUser;
    if (email) {
        existingUser = await User.findOne({email});
    }
    if (urn) {
        existingUser = await User.findOne({urn});
    }


    if (!existingUser) {
        logger.warn(`User not found during login for email: ${email} or urn: ${urn}`);
        throw new ApiError(404, "User not found");
    }

    // Check if password is correct
    const isPasswordCorrect = await existingUser.isPasswordCorrect(password);
    console.log(existingUser);
    if (!isPasswordCorrect) {
        logger.warn("Incorrect password during login", {userId: existingUser._id});
        throw new ApiError(401, "Wrong password");
    }

    // Generate access and refresh tokens
    const {accessToken, user} = await generateAccessAndRefreshToken(existingUser._id);

    logger.info("User logged in successfully", {userId: existingUser._id});

    // Respond with success, setting cookies for tokens
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


export {registerStudent, loginUser, logoutUser};