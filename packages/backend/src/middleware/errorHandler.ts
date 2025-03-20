import type { NextFunction, Request, Response } from "express";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      message: err.message,
      error: err,
    });
  }

  console.error("Unhandled error:", err);
  return res.status(500).json({
    message: "Internal server error",
    error: err instanceof Error ? err.message : "Unknown error",
  });
};
