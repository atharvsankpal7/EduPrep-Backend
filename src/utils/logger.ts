import { createLogger, format, transports } from "winston";
import path from "path";
import util from "util";

// Define custom logging formats
const { combine, timestamp, printf, colorize, errors } = format;

// Custom format for log messages
const customFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
    const content = stack || message;
    const metaKeys = Object.keys(meta);
    if (metaKeys.length === 0) {
        return `${timestamp} [${level}]: ${content}`;
    }

    const metaString = util.inspect(meta, { depth: null, colors: false, compact: true });
    return `${timestamp} [${level}]: ${content} ${metaString}`;
});

// Logger configuration
const logger = createLogger({
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
    format: combine(
        timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), // Add timestamps
        errors({ stack: true }), // Log error stack traces
        process.env.NODE_ENV === "production" ? customFormat : combine(colorize(), customFormat) // Colorize for dev
    ),
    transports: [
        // Log to console
        new transports.Console(),
        // Log to file (all logs)
        new transports.File({
            filename: path.join(__dirname, "../logs/app.log"),
            level: "info",
        }),
        // Log errors separately
        new transports.File({
            filename: path.join(__dirname, "../logs/errors.log"),
            level: "error",
        }),
    ],
    exceptionHandlers: [
        // Handle uncaught exceptions
        new transports.File({
            filename: path.join(__dirname, "../logs/exceptions.log"),
        }),
    ],
    rejectionHandlers: [
        // Handle unhandled promise rejections
        new transports.File({
            filename: path.join(__dirname, "../logs/rejections.log"),
        }),
    ],
});

export default logger;
