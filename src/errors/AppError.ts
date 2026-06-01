export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class GitHubApiError extends AppError {
  constructor(message: string, statusCode: number = 502) {
    super(message, statusCode);
  }
}

export class RateLimitError extends AppError {
  constructor() {
    super('GitHub API rate limit exceeded. Please try again later.', 429);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Invalid or missing API key') {
    super(message, 401);
  }
}
