import asyncHandler from "../utils/asyncHandler.ts";
import express from "express";
import { ApiError } from "../utils/ApiError.ts";
import { AuthenticatedRequest } from "./auth.middleware.ts";
import logger from "../utils/logger.ts";

export const adminMiddleware = asyncHandler(
  async (
    req: AuthenticatedRequest,
    _: express.Response,
    next: express.NextFunction
  ) => {
    try {
      // Check if user exists and is authenticated
      if (!req.user) {
        throw new ApiError(401, "Unauthorized access");
      }

      // Check if user is an admin
      if (req.user.role !== "admin") {
        logger.warn("Non-admin user attempted to access admin route", {
          userId: req.user.id,
          role: req.user.role,
        });
        throw new ApiError(403, "Forbidden: Admin access required");
      }

      next();
    } catch (err) {
      logger.error("Error in adminMiddleware:", err);
      if (err instanceof ApiError) {
        throw err;
      }
      throw new ApiError(500, "Internal server error");
    }
  }
);