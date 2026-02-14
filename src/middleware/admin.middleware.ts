import express from "express";
import { ApiError } from "../utils/ApiError";
import logger from "../utils/logger";

export const adminMiddleware = async (
  req: express.Request,
  _: express.Response,
  next: express.NextFunction
) => {
  // Check if user exists and is authenticated
  if (!req.loggedInUser) {
    throw new ApiError(401, "Unauthorized access");
  }

  // Check if user is an admin
  if (req.loggedInUser.role !== "admin") {
    logger.warn("Non-admin user attempted to access admin route", {
      userId: req.loggedInUser.id,
      role: req.loggedInUser.role,
    });
    throw new ApiError(403, "Forbidden: Admin access required");
  }

  next();
};
