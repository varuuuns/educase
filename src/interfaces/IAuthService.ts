import { UserData, AuthTokens } from '../types';

export interface IAuthService {
  register(username: string, email: string, password: string): Promise<UserData>;

  login(email: string, password: string): Promise<AuthTokens>;

  verifyToken(token: string): JwtPayload;
}

export interface JwtPayload {
  userId: number;
  email: string;
}
