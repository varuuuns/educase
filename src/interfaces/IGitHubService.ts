import { GitHubUserResponse, GitHubRepoResponse, AggregatedLanguage } from '../types';


export interface IGitHubService {
  fetchUserProfile(username: string): Promise<GitHubUserResponse>;

  fetchUserRepos(username: string): Promise<GitHubRepoResponse[]>;

  fetchRepoLanguages(owner: string, repo: string): Promise<Record<string, number>>;

  aggregateLanguages(username: string, repos: GitHubRepoResponse[]): Promise<AggregatedLanguage[]>;
}
