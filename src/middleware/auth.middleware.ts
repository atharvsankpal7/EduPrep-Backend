import asyncHandler from "../utils/asyncHandler.ts";
import express from "express";
import {ApiError} from "../utils/ApiError.ts";
import jwt from "jsonwebtoken";
import {User} from "../models/user/user.model";
import {Document} from "mongoose";
import {IUser} from "../types/databaseSchema.types.ts";
import logger from "../utils/logger.ts";

// Extend express.Request to include user with User type
export interface AuthenticatedRequest extends express.Request {
    user?: Document<unknown, {}, IUser> & IUser;
}

export const authMiddleware = asyncHandler(
    async (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction): Promise<void> => {
        try {
            const token =
                req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
            
            if (!token) {
                throw new ApiError(401, "Unauthorized access");
            }

            try {
                const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!);
                if (typeof decoded === "string") {
                    throw new ApiError(401, "Invalid token");
                }

                const user = await User.findById(decoded._id).select("-password -refreshToken");
                if (!user) {
                    throw new ApiError(401, "Invalid token");
                }

                req.user = user;
                next();
            } catch (error) {
                // If token verification fails, check if it's due to expiration
                if (error instanceof jwt.TokenExpiredError) {
                    // Redirect to refresh token endpoint
                    res.status(401).json(
                        new ApiError(401, "Access token expired")
                    );
                    return;
                }
                throw error;
            }
        } catch (err) {
            logger.error("Error in authMiddleware:", err);
            if (err instanceof ApiError) {
                throw err;
            }
            throw new ApiError(401, "Unauthorized access");
        }
    });