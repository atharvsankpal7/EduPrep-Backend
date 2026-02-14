import express from "express";
import { ApiError } from "../utils/ApiError";
import { getActiveSessionWithUser, touchSession } from "../db/helpers/session.helpers";

export const authMiddleware = async (
  req: express.Request,
  _res: express.Response,
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
  next();
};
