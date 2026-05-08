import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import config from "./config";
import {
  globalErrorHandler,
  notFoundHandler,
} from "./middlewares/errorHandler";
import router from "./routes";

const app: Application = express();

app.use(helmet());

app.use(
  cors({
    origin: config.corsOrigin,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many login attempts, please try again after 15 minutes" },
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again after an hour" },
});

const refreshTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again after 15 minutes" },
});

const sendVerificationEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again after an hour" },
});

app.use("/api/v1/auth/login", loginLimiter);
app.use("/api/v1/auth/forgot-password", forgotPasswordLimiter);
app.use("/api/v1/auth/refresh-token", refreshTokenLimiter);
app.use("/api/v1/auth/send-verification-email", sendVerificationEmailLimiter);

// all routes
app.use("/api/v1", router);

// Routes
app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "OK",
    message: "ye dekh, server chal raha hai. aab maje kar!",
  });
});

//global error handler
app.use(globalErrorHandler);

// not found route
app.use(notFoundHandler);

export default app;
