import {
  ProfileWithInsights,
  ProfileListItem,
  ProfileQueryParams,
} from '../types';

export interface IProfileService {
  analyzeProfile(username: string): Promise<ProfileWithInsights>;

  getProfile(username: string): Promise<ProfileWithInsights>;

  listProfiles(params: ProfileQueryParams): Promise<{ profiles: ProfileListItem[]; total: number }>;

  deleteProfile(username: string): Promise<void>;

  compareProfiles(usernames: string[]): Promise<ProfileWithInsights[]>;
}
