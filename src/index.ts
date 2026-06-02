import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { initializeDatabase } from './config/db';
import { createProfileRouter } from './routes/profileRoutes';
import { createAuthRouter } from './routes/authRoutes';
import { errorHandler } from './middleware/errorHandler';

async function bootstrap(): Promise<void> {
  const app = express();

  app.use(cors());
  app.use(express.json());

  await initializeDatabase();

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', createAuthRouter());
  app.use('/api/profiles', createProfileRouter());

  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: { message: 'Route not found', code: 404 },
    });
  });

  app.use(errorHandler);

  app.listen(env.PORT, () => {
    console.log('\n🚀 GitHub Profile Analyzer API');
    console.log(`   Server running at:${env.PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
