import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { initializeDatabase } from './config/db';
import { createProfileRouter } from './routes/profileRoutes';
import { errorHandler } from './middleware/errorHandler';

/**
 * Bootstraps the Express application, initializes the database,
 * mounts routes, and starts listening for incoming requests.
 */
async function bootstrap(): Promise<void> {
  const app = express();

  // --- Global Middleware ---
  app.use(cors());
  app.use(express.json());

  // --- Initialize Database ---
  await initializeDatabase();

  // --- Health Check (no auth required) ---
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // --- Routes ---
  app.use('/api/profiles', createProfileRouter());

  // --- 404 Handler ---
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: { message: 'Route not found', code: 404 },
    });
  });

  // --- Global Error Handler ---
  app.use(errorHandler);

  // --- Start Server ---
  app.listen(env.PORT, () => {
    console.log('\n🚀 GitHub Profile Analyzer API');
    console.log(`   Server running at: http://localhost:${env.PORT}`);
    console.log(`   Health check:      http://localhost:${env.PORT}/api/health`);
    console.log(`   API base:          http://localhost:${env.PORT}/api/profiles`);
    console.log('');
  });
}

bootstrap().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
