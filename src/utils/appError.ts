import { IErrorSource } from "../interface/global.interface";

// Custom error class for application errors
export class AppError extends Error {
  public statusCode: number;
  public errorType: string;
  public errorSources?: IErrorSource[];
  public isOperational: boolean;
  public path: string;

  constructor(
    statusCode: number,
    message: string,
    errorType: string = "APPLICATION_ERROR",
    path: string = "global",
    isOperational: boolean = true,
    errorSources?: IErrorSource[]
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorType = errorType;
    if (errorSources) {
      this.errorSources = errorSources;
    }
    this.isOperational = isOperational;
    this.path = path;

    Error.captureStackTrace(this, this.constructor);
  }
}
