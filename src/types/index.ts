// ---------------------------------------------------------------------------
// GitHub API Response Types
// ---------------------------------------------------------------------------

/** Shape of the JSON returned by GET /users/:username from the GitHub API. */
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

/** Shape of a single repo object returned by GET /users/:username/repos. */
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

/** Shape of the language breakdown returned by GET /repos/:owner/:repo/languages. */
export interface GitHubLanguagesResponse {
  [language: string]: number;
}

// ---------------------------------------------------------------------------
// Domain Models (mirror the database schema)
// ---------------------------------------------------------------------------

/** A GitHub profile as stored in the `profiles` table. */
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

/** A language record as stored in the `profile_languages` table. */
export interface LanguageData {
  id?: number;
  profile_id: number;
  language: string;
  bytes: number;
  percentage: number;
}

/** A repository record as stored in the `profile_repositories` table. */
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

// ---------------------------------------------------------------------------
// API Response DTOs
// ---------------------------------------------------------------------------

/** Full profile including related languages and top repositories. */
export interface ProfileWithInsights extends ProfileData {
  languages: LanguageData[];
  top_repositories: RepositoryData[];
}

/** Lightweight profile used in list/pagination endpoints. */
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

/** Standard paginated response envelope. */
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

/** Standard single-item response envelope. */
export interface SingleResponse<T> {
  success: boolean;
  data: T;
}

/** Standard error response envelope. */
export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: number;
  };
}

// ---------------------------------------------------------------------------
// Query Types
// ---------------------------------------------------------------------------

/** Parsed and validated query-string parameters for the profile list endpoint. */
export interface ProfileQueryParams {
  page: number;
  limit: number;
  search?: string;
  sortBy: string;
  order: 'asc' | 'desc';
}

/** Body of the POST /compare endpoint. */
export interface CompareRequest {
  usernames: string[];
}

// ---------------------------------------------------------------------------
// Aggregated Language Result
// ---------------------------------------------------------------------------

/** Language stats rolled up across all of a user's repositories. */
export interface AggregatedLanguage {
  language: string;
  bytes: number;
  percentage: number;
}
