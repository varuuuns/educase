import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { getPool } from '../config/db';
import { IAuthService, JwtPayload } from '../interfaces/IAuthService';
import { UserData, AuthTokens } from '../types';
import { ValidationError, UnauthorizedError } from '../errors/AppError';

interface UserRow extends RowDataPacket {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

const SALT_ROUNDS = 12;

export class AuthService implements IAuthService {
  constructor(
    private readonly jwtSecret: string,
    private readonly jwtExpiresIn: string,
  ) {}

  // register or signup
  async register(username: string, email: string, password: string): Promise<UserData> {
    const pool = getPool();

    const [existingEmail] = await pool.query<UserRow[]>(
      'SELECT id FROM users WHERE email = ?',
      [email],
    );
    if (existingEmail.length > 0) {
      throw new ValidationError('Email already registered');
    }

    const [existingUsername] = await pool.query<UserRow[]>(
      'SELECT id FROM users WHERE username = ?',
      [username],
    );
    if (existingUsername.length > 0) {
      throw new ValidationError('Username already taken');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, passwordHash],
    );

    const [newUserRows] = await pool.query<UserRow[]>(
      'SELECT id, username, email, created_at, updated_at FROM users WHERE id = ?',
      [result.insertId],
    );
    const newUser = newUserRows[0]!;

    return {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      created_at: newUser.created_at,
      updated_at: newUser.updated_at,
    };
  }

  // login
  async login(email: string, password: string): Promise<AuthTokens> {
    const pool = getPool();

    const [rows] = await pool.query<UserRow[]>(
      'SELECT * FROM users WHERE email = ?',
      [email],
    );

    const user = rows[0];
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const payload: JwtPayload = { userId: user.id, email: user.email };
    const signOptions: SignOptions = {
      expiresIn: this.jwtExpiresIn as unknown as number,
    };
    const token = jwt.sign(payload, this.jwtSecret, signOptions);

    return { token, expiresIn: this.jwtExpiresIn };
  }

  // authenticate user
  verifyToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as JwtPayload;
      return { userId: decoded.userId, email: decoded.email };
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }
  }
}
