import { Router } from 'express';
import { ProfileController } from '../controllers/profileController';
import { ProfileService } from '../services/profileService';
import { GitHubService } from '../services/githubService';
import { ProfileRepository } from '../repositories/profileRepository';
import { authenticate } from '../middleware/auth';
import { validateUsername, validateCompareRequest } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { env } from '../config/env';

export function createProfileRouter(): Router {
  const router = Router();

  const githubService = new GitHubService(env.GITHUB_TOKEN);
  const profileRepository = new ProfileRepository();
  const profileService = new ProfileService(githubService, profileRepository);
  const controller = new ProfileController(profileService);

  router.use(authenticate);

  router.post(
    '/compare',
    validateCompareRequest,
    asyncHandler(controller.compareProfiles)
  );

  router.post(
    '/:username/analyze',
    validateUsername,
    asyncHandler(controller.analyzeProfile)
  );

  router.get('/', asyncHandler(controller.listProfiles));

  router.get(
    '/:username',
    validateUsername,
    asyncHandler(controller.getProfile)
  );

  router.delete(
    '/:username',
    validateUsername,
    asyncHandler(controller.deleteProfile)
  );

  return router;
}
