import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../errors/AppError';
import { env } from '../config/env';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../interfaces/IAuthService';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'] as string | undefined;
  if (apiKey && apiKey === env.API_KEY) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7); 
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      req.user = decoded;
      return next();
    } catch {
      throw new UnauthorizedError('Invalid or expired JWT token');
    }
  }

  throw new UnauthorizedError(
    'Authentication required. Provide either an x-api-key header or Authorization: Bearer <token> header.'
  );
}
