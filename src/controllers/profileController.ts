import { Request, Response } from 'express';
import { IProfileService } from '../interfaces/IProfileService';
import {
  ProfileQueryParams,
  SingleResponse,
  PaginatedResponse,
  ProfileWithInsights,
  ProfileListItem,
} from '../types';

export class ProfileController {
  constructor(private readonly profileService: IProfileService) {}

  // fetch data from github, analyze and store it 
  analyzeProfile = async (req: Request, res: Response): Promise<void> => {
    const username = req.params.username as string;
    const result = await this.profileService.analyzeProfile(username);

    const response: SingleResponse<ProfileWithInsights> = {
      success: true,
      data: result,
    };
    res.status(201).json(response);
  };

  // get profiles from db along with pagination
  listProfiles = async (req: Request, res: Response): Promise<void> => {
    const params: ProfileQueryParams = {
      page: Math.max(1, parseInt(req.query.page as string, 10) || 1),
      limit: Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 10)),
      search: req.query.search as string | undefined,
      sortBy: (req.query.sortBy as string) || 'analyzed_at',
      order: (req.query.order as 'asc' | 'desc') === 'asc' ? 'asc' : 'desc',
    };

    const { profiles, total } = await this.profileService.listProfiles(params);

    const response: PaginatedResponse<ProfileListItem> = {
      success: true,
      data: profiles,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
      },
    };
    res.json(response);
  };

  // fetch record per username
  getProfile = async (req: Request, res: Response): Promise<void> => {
    const username = req.params.username as string;
    const result = await this.profileService.getProfile(username);

    const response: SingleResponse<ProfileWithInsights> = {
      success: true,
      data: result,
    };
    res.json(response);
  };

  // soft delete a row
  deleteProfile = async (req: Request, res: Response): Promise<void> => {
    const username = req.params.username as string;
    await this.profileService.deleteProfile(username);
    res.status(200).json({ success: true, message: `Profile "${username}" deleted successfully` });
  };

  // compare the things with others
  compareProfiles = async (req: Request, res: Response): Promise<void> => {
    const { usernames } = req.body as { usernames: string[] };
    const results = await this.profileService.compareProfiles(usernames);

    const response: SingleResponse<ProfileWithInsights[]> = {
      success: true,
      data: results,
    };
    res.json(response);
  };
}
