import dotenv from 'dotenv';
import { EnvConfig } from '@/types';

// Load environment variables
dotenv.config();

export const config: EnvConfig = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  HOST: process.env.HOST || 'localhost',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-live-2.5-flash-preview',
  SOCKET_CORS_ORIGIN: process.env.SOCKET_CORS_ORIGIN || 'http://localhost:3000',
  MAX_FRAME_SIZE: parseInt(process.env.MAX_FRAME_SIZE || '15728640', 10), // 15MB
  MAX_FRAMES_PER_REQUEST: parseInt(process.env.MAX_FRAMES_PER_REQUEST || '30', 10),
  FRAME_QUALITY: parseFloat(process.env.FRAME_QUALITY || '0.7'),
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
};

// Validate required environment variables
export const validateConfig = (): void => {
  const requiredVars = ['GEMINI_API_KEY'];
  
  for (const varName of requiredVars) {
    if (!process.env[varName] || process.env[varName] === 'your_api_key_here') {
      console.error(`❌ Missing required environment variable: ${varName}`);
      console.log('📝 Please check your .env file');
      process.exit(1);
    }
  }
  
  console.log('✅ Environment configuration validated');
};
