import { app } from "./app";
import type { Server } from "http";
import dotenv from "dotenv";
import connectToPostgres, { closeDatabase } from "./db";
import logger from "./utils/logger";

dotenv.config({
  path: "./.env",
});
const port = Number(process.env.PORT || 5000);
const shutdownTimeoutMs = Number(process.env.SHUTDOWN_TIMEOUT_MS || 10000);

let server: Server;
let isShuttingDown = false;

const normalizeError = (error: unknown): Error => {
  return error instanceof Error ? error : new Error(String(error));
};

const logError = (label: string, error: Error) => {
  logger.error(label, { message: error.message, stack: error.stack });
};

const closeHttpServer = async (): Promise<void> => {
  if (!server || !server.listening) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  logger.info("HTTP server closed");
};

const gracefulShutdown = async (trigger: string, initialExitCode = 0): Promise<void> => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  let exitCode = initialExitCode;

  logger.info(`Received ${trigger}. Starting graceful shutdown`);

  const forceShutdownTimer = setTimeout(() => {
    logger.error(`Graceful shutdown timed out after ${shutdownTimeoutMs}ms. Forcing process exit.`);
    process.exit(1);
  }, shutdownTimeoutMs);
  forceShutdownTimer.unref();

  try {
    await closeHttpServer();
  } catch (error) {
    logError("Error while closing HTTP server", normalizeError(error));
    exitCode = 1;
  }

  try {
    await closeDatabase();
  } catch (error) {
    logError("Error while closing database pool", normalizeError(error));
    exitCode = 1;
  }

  clearTimeout(forceShutdownTimer);
  process.exit(exitCode);
};

process.on("uncaughtException", (error: Error) => {
  logError("Uncaught exception", error);
  void gracefulShutdown("uncaughtException", 1);
});

process.on("unhandledRejection", (reason: unknown) => {
  logError("Unhandled rejection", normalizeError(reason));
  void gracefulShutdown("unhandledRejection", 1);
});

process.on("SIGINT", () => {
  void gracefulShutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void gracefulShutdown("SIGTERM");
});

server = app.listen(port, () => {
  logger.info(`Server is running on port: ${port}`);
});

server.on("error", (error) => {
  logError("HTTP server error", normalizeError(error));
  void gracefulShutdown("server error", 1);
});

const initializeDatabase = async () => {
  try {
    await connectToPostgres();
    logger.info("PostgreSQL is connected");
  } catch (error) {
    logError(
      "Initial PostgreSQL connection failed. Server remains running and DB errors will continue to be logged",
      normalizeError(error)
    );
  }
};

void initializeDatabase();
