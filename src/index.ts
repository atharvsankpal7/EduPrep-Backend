import { app } from "./app";
import dotenv from "dotenv";
import connectToPostgres from "./db";
import logger from "./utils/logger";

dotenv.config({
  path: "./.env",
});
const port = process.env.PORT || 5000;

process.on("uncaughtException", (error: Error) => {
  logger.error("Uncaught exception", { message: error.message, stack: error.stack });
  console.error("Uncaught exception:", error);
});

process.on("unhandledRejection", (reason: unknown) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  logger.error("Unhandled rejection", { message: error.message, stack: error.stack });
  console.error("Unhandled rejection:", error);
});

connectToPostgres()
  .then(() => {
    app.listen(port);
    console.log("Server is running on port: ", port);
    console.log("PostgreSQL is connected");
  })
  .catch((err: Error) => {
    logger.error("Error connecting to PostgreSQL", { message: err.message, stack: err.stack });
    console.error("Error connecting to PostgreSQL:", err);
  });
