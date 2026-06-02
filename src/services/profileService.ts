import { IGitHubService } from '../interfaces/IGitHubService';
import { IProfileRepository } from '../interfaces/IProfileRepository';
import { IProfileService } from '../interfaces/IProfileService';
import {
  ProfileWithInsights,
  ProfileListItem,
  ProfileQueryParams,
  ProfileData,
  LanguageData,
  RepositoryData,
  GitHubUserResponse,
  GitHubRepoResponse,
  AggregatedLanguage,
  GrowthTrend,
  SnapshotWithDelta,
  GrowthDelta,
} from '../types';
import { NotFoundError, ValidationError } from '../errors/AppError';

export class ProfileService implements IProfileService {
  constructor(
    private readonly githubService: IGitHubService,
    private readonly profileRepository: IProfileRepository
  ) {}

  async analyzeProfile(username: string): Promise<ProfileWithInsights> {
    const user = await this.githubService.fetchUserProfile(username);
    const repos = await this.githubService.fetchUserRepos(username);
    const languages = await this.githubService.aggregateLanguages(username, repos);

    const topRepos = [...repos]
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
      .slice(0, 10);

    const followerRatio = user.followers / (user.following || 1);
    const accountAgeDays = Math.floor(
      (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    const profileData = this.mapToProfileData(user, followerRatio, accountAgeDays);
    const profileId = await this.profileRepository.upsertProfile(profileData);
    const languageData = this.mapToLanguageData(languages, profileId);
    const repositoryData = this.mapToRepositoryData(topRepos, profileId);

    await this.profileRepository.replaceLanguages(profileId, languageData);
    await this.profileRepository.replaceRepositories(profileId, repositoryData);

    const totalStars = repos.reduce((sum, r) => sum + r.stargazers_count, 0);
    await this.profileRepository.saveSnapshot({
      profile_id: profileId,
      followers: user.followers,
      following: user.following,
      public_repos: user.public_repos,
      total_stars: totalStars,
      follower_ratio: Math.round(followerRatio * 100) / 100,
      snapshot_at: new Date(),
    });

    const result = await this.profileRepository.findByUsername(username);
    if (!result) {
      throw new NotFoundError(`Profile "${username}" after analysis`);
    }

    return result;
  }

  async getProfile(username: string): Promise<ProfileWithInsights> {
    const profile = await this.profileRepository.findByUsername(username);
    if (!profile) {
      throw new NotFoundError(`Profile "${username}"`);
    }
    return profile;
  }

  async listProfiles(
    params: ProfileQueryParams
  ): Promise<{ profiles: ProfileListItem[]; total: number }> {
    return this.profileRepository.findAll(params);
  }

  async deleteProfile(username: string): Promise<void> {
    const deleted = await this.profileRepository.softDelete(username);
    if (!deleted) {
      throw new NotFoundError(`Profile "${username}"`);
    }
  }

  async compareProfiles(usernames: string[]): Promise<ProfileWithInsights[]> {
    if (usernames.length < 2) {
      throw new ValidationError('At least 2 usernames are required for comparison');
    }

    const profiles = await this.profileRepository.findByUsernames(usernames);

    const foundUsernames = new Set(
      profiles.map((p) => p.github_username.toLowerCase())
    );
    const missingUsernames = usernames.filter(
      (u) => !foundUsernames.has(u.toLowerCase())
    );

    if (missingUsernames.length > 0) {
      throw new NotFoundError(
        `Profiles not found: ${missingUsernames.join(', ')}`
      );
    }

    return profiles;
  }

  async getGrowthTrend(username: string): Promise<GrowthTrend> {
    const profile = await this.profileRepository.findByUsername(username);
    if (!profile) {
      throw new NotFoundError(`Profile "${username}"`);
    }

    const snapshots = await this.profileRepository.getSnapshots(profile.id!);

    if (snapshots.length === 0) {
      throw new NotFoundError(
        `No snapshots found for "${username}". Analyze the profile first.`
      );
    }

    const history: SnapshotWithDelta[] = snapshots.map((snapshot, index) => {
      if (index === 0) {
        return { ...snapshot, delta: null };
      }

      const prev = snapshots[index - 1]!;
      const periodMs = snapshot.snapshot_at.getTime() - prev.snapshot_at.getTime();
      const periodDays = Math.max(1, Math.round(periodMs / (1000 * 60 * 60 * 24)));

      const delta: GrowthDelta = {
        followers_delta: snapshot.followers - prev.followers,
        following_delta: snapshot.following - prev.following,
        repos_delta: snapshot.public_repos - prev.public_repos,
        stars_delta: snapshot.total_stars - prev.total_stars,
        follower_ratio_delta: Math.round((snapshot.follower_ratio - prev.follower_ratio) * 100) / 100,
        period_days: periodDays,
      };

      return { ...snapshot, delta };
    });

    const first = snapshots[0]!;
    const last = snapshots[snapshots.length - 1]!;

    return {
      username,
      current: last,
      history,
      summary: {
        total_snapshots: snapshots.length,
        tracking_since: first.snapshot_at,
        total_follower_growth: last.followers - first.followers,
        total_star_growth: last.total_stars - first.total_stars,
        total_new_repos: last.public_repos - first.public_repos,
      },
    };
  }

  private mapToProfileData(
    user: GitHubUserResponse,
    followerRatio: number,
    accountAgeDays: number
  ): ProfileData {
    return {
      github_username: user.login,
      name: user.name,
      bio: user.bio,
      avatar_url: user.avatar_url,
      location: user.location,
      company: user.company,
      blog: user.blog,
      public_repos: user.public_repos,
      public_gists: user.public_gists,
      followers: user.followers,
      following: user.following,
      account_created_at: new Date(user.created_at),
      profile_url: user.html_url,
      twitter_username: user.twitter_username,
      is_hireable: user.hireable ?? false,
      account_type: user.type,
      follower_ratio: Math.round(followerRatio * 100) / 100,
      account_age_days: accountAgeDays,
    };
  }

  private mapToLanguageData(languages: AggregatedLanguage[], profileId: number): LanguageData[] {
    return languages.map((lang) => ({
      profile_id: profileId,
      language: lang.language,
      bytes: lang.bytes,
      percentage: lang.percentage,
    }));
  }

  private mapToRepositoryData(repos: GitHubRepoResponse[], profileId: number): RepositoryData[] {
    return repos.map((repo) => ({
      profile_id: profileId,
      repo_name: repo.name,
      description: repo.description,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      open_issues: repo.open_issues_count,
      primary_language: repo.language,
      is_fork: repo.fork,
      last_pushed_at: repo.pushed_at ? new Date(repo.pushed_at) : null,
      repo_url: repo.html_url,
    }));
  }
}
