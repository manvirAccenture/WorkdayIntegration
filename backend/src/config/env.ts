import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  DATABASE_URL: process.env.DATABASE_URL || '',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  WORKDAY_TENANT_NAME: process.env.WORKDAY_TENANT_NAME || '',
  WORKDAY_API_ENDPOINT: process.env.WORKDAY_API_ENDPOINT || '',
  WORKDAY_CLIENT_ID: process.env.WORKDAY_CLIENT_ID || '',
  WORKDAY_CLIENT_SECRET: process.env.WORKDAY_CLIENT_SECRET || '',
  WORKDAY_REFRESH_TOKEN: process.env.WORKDAY_REFRESH_TOKEN || '',
};

// Log warning if DATABASE_URL or GEMINI_API_KEY is not defined
if (!env.DATABASE_URL) {
  console.warn('[Warning] DATABASE_URL is not set in environment variables. Set this to perform DB migrations and operations.');
}

if (!env.GEMINI_API_KEY) {
  console.warn('[Warning] GEMINI_API_KEY is not set. AI troubleshooting capabilities will be unavailable.');
}
