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

// middlewares before handling the router
app.use(
    cors({
        origin: "http://localhost:3000",
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public")); // public folder is available via URL without additional logic
app.use(cookieParser()); // parses cookies automatically and puts them in req.cookies

app.use(rateLimiter);
// route declarations
app.use("/api/v1/user", userRouter);
app.use("/api/v1/test", testRouter);
app.use("/api/v1/question", questionRouter);

app.use('/*', (req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found on the server",
    });
});

// global error handler
app.use((err: ApiError, req: express.Request, res: express.Response) => {
    const statusCode = err?.statusCode || 500;
    const message = err?.message || "Internal Server Error";
    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV !== "production" && { stack: err.stack }), // Include stack trace in development
    });
});

export { app };