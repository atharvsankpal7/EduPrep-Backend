import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
const app = express();

// middlewares before handling the router
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN,
    // The 'credentials' option allows the server to set cookies
    // and send credentials (like HTTP authentication) in cross-origin requests.
    // When set to true, it enables the 'Access-Control-Allow-Credentials' CORS header.
    credentials: true,
  })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// route import
import userRouter from "./router/student.routes.ts"
import {ApiError} from "./utils/ApiError.ts";

// route declarations
app.use("/api/v1/student", userRouter)
app.use("/api/v1/test")

// global error handler
app.use((err: ApiError , req: express.Request, res: express.Response, next: express.NextFunction) => {
    const statusCode = err?.statusCode || 500;
    const message = err?.message || "Internal Server Error";

    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV !== "production" && { stack: err.stack }), // Include stack trace in development
    });

    next(); // Optionally, if you want further middlewares to act
});


export { app };
