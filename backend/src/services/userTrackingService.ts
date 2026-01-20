import { PrismaClient } from '@prisma/client';
import { UserLoginRepository } from '../repositories/UserLoginRepository.js';

export class UserTrackingService {
  private userLoginRepo: UserLoginRepository;

  constructor(prisma: PrismaClient) {
    this.userLoginRepo = new UserLoginRepository(prisma);
  }

  /**
   * Track a user login
   */
  async trackLogin(data: {
    domain: string;
    userId: string;
    email?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    try {
      return await this.userLoginRepo.create(data);
    } catch (error) {
      console.error('Error tracking login:', error);
      // Don't throw - tracking should not break the app
      return null;
    }
  }

  /**
   * Get login statistics for a domain
   */
  async getDomainStats(domain: string, startDate?: Date, endDate?: Date) {
    return this.userLoginRepo.getStatsByDomain(domain, startDate, endDate);
  }

  /**
   * Get all domains with login statistics
   */
  async getAllDomainStats(startDate?: Date, endDate?: Date) {
    return this.userLoginRepo.getGroupedByDomain(startDate, endDate);
  }

  /**
   * Get user login history
   */
  async getUserHistory(userId: string, limit = 50) {
    return this.userLoginRepo.getByUserId(userId, limit);
  }

  /**
   * Extract domain from Jira base URL
   */
  extractDomain(baseUrl: string): string {
    try {
      const url = new URL(baseUrl);
      return url.hostname;
    } catch (error) {
      console.error('Error extracting domain from URL:', baseUrl, error);
      return 'unknown';
    }
  }
}
