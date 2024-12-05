import asyncHandler from "../utils/asyncHandler.ts";
import express from "express";
import {ApiError} from "../utils/ApiError.ts";
import jwt from "jsonwebtoken";
import {User} from "../models/student.model.ts";


// Extend express.Request to include user
interface Request extends express.Request {
    user?: any;
}



export const verifyToken = asyncHandler(
    async (req: Request, _: express.Response, next: express.NextFunction) => {
        try {
            const token =
                req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
            if (!token) {
                throw new ApiError(401, "Unauthorized access");
            }

            const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!);
            if (typeof decoded === "string") {
                throw new ApiError(401, "Unauthorized access");
            }
            const user = await User.findById(decoded._id).select("-password -refreshToken");

            if (!user) {
                throw new ApiError(401, "Invalid token");
            }

            // Attach the user to the request
            req.user = user;
            next();
        } catch (err) {
            if (err instanceof ApiError) {
                throw err;
            }
            throw new ApiError(401, "Unauthorized access");
        }
    }
);
