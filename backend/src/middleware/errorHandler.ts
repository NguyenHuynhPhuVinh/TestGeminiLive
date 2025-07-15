import { Request, Response, NextFunction } from "express";
import { logger } from "@/utils/logger";
import { ApiError } from "@/types";

export const errorHandler = (
  error: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error("❌ Error occurred:", error.message);

  // Default error
  let status = 500;
  let message = "Internal Server Error";

  // Handle specific error types
  if ("status" in error && error.status) {
    status = error.status;
    message = error.message;
  } else if (error instanceof Error) {
    // Handle standard Error objects
    if (error.name === "ValidationError") {
      status = 400;
      message = "Validation Error";
    } else if (error.name === "UnauthorizedError") {
      status = 401;
      message = "Unauthorized";
    }
  }

  res.status(status).json({
    error: {
      message,
      status,
      ...(process.env.NODE_ENV === "development" &&
        error instanceof Error && { stack: error.stack }),
    },
  });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    error: {
      message: "Route not found",
      status: 404,
    },
  });
};
