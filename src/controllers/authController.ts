import { Request, Response } from 'express';
import { IAuthService } from '../interfaces/IAuthService';
import { ValidationError } from '../errors/AppError';
import { SingleResponse, UserData, AuthTokens } from '../types';

export class AuthController {
  constructor(private readonly authService: IAuthService) {}

  register = async (req: Request, res: Response): Promise<void> => {
    const { username, email, password } = req.body as {
      username?: string;
      email?: string;
      password?: string;
    };

    if (!username || !email || !password) {
      throw new ValidationError('username, email, and password are required');
    }

    if (password.length < 6) {
      throw new ValidationError('Password must be at least 6 characters');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError('Invalid email format');
    }

    const user = await this.authService.register(username, email, password);

    const response: SingleResponse<UserData> = {
      success: true,
      data: user,
    };
    res.status(201).json(response);
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      throw new ValidationError('email and password are required');
    }

    const tokens = await this.authService.login(email, password);

    const response: SingleResponse<AuthTokens> = {
      success: true,
      data: tokens,
    };
    res.json(response);
  };
}
