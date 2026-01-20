import { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import { UserTrackingService } from '../services/userTrackingService.js';
import { TimezoneService } from '../services/timezoneService.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class UserTrackingController extends BaseController {
  private userTrackingService: UserTrackingService;
  private timezoneService: TimezoneService;

  constructor() {
    super();
    this.userTrackingService = new UserTrackingService(prisma);
    this.timezoneService = new TimezoneService(prisma);
  }

  /**
   * Track a user login manually
   * POST /api/user-tracking/login
   */
  async trackLogin(req: Request, res: Response) {
    try {
      const { domain, userId, email } = req.body;
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.get('user-agent');

      if (!domain || !userId) {
        return res.status(400).json({
          success: false,
          error: 'Domain and userId are required',
        });
      }

      const login = await this.userTrackingService.trackLogin({
        domain,
        userId,
        email,
        ipAddress,
        userAgent,
      });

      res.json({
        success: true,
        data: login,
      });
    } catch (error) {
      this.handleError(error, res, 'trackLogin');
    }
  }

  /**
   * Get login statistics
   * GET /api/user-tracking/stats?domain=xxx&startDate=xxx&endDate=xxx
   */
  async getStats(req: Request, res: Response) {
    try {
      const { domain, startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      let stats;
      if (domain) {
        stats = await this.userTrackingService.getDomainStats(
          domain as string,
          start,
          end
        );
      } else {
        stats = await this.userTrackingService.getAllDomainStats(start, end);
      }

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      this.handleError(error, res, 'getStats');
    }
  }

  /**
   * Get domain configuration
   * GET /api/domain-config/:domain
   */
  async getDomainConfig(req: Request, res: Response) {
    try {
      const domain = req.params.domain as string;

      const timezone = await this.timezoneService.getTimezoneForDomain(domain);

      res.json({
        success: true,
        data: {
          domain,
          timezone,
        },
      });
    } catch (error) {
      this.handleError(error, res, 'getDomainConfig');
    }
  }

  /**
   * Update domain configuration
   * PUT /api/domain-config/:domain
   */
  async updateDomainConfig(req: Request, res: Response) {
    try {
      const domain = req.params.domain as string;
      const { timezone } = req.body;

      if (!timezone) {
        return res.status(400).json({
          success: false,
          error: 'Timezone is required',
        });
      }

      const config = await this.timezoneService.setTimezoneForDomain(domain, timezone);

      res.json({
        success: true,
        data: config,
      });
    } catch (error) {
      this.handleError(error, res, 'updateDomainConfig');
    }
  }

  /**
   * Get all domain configurations
   * GET /api/domain-config
   */
  async getAllDomainConfigs(req: Request, res: Response) {
    try {
      const configs = await this.timezoneService.getAllDomainConfigs();

      res.json({
        success: true,
        data: configs,
      });
    } catch (error) {
      this.handleError(error, res, 'getAllDomainConfigs');
    }
  }
}
