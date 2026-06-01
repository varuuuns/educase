import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { getPool } from '../config/db';
import { IProfileRepository } from '../interfaces/IProfileRepository';
import {
  ProfileData,
  LanguageData,
  RepositoryData,
  ProfileWithInsights,
  ProfileListItem,
  ProfileQueryParams,
} from '../types';

const ALLOWED_SORT_COLUMNS = [
  'followers',
  'public_repos',
  'analyzed_at',
  'account_age_days',
  'follower_ratio',
  'created_at',
] as const;

interface ProfileRow extends RowDataPacket {
  id: number;
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
  is_hireable: number;
  account_type: string;
  follower_ratio: string;
  account_age_days: number;
  analyzed_at: Date;
  is_deleted: number;
  created_at: Date;
  updated_at: Date;
}

interface LanguageRow extends RowDataPacket {
  id: number;
  profile_id: number;
  language: string;
  bytes: number;
  percentage: string;
}

interface RepoRow extends RowDataPacket {
  id: number;
  profile_id: number;
  repo_name: string;
  description: string | null;
  stars: number;
  forks: number;
  open_issues: number;
  primary_language: string | null;
  is_fork: number;
  last_pushed_at: Date | null;
  repo_url: string | null;
}

interface CountRow extends RowDataPacket {
  total: number;
}

export class ProfileRepository implements IProfileRepository {
  async upsertProfile(profile: ProfileData): Promise<number> {
    const pool = getPool();

    const sql = `
      INSERT INTO profiles (
        github_username, name, bio, avatar_url, location, company, blog,
        public_repos, public_gists, followers, following,
        account_created_at, profile_url, twitter_username,
        is_hireable, account_type, follower_ratio, account_age_days,
        analyzed_at, is_deleted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), FALSE)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        bio = VALUES(bio),
        avatar_url = VALUES(avatar_url),
        location = VALUES(location),
        company = VALUES(company),
        blog = VALUES(blog),
        public_repos = VALUES(public_repos),
        public_gists = VALUES(public_gists),
        followers = VALUES(followers),
        following = VALUES(following),
        account_created_at = VALUES(account_created_at),
        profile_url = VALUES(profile_url),
        twitter_username = VALUES(twitter_username),
        is_hireable = VALUES(is_hireable),
        account_type = VALUES(account_type),
        follower_ratio = VALUES(follower_ratio),
        account_age_days = VALUES(account_age_days),
        analyzed_at = NOW(),
        is_deleted = FALSE
    `;

    const params = [
      profile.github_username,
      profile.name,
      profile.bio,
      profile.avatar_url,
      profile.location,
      profile.company,
      profile.blog,
      profile.public_repos,
      profile.public_gists,
      profile.followers,
      profile.following,
      profile.account_created_at,
      profile.profile_url,
      profile.twitter_username,
      profile.is_hireable,
      profile.account_type,
      profile.follower_ratio,
      profile.account_age_days,
    ];

    const [result] = await pool.execute<ResultSetHeader>(sql, params);

    if (result.insertId === 0) {
      const [rows] = await pool.execute<ProfileRow[]>(
        'SELECT id FROM profiles WHERE github_username = ?',
        [profile.github_username],
      );
      const row = rows[0];
      if (!row) {
        throw new Error(`Profile not found after upsert: ${profile.github_username}`);
      }
      return row.id;
    }

    return result.insertId;
  }

  async replaceLanguages(profileId: number, languages: LanguageData[]): Promise<void> {
    const pool = getPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      await connection.execute('DELETE FROM profile_languages WHERE profile_id = ?', [profileId]);

      if (languages.length > 0) {
        const placeholders = languages.map(() => '(?, ?, ?, ?)').join(', ');
        const values: Array<string | number> = [];
        for (const lang of languages) {
          values.push(profileId, lang.language, lang.bytes, lang.percentage);
        }

        await connection.execute(
          `INSERT INTO profile_languages (profile_id, language, bytes, percentage) VALUES ${placeholders}`,
          values,
        );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async replaceRepositories(profileId: number, repositories: RepositoryData[]): Promise<void> {
    const pool = getPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      await connection.execute('DELETE FROM profile_repositories WHERE profile_id = ?', [profileId]);

      if (repositories.length > 0) {
        const placeholders = repositories
          .map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .join(', ');
        const values: Array<string | number | boolean | Date | null> = [];
        for (const repo of repositories) {
          values.push(
            profileId,
            repo.repo_name,
            repo.description,
            repo.stars,
            repo.forks,
            repo.open_issues,
            repo.primary_language,
            repo.is_fork,
            repo.last_pushed_at,
            repo.repo_url,
          );
        }

        await connection.execute(
          `INSERT INTO profile_repositories
            (profile_id, repo_name, description, stars, forks, open_issues, primary_language, is_fork, last_pushed_at, repo_url)
           VALUES ${placeholders}`,
          values,
        );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async findByUsername(username: string): Promise<ProfileWithInsights | null> {
    const pool = getPool();

    const [profileRows] = await pool.execute<ProfileRow[]>(
      'SELECT * FROM profiles WHERE github_username = ? AND is_deleted = FALSE',
      [username],
    );

    const profileRow = profileRows[0];
    if (!profileRow) {
      return null;
    }

    const profile = this.mapRowToProfile(profileRow);

    const [languageRows] = await pool.execute<LanguageRow[]>(
      'SELECT * FROM profile_languages WHERE profile_id = ?',
      [profileRow.id],
    );

    const [repoRows] = await pool.execute<RepoRow[]>(
      'SELECT * FROM profile_repositories WHERE profile_id = ? ORDER BY stars DESC',
      [profileRow.id],
    );

    return {
      ...profile,
      languages: languageRows.map((row) => this.mapRowToLanguage(row)),
      top_repositories: repoRows.map((row) => this.mapRowToRepository(row)),
    };
  }

  async findAll(
    params: ProfileQueryParams,
  ): Promise<{ profiles: ProfileListItem[]; total: number }> {
    const pool = getPool();

    const sortColumn = this.sanitizeSortColumn(params.sortBy);
    const order = params.order === 'desc' ? 'DESC' : 'ASC';
    const offset = (params.page - 1) * params.limit;

    let whereClause = 'WHERE is_deleted = FALSE';
    const queryParams: Array<string | number> = [];

    if (params.search) {
      whereClause += ' AND (github_username LIKE ? OR name LIKE ?)';
      const searchPattern = `%${params.search}%`;
      queryParams.push(searchPattern, searchPattern);
    }

    const [countRows] = await pool.query<CountRow[]>(
      `SELECT COUNT(*) AS total FROM profiles ${whereClause}`,
      queryParams,
    );
    const total = countRows[0]?.total ?? 0;

    const [profileRows] = await pool.query<ProfileRow[]>(
      `SELECT id, github_username, name, avatar_url, public_repos, followers,
              following, follower_ratio, account_age_days, analyzed_at
       FROM profiles
       ${whereClause}
       ORDER BY ${sortColumn} ${order}
       LIMIT ? OFFSET ?`,
      [...queryParams, params.limit, offset],
    );

    const profiles: ProfileListItem[] = profileRows.map((row) => ({
      id: row.id,
      github_username: row.github_username,
      name: row.name,
      avatar_url: row.avatar_url,
      public_repos: row.public_repos,
      followers: row.followers,
      following: row.following,
      follower_ratio: parseFloat(String(row.follower_ratio)),
      account_age_days: row.account_age_days,
      analyzed_at: row.analyzed_at,
    }));

    return { profiles, total };
  }

  async softDelete(username: string): Promise<boolean> {
    const pool = getPool();

    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE profiles SET is_deleted = TRUE WHERE github_username = ? AND is_deleted = FALSE',
      [username],
    );

    return result.affectedRows > 0;
  }

  async findByUsernames(usernames: string[]): Promise<ProfileWithInsights[]> {
    if (usernames.length === 0) {
      return [];
    }

    const pool = getPool();
    const placeholders = usernames.map(() => '?').join(', ');

    const [profileRows] = await pool.execute<ProfileRow[]>(
      `SELECT * FROM profiles WHERE github_username IN (${placeholders}) AND is_deleted = FALSE`,
      usernames,
    );

    const results: ProfileWithInsights[] = [];

    for (const row of profileRows) {
      const profile = this.mapRowToProfile(row);

      const [languageRows] = await pool.execute<LanguageRow[]>(
        'SELECT * FROM profile_languages WHERE profile_id = ?',
        [row.id],
      );

      const [repoRows] = await pool.execute<RepoRow[]>(
        'SELECT * FROM profile_repositories WHERE profile_id = ? ORDER BY stars DESC',
        [row.id],
      );

      results.push({
        ...profile,
        languages: languageRows.map((r) => this.mapRowToLanguage(r)),
        top_repositories: repoRows.map((r) => this.mapRowToRepository(r)),
      });
    }

    return results;
  }

  private sanitizeSortColumn(sortBy: string): string {
    const allowed: readonly string[] = ALLOWED_SORT_COLUMNS;
    return allowed.includes(sortBy) ? sortBy : 'analyzed_at';
  }

  private mapRowToProfile(row: ProfileRow): ProfileData {
    return {
      id: row.id,
      github_username: row.github_username,
      name: row.name,
      bio: row.bio,
      avatar_url: row.avatar_url,
      location: row.location,
      company: row.company,
      blog: row.blog,
      public_repos: row.public_repos,
      public_gists: row.public_gists,
      followers: row.followers,
      following: row.following,
      account_created_at: row.account_created_at,
      profile_url: row.profile_url,
      twitter_username: row.twitter_username,
      is_hireable: Boolean(row.is_hireable),
      account_type: row.account_type,
      follower_ratio: parseFloat(String(row.follower_ratio)),
      account_age_days: row.account_age_days,
      analyzed_at: row.analyzed_at,
      is_deleted: Boolean(row.is_deleted),
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private mapRowToLanguage(row: LanguageRow): LanguageData {
    return {
      id: row.id,
      profile_id: row.profile_id,
      language: row.language,
      bytes: row.bytes,
      percentage: parseFloat(String(row.percentage)),
    };
  }

  private mapRowToRepository(row: RepoRow): RepositoryData {
    return {
      id: row.id,
      profile_id: row.profile_id,
      repo_name: row.repo_name,
      description: row.description,
      stars: row.stars,
      forks: row.forks,
      open_issues: row.open_issues,
      primary_language: row.primary_language,
      is_fork: Boolean(row.is_fork),
      last_pushed_at: row.last_pushed_at,
      repo_url: row.repo_url,
    };
  }
}
