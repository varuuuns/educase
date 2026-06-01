import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { ErrorResponse } from '../types';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(`[ERROR] ${err.message}`, err.stack);

  if (err instanceof AppError) {
    const response: ErrorResponse = {
      success: false,
      error: {
        message: err.message,
        code: err.statusCode,
      },
    };
    res.status(err.statusCode).json(response);
    return;
  }

  const response: ErrorResponse = {
    success: false,
    error: {
      message: 'Internal server error',
      code: 500,
    },
  };
  res.status(500).json(response);
}
