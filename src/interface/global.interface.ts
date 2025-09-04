// Enhanced pagination metadata interface
export interface IPagination {
  total: number;
  limit: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Legacy support - keeping for backward compatibility
export interface IMeta extends IPagination {}

// Error source interface for detailed error reporting
export interface IErrorSource {
  path: string | number;
  message: string;
}

// Base response interface
export interface IBaseResponse {
  success: boolean;
  message: string;
  statusCode: number;
  timestamp: string;
  path?: string;
}

// Success response interface
export interface ISuccessResponse<T> extends IBaseResponse {
  success: true;
  data: T;
  meta?: IPagination;
}

// Error response interface
export interface IErrorResponse extends IBaseResponse {
  success: false;
  error: {
    type: string;
    details?: string;
    errorSources?: IErrorSource[];
    stack?: string;
  };
}

// Union type for all possible responses
export interface IResponse<T> extends IBaseResponse {
  success: boolean;
  data?: T;
  meta?: IPagination;
  error?: {
    type: string;
    details?: string;
    errorSources?: IErrorSource[];
    stack?: string;
  };
}

// Response options for sendResponse utility
export interface IResponseOptions {
  meta?: IPagination;
  path?: string;
  errorType?: string;
  errorDetails?: string;
  errorSources?: IErrorSource[];
  includeStack?: boolean;
}

// Helper type for success response options (only optional fields)
export interface ISuccessOptions {
  meta?: IPagination;
  path?: string;
}

// Helper type for error response options (only optional fields)
export interface IErrorOptions {
  path?: string;
  errorType?: string;
  errorDetails?: string;
  errorSources?: IErrorSource[];
  includeStack?: boolean;
}
