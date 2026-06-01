import {
  ProfileData,
  LanguageData,
  RepositoryData,
  ProfileWithInsights,
  ProfileListItem,
  ProfileQueryParams,
} from '../types';

export interface IProfileRepository {
  upsertProfile(profile: ProfileData): Promise<number>;

  replaceLanguages(profileId: number, languages: LanguageData[]): Promise<void>;

  replaceRepositories(profileId: number, repositories: RepositoryData[]): Promise<void>;

  findByUsername(username: string): Promise<ProfileWithInsights | null>;

  findAll(params: ProfileQueryParams): Promise<{ profiles: ProfileListItem[]; total: number }>;

  softDelete(username: string): Promise<boolean>;

  findByUsernames(usernames: string[]): Promise<ProfileWithInsights[]>;
}
