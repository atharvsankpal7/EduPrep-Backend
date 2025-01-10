import express from "express";
import asyncHandler from "../utils/asyncHandler";
import {ApiError} from "../utils/ApiError";
import {User} from "../models/user/user.model";
import ApiResponse from "../utils/ApiResponse";
import logger from "../utils/logger";
import {userLoginSchema, userRegistrationSchema} from "../ZodSchema/userSchema.ts";
import generateAccessAndRefreshToken from "../utils/tokenGenerator.ts";

// Updated cookie options with more permissive settings for development
const cookieOptions = {
    httpOnly: true,
    secure: false, // Set to false for development
    // sameSite: "none" as const,
    // domain: process.env.COOKIE_DOMAIN || undefined, // Allow configuration via env
    // path: "/",
    // maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

const registerStudent = asyncHandler(async (req: express.Request, res: express.Response) => {
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

    const existingUser = await User.findOne({
        $or: [{email}, {urn}],
    });

    if (existingUser) {
        logger.warn("User with email or URN already exists", {email, urn});
        throw new ApiError(409, "User with this email or URN already exists");
    }

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

const loginUser = asyncHandler(async (req: express.Request, res: express.Response) => {
    if (req.body.urn) {
        const urn = Number(req.body.urn);
        if (isNaN(urn)) {
            logger.warn("Invalid URN format", {urn: req.body.urn});
            throw new ApiError(400, "Invalid URN format");
        }
        req.body.urn = urn;
    }

    const parsed = userLoginSchema.safeParse(req.body);
    if (!parsed.success) {
        const errors = parsed.error.errors.map((err) => err.message);
        logger.warn("Validation errors during login", {errors});
        throw new ApiError(400, "Invalid input", errors);
    }

    const {urn, email, password} = parsed.data;

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

    const isPasswordCorrect = await existingUser.isPasswordCorrect(password);
    if (!isPasswordCorrect) {
        logger.warn("Incorrect password during login", {userId: existingUser._id});
        throw new ApiError(401, "Wrong password");
    }

    const {accessToken, user} = await generateAccessAndRefreshToken(existingUser._id);
    res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", existingUser.refreshToken, cookieOptions)
        .json(
        new ApiResponse(
            200,
            {
                user: {
                    _id: user._id,
                    email: user.email,
                    fullName: user.fullName,
                    urn: user.urn,
                    role: user.role
                },
                accessToken
            },
            "User logged in successfully"
        )
    );
});

const logoutUser = asyncHandler(async (req: express.Request, res: express.Response) => {
    const userId = req.body._id;

    const updatedUser = await User.findByIdAndUpdate(userId, {
        $unset: {refreshToken: 1},
    });

    if (!updatedUser) {
        logger.error("Failed to log out user: User not found", {userId});
        throw new ApiError(404, "User not found");
    }

    logger.info("User logged out successfully", {userId});

    // Clear cookies with updated options
    res.cookie("accessToken", "", {
        ...cookieOptions,
        maxAge: 0,
    });

    res.cookie("refreshToken", "", {
        ...cookieOptions,
        maxAge: 0,
    });

    res.status(200).json(new ApiResponse(200, {}, "User logged out successfully"));
});

export {registerStudent, loginUser, logoutUser};