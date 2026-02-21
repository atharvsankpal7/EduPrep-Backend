import morgan from "morgan";
import type { Request } from "express";
import logger from "./logger";

const isProduction = process.env.NODE_ENV === "production";

const getIpFormat = () => (isProduction ? ":remote-addr - " : "");
const successResponseFormat = `${getIpFormat()}:method :userInfo :url :status - :response-time ms`;
const errorResponseFormat = `${getIpFormat()}:method :userInfo :url :status - :response-time ms`;

morgan.token("userInfo", (req) => {
  const request = req as Request;
  if (request.loggedInUser?.id) {
    return `User ${request.loggedInUser.id}`;
  }
  return "noAuth";
});

export const morganSuccessHandler = morgan(successResponseFormat, {
  skip: (_req, res) => res.statusCode >= 400,
  stream: { write: (message) => logger.info(message.trim()) },
});

export const morganErrorHandler = morgan(errorResponseFormat, {
  skip: (_req, res) => res.statusCode < 400,
  stream: { write: (message) => logger.error(message.trim()) },
});
