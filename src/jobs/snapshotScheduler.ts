import cron from 'node-cron';
import { IProfileService } from '../interfaces/IProfileService';
import { IProfileRepository } from '../interfaces/IProfileRepository';

export function startSnapshotScheduler(
  profileService: IProfileService,
  profileRepository: IProfileRepository,
): void {
  cron.schedule('0 2 * * 0', async () => {
    console.log('\n📸 [Scheduler] Starting weekly snapshot job...');
    const startTime = Date.now();

    try {
      const { profiles } = await profileRepository.findAll({
        page: 1,
        limit: 9999,
        sortBy: 'created_at',
        order: 'asc',
      });

      if (profiles.length === 0) {
        console.log('[Scheduler] No profiles to snapshot. Done.');
        return;
      }

      let success = 0;
      let failed = 0;

      for (const profile of profiles) {
        try {
          await profileService.analyzeProfile(profile.github_username);
          success++;
          console.log(`   ${profile.github_username}`);
        } catch (error) {
          failed++;
          console.error(`   ${profile.github_username}: ${(error as Error).message}`);
        }
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(
        `[Scheduler] Done in ${elapsed}s. ${success} succeeded, ${failed} failed.\n`,
      );
    } catch (error) {
      console.error('[Scheduler] Fatal error:', (error as Error).message);
    }
  });

  console.log('Snapshot scheduler active — runs every Sunday at 2:00 AM');
}
