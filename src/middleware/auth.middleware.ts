import asyncHandler from "../utils/asyncHandler";
import express from "express";
import { ApiError } from "../utils/ApiError";
import jwt from "jsonwebtoken";
import { User } from "../models/user/user.model";
import { Document } from "mongoose";
import { IUser } from "../types/databaseSchema.types";
import logger from "../utils/logger";
import generateAccessAndRefreshToken from "../utils/tokenGenerator";
import { accessTokenCookieOptions, refreshTokenCookieOptions } from "../controllers/student.controller";

// Extend express.Request to include user with User type
export interface AuthenticatedRequest extends express.Request {
  user?: Document<unknown, {}, IUser> & IUser;
}

export const authMiddleware = asyncHandler(
  async (
    req: AuthenticatedRequest,
    res: express.Response,
    next: express.NextFunction
  ): Promise<void> => {
    try {
      const accessToken =
        req.cookies?.accessToken ||
        req.header("Authorization")?.replace("Bearer ", "");
      const refreshToken = req.cookies?.refreshToken;

      if (!accessToken && !refreshToken) {
        throw new ApiError(401, "Unauthorized access - No tokens provided");
      }

      let user;

      // Try to verify access token first
      if (accessToken) {
        try {
          const decoded = jwt.verify(
            accessToken,
            process.env.ACCESS_TOKEN_SECRET!
          );
          if (typeof decoded === "string") {
            throw new ApiError(401, "Invalid access token");
          }

          user = await User.findById(decoded._id).select("-password");
          if (!user) {
            throw new ApiError(401, "Invalid access token - User not found");
          }

          req.user = user;
          return next();
        } catch (error) {
          // If access token verification fails, continue to refresh token logic
          if (!(error instanceof jwt.TokenExpiredError)) {
            throw error;
          }
        }
      }

      // If we reach here, either there was no access token or it was expired
      if (!refreshToken) {
        throw new ApiError(
          401,
          "Access token expired and no refresh token provided"
        );
      }

      // Verify refresh token
      try {
        const decoded = jwt.verify(
          refreshToken,
          process.env.REFRESH_TOKEN_SECRET!
        );
        if (typeof decoded === "string") {
          throw new ApiError(401, "Invalid refresh token");
        }

        user = await User.findById(decoded._id).select("-password");
        if (!user) {
          throw new ApiError(401, "Invalid refresh token - User not found");
        }

        // Verify that the refresh token matches what's stored
        if (user.refreshToken !== refreshToken) {
          throw new ApiError(401, "Invalid refresh token - Token mismatch");
        }

        // Generate new tokens
        const { accessToken: newAccessToken, user:updatedUser } =
          await generateAccessAndRefreshToken(user._id);
        user = updatedUser;
        // Set the new access token in cookie
        res.cookie("accessToken", newAccessToken, accessTokenCookieOptions);
        res.cookie("refreshToken", user.refreshToken, refreshTokenCookieOptions
            );
        // Set user in request and continue
        req.user = user;
        return next();
      } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
          throw new ApiError(401, "Refresh token expired - Please login again");
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
  }
);
