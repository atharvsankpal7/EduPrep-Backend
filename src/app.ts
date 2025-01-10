import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
// route import
import userRouter from "./router/user.routes.ts";
import testRouter from "./router/test.routes";
import { ApiError } from "./utils/ApiError";
import rateLimiter from "./utils/raterLimiter.ts";
import questionRouter from "./router/question.routes.ts";

const app = express();

// Updated CORS configuration with more permissive settings
app.use(
    cors({
        origin: process.env.FRONTEND_ORIGIN || "http://localhost:3000",
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
        exposedHeaders: ["set-cookie"]
    })
);

// Enable pre-flight requests for all routes
app.options('*', cors());

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

app.use(rateLimiter);
app.use("/api/v1/user", userRouter);
app.use("/api/v1/test", testRouter);
app.use("/api/v1/question", questionRouter);

app.use('/*', (req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found on the server",
    });
});

app.use((err: ApiError, req: express.Request, res: express.Response) => {
    const statusCode = err?.statusCode || 500;
    const message = err?.message || "Internal Server Error";
    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
    });
});

export { app };