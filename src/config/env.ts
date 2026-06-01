import dotenv from 'dotenv';

dotenv.config();

interface EnvConfig {
  PORT: number;
  DB_HOST: string;
  DB_PORT: number;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_NAME: string;
  DB_SSL: boolean;
  GITHUB_TOKEN: string | undefined;
  API_KEY: string;
}

function getEnvVar(key: string, required: boolean = true): string {
  const value = process.env[key];
  if (required && !value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || '';
}

export const env: EnvConfig = {
  PORT: parseInt(getEnvVar('PORT', false) || '3000', 10),
  DB_HOST: getEnvVar('DB_HOST'),
  DB_PORT: parseInt(getEnvVar('DB_PORT', false) || '3306', 10),
  DB_USER: getEnvVar('DB_USER'),
  DB_PASSWORD: getEnvVar('DB_PASSWORD'),
  DB_NAME: getEnvVar('DB_NAME'),
  DB_SSL: getEnvVar('DB_SSL', false).toLowerCase() === 'true',
  GITHUB_TOKEN: getEnvVar('GITHUB_TOKEN', false) || undefined,
  API_KEY: getEnvVar('API_KEY'),
};
