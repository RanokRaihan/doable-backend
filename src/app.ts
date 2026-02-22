import cors from "cors";
import express, { Application, Request, Response } from "express";
import {
  globalErrorHandler,
  notFoundHandler,
} from "./middlewares/errorHandler";
import router from "./routes";

const app: Application = express();

// Middleware
app.use(
  cors({
    origin: "http://localhost:3000", // Allow frontend; restrict in production
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
