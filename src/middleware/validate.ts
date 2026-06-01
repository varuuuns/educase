import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../errors/AppError';

export function validateUsername(req: Request, _res: Response, next: NextFunction): void {
  const username = req.params.username as string;
  if (!username) {
    throw new ValidationError('Username parameter is required');
  }

  const githubUsernameRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;
  if (!githubUsernameRegex.test(username)) {
    throw new ValidationError(
      `Invalid GitHub username: "${username}". Must be 1-39 alphanumeric characters or hyphens.`
    );
  }

  next();
}

export function validateCompareRequest(req: Request, _res: Response, next: NextFunction): void {
  const { usernames } = req.body as { usernames?: unknown };

  if (!Array.isArray(usernames)) {
    throw new ValidationError('"usernames" must be an array');
  }

  if (usernames.length < 2) {
    throw new ValidationError('At least 2 usernames are required for comparison');
  }

  if (usernames.length > 5) {
    throw new ValidationError('Maximum 5 usernames can be compared at once');
  }

  for (const name of usernames) {
    if (typeof name !== 'string') {
      throw new ValidationError('Each username must be a string');
    }
  }

  next();
}
