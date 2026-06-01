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
} from '../types';
import { NotFoundError, ValidationError } from '../errors/AppError';

export class ProfileService implements IProfileService {
  constructor(
    private readonly githubService: IGitHubService,
    private readonly profileRepository: IProfileRepository
  ) {}

 // get profile from github
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

    const result = await this.profileRepository.findByUsername(username);
    if (!result) {
      throw new NotFoundError(`Profile "${username}" after analysis`);
    }

    return result;
  }

  // retrive from db
  async getProfile(username: string): Promise<ProfileWithInsights> {
    const profile = await this.profileRepository.findByUsername(username);
    if (!profile) {
      throw new NotFoundError(`Profile "${username}"`);
    }
    return profile;
  }

  // get every profile
  async listProfiles(
    params: ProfileQueryParams
  ): Promise<{ profiles: ProfileListItem[]; total: number }> {
    return this.profileRepository.findAll(params);
  }

  // soft delete profile
  async deleteProfile(username: string): Promise<void> {
    const deleted = await this.profileRepository.softDelete(username);
    if (!deleted) {
      throw new NotFoundError(`Profile "${username}"`);
    }
  }


  // compare profiles in array
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
