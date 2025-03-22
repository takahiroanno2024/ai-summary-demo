import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { AppError } from "./errorHandler";

export const validateObjectId = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.params[paramName];
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError(400, `Invalid ${paramName}`));
    }
    next();
  };
};
