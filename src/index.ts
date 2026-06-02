import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { initializeDatabase } from './config/db';
import { createProfileRouter } from './routes/profileRoutes';
import { createAuthRouter } from './routes/authRoutes';
import { errorHandler } from './middleware/errorHandler';
import { startSnapshotScheduler } from './jobs/snapshotScheduler';
import { GitHubService } from './services/githubService';
import { ProfileRepository } from './repositories/profileRepository';
import { ProfileService } from './services/profileService';

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
    console.log(`   Server running at:${env.PORT}`);
    console.log('');

    const githubService = new GitHubService(env.GITHUB_TOKEN);
    const profileRepository = new ProfileRepository();
    const profileService = new ProfileService(githubService, profileRepository);
    startSnapshotScheduler(profileService, profileRepository);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
