
import 'dotenv/config';

export interface AppConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  HOST: string;
  DATABASE_URL: string;
  DB_POOL_MAX: number;
  CORS_ORIGIN: string;
  RATE_LIMIT_MAX_PER_MINUTE: number;
}

export const env: AppConfig = {
  NODE_ENV: (process.env.NODE_ENV as AppConfig['NODE_ENV']) || 'development',
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3001,
  HOST: process.env.HOST || '0.0.0.0',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/elektriklioto',
  DB_POOL_MAX: process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX, 10) : 10,
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'https://elektriklioto.com,https://www.elektriklioto.com,http://localhost:3000',
  RATE_LIMIT_MAX_PER_MINUTE: process.env.RATE_LIMIT_MAX_PER_MINUTE ? parseInt(process.env.RATE_LIMIT_MAX_PER_MINUTE, 10) : 60,
};
