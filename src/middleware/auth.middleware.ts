import asyncHandler from "../utils/asyncHandler";
import express from "express";
import { ApiError } from "../utils/ApiError";
import { getActiveSessionWithUser, touchSession } from "../db/helpers/session.helpers";

export const authMiddleware = asyncHandler(
  async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): Promise<void> => {
    const sessionId = req.cookies?.sessionId;
    if (!sessionId) {
      throw new ApiError(401, "Unauthorized access - No session provided");
    }

    const session = await getActiveSessionWithUser(sessionId);
    if (!session) {
      throw new ApiError(401, "Invalid or expired session");
    }

    await touchSession(sessionId);

    req.loggedInUser = {
      id: session.userId,
      email: session.email,
      fullName: session.fullName,
      role: session.role,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
    return next();
  }
);
