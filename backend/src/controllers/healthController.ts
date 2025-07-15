import { Request, Response } from 'express';
import { config } from '@/utils/config';

export const getHealth = (req: Request, res: Response): void => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
  });
};

export const getStatus = (req: Request, res: Response): void => {
  res.json({
    status: 'running',
    mode: 'text-only',
    model: config.GEMINI_MODEL,
    hasApiKey: !!(config.GEMINI_API_KEY && config.GEMINI_API_KEY !== 'your_api_key_here'),
    server: {
      port: config.PORT,
      host: config.HOST,
      environment: config.NODE_ENV,
    },
    features: {
      socketIO: true,
      geminiLive: true,
      frameProcessing: true,
    },
  });
};
