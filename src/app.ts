import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import csurf from "csurf";
import passport from "./utils/passport";
// route import
import userRouter from "./router/user.routes";
import testRouter from "./router/test.routes";
import { ApiError } from "./utils/ApiError";
import { globalLimiter } from "./utils/raterLimiter";
import questionRouter from "./router/question.routes";
import topicRouter from "./router/topic.routes";
import adminRouter from "./router/admin.routes";
import testHistoryRouter from "./router/testHistory.routes";
import logger from "./utils/logger";
import { morganErrorHandler, morganSuccessHandler } from "./utils/morgan";

const app = express();

// middlewares before handling the router
app.use(helmet());
app.use(
  cors({
    origin: ["https://edu-prep.vercel.app", "http://localhost:3000"],
    // origin: "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
  })
);
app.set("trust proxy", 1); // Enables trusting the first proxy
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public")); // public folder is available via URL without additional logic
app.use(cookieParser()); // parses cookies automatically and puts them in req.cookies

// CSRF Protection Middleware
const csrfProtection = csurf({ cookie: { httpOnly: true, secure: process.env.NODE_ENV === "production" } });
app.use(csrfProtection);

app.use(passport.initialize({ userProperty: "loggedInUser" }));

app.use(globalLimiter);
app.use(morganSuccessHandler);
app.use(morganErrorHandler);

// CSRF Token endpoint for frontend
app.get("/api/v1/csrf-token", (req, res) => {
  res.json({ success: true, csrfToken: req.csrfToken() });
});

// route declarations
app.use("/api/v1/user", userRouter);
app.use("/api/v1/test", testRouter);
app.use("/api/v1/question", questionRouter);
app.use("/api/v1/topic", topicRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/test-history", testHistoryRouter);

app.all(/.*/, (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found on the server",
  });
});

// global error handler
app.use(
  (
    err: unknown,
    req: express.Request,
    res: express.Response,
    _: express.NextFunction
  ) => {
    // Check for CSRF token error
    if (err && typeof err === "object" && "code" in err && (err as any).code === "EBADCSRFTOKEN") {
      res.status(403).json({
        success: false,
        message: "Invalid CSRF Token",
      });
      return;
    }

    const isApiError = err instanceof ApiError;
    const statusCode = isApiError ? err.statusCode : 500;
    const message = isApiError ? err.message : "Internal Server Error";
    const stack = err instanceof Error ? err.stack : undefined;

    logger.error("Unhandled request error", {
      method: req.method,
      path: req.originalUrl,
      statusCode,
      message: err instanceof Error ? err.message : message,
      stack,
    });

    res.status(statusCode).json({
      success: false,
      message,
      ...(process.env.NODE_ENV !== "production" && { stack }), // Include stack trace in development
    });
  }
);

export { app };
