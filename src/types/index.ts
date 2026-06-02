export interface GitHubUserResponse {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  name: string | null;
  company: string | null;
  blog: string | null;
  location: string | null;
  email: string | null;
  hireable: boolean | null;
  bio: string | null;
  twitter_username: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  type: string;
}

export interface GitHubRepoResponse {
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  fork: boolean;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  pushed_at: string | null;
}

export interface GitHubLanguagesResponse {
  [language: string]: number;
}

export interface ProfileData {
  id?: number;
  github_username: string;
  name: string | null;
  bio: string | null;
  avatar_url: string | null;
  location: string | null;
  company: string | null;
  blog: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  account_created_at: Date | null;
  profile_url: string | null;
  twitter_username: string | null;
  is_hireable: boolean;
  account_type: string;
  follower_ratio: number;
  account_age_days: number;
  analyzed_at?: Date;
  is_deleted?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface LanguageData {
  id?: number;
  profile_id: number;
  language: string;
  bytes: number;
  percentage: number;
}

export interface RepositoryData {
  id?: number;
  profile_id: number;
  repo_name: string;
  description: string | null;
  stars: number;
  forks: number;
  open_issues: number;
  primary_language: string | null;
  is_fork: boolean;
  last_pushed_at: Date | null;
  repo_url: string | null;
}

export interface ProfileWithInsights extends ProfileData {
  languages: LanguageData[];
  top_repositories: RepositoryData[];
}
export interface ProfileListItem {
  id: number;
  github_username: string;
  name: string | null;
  avatar_url: string | null;
  public_repos: number;
  followers: number;
  following: number;
  follower_ratio: number;
  account_age_days: number;
  analyzed_at: Date;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SingleResponse<T> {
  success: boolean;
  data: T;
}

export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: number;
  };
}

export interface ProfileQueryParams {
  page: number;
  limit: number;
  search?: string;
  sortBy: string;
  order: 'asc' | 'desc';
}

export interface CompareRequest {
  usernames: string[];
}

export interface AggregatedLanguage {
  language: string;
  bytes: number;
  percentage: number;
}

export interface UserData {
  id: number;
  username: string;
  email: string;
  created_at: Date;
  updated_at: Date;
}

export interface AuthTokens {
  token: string;
  expiresIn: string;
}


export interface SnapshotData {
  id?: number;
  profile_id: number;
  followers: number;
  following: number;
  public_repos: number;
  total_stars: number;
  follower_ratio: number;
  snapshot_at: Date;
}

export interface GrowthDelta {
  followers_delta: number;
  following_delta: number;
  repos_delta: number;
  stars_delta: number;
  follower_ratio_delta: number;
  period_days: number;
}

export interface SnapshotWithDelta extends SnapshotData {
  delta: GrowthDelta | null;
}

export interface GrowthTrend {
  username: string;
  current: SnapshotData;
  history: SnapshotWithDelta[];
  summary: {
    total_snapshots: number;
    tracking_since: Date;
    total_follower_growth: number;
    total_star_growth: number;
    total_new_repos: number;
  };
}
