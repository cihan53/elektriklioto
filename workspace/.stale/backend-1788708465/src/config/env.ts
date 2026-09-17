
import dotenv from 'dotenv';

dotenv.config();

export const env = {
  PORT: Number(process.env.PORT || 3001),
  HOST: process.env.HOST || '0.0.0.0',
  DATABASE_URL: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/elektriklioto',
  NODE_ENV: process.env.NODE_ENV || 'development',
  SEED_FILE_PATH: process.env.SEED_FILE_PATH || '',
};
