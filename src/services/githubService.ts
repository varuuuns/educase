import axios, { AxiosInstance, AxiosError } from 'axios';
import { GitHubUserResponse, GitHubRepoResponse, AggregatedLanguage } from '../types';
import { IGitHubService } from '../interfaces/IGitHubService';
import { NotFoundError, RateLimitError, GitHubApiError } from '../errors/AppError';


export class GitHubService implements IGitHubService {
  private readonly client: AxiosInstance;
  constructor(token: string | undefined) {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    this.client = axios.create({
      baseURL: 'https://api.github.com',
      headers,
    });
  }

  async fetchUserProfile(username: string): Promise<GitHubUserResponse> {
    try {
      const response = await this.client.get<GitHubUserResponse>(`/users/${username}`);
      return response.data;
    } catch (error) {
      throw this.handleApiError(error, username);
    }
  }

  async fetchUserRepos(username: string): Promise<GitHubRepoResponse[]> {
    const allRepos: GitHubRepoResponse[] = [];
    let page = 1;

    try {
      while (true) {
        const response = await this.client.get<GitHubRepoResponse[]>(
          `/users/${username}/repos`,
          {
            params: {
              per_page: 100,
              sort: 'updated',
              page,
            },
          }
        );

        const repos = response.data;
        if (repos.length === 0) {
          break;
        }

        allRepos.push(...repos);
        page++;
      }
    } catch (error) {
      throw this.handleApiError(error, username);
    }

    return allRepos;
  }

  async fetchRepoLanguages(owner: string, repo: string): Promise<Record<string, number>> {
    try {
      const response = await this.client.get<Record<string, number>>(
        `/repos/${owner}/${repo}/languages`
      );
      return response.data;
    } catch {
      return {};
    }
  }

  async aggregateLanguages(
    username: string,
    repos: GitHubRepoResponse[]
  ): Promise<AggregatedLanguage[]> {
    const languageTotals = new Map<string, number>();
    const batchSize = 5;

    for (let i = 0; i < repos.length; i += batchSize) {
      const batch = repos.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map((repo) => this.fetchRepoLanguages(username, repo.name))
      );

      for (const langMap of results) {
        for (const [language, bytes] of Object.entries(langMap)) {
          const current = languageTotals.get(language) ?? 0;
          languageTotals.set(language, current + bytes);
        }
      }
    }

    const totalBytes = Array.from(languageTotals.values()).reduce(
      (sum, bytes) => sum + bytes,
      0
    );

    const aggregated: AggregatedLanguage[] = Array.from(languageTotals.entries())
      .map(([language, bytes]) => ({
        language,
        bytes,
        percentage: totalBytes > 0
          ? Math.round((bytes / totalBytes) * 10000) / 100
          : 0,
      }))
      .sort((a, b) => b.bytes - a.bytes);

    return aggregated;
  }

  private handleApiError(error: unknown, username: string): Error {
    if (error instanceof AxiosError && error.response) {
      const { status } = error.response;

      if (status === 404) {
        return new NotFoundError(`GitHub user "${username}"`);
      }

      if (status === 403) {
        return new RateLimitError();
      }

      return new GitHubApiError(
        `GitHub API error: ${status} — ${error.message}`
      );
    }

    if (error instanceof Error) {
      return new GitHubApiError(`GitHub API request failed: ${error.message}`);
    }

    return new GitHubApiError('An unknown error occurred while calling the GitHub API');
  }
}
