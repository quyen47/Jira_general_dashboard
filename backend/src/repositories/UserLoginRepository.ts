import { PrismaClient, UserLogin } from '@prisma/client';

export class UserLoginRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new user login record
   */
  async create(data: {
    domain: string;
    userId: string;
    email?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<UserLogin> {
    return this.prisma.userLogin.create({
      data,
    });
  }

  /**
   * Get login statistics for a domain
   */
  async getStatsByDomain(domain: string, startDate?: Date, endDate?: Date) {
    const where: any = { domain };
    
    if (startDate || endDate) {
      where.loginAt = {};
      if (startDate) where.loginAt.gte = startDate;
      if (endDate) where.loginAt.lte = endDate;
    }

    const [totalLogins, uniqueUsers, recentLogins] = await Promise.all([
      // Total login count
      this.prisma.userLogin.count({ where }),
      
      // Unique user count
      this.prisma.userLogin.findMany({
        where,
        select: { userId: true },
        distinct: ['userId'],
      }),
      
      // Recent 10 logins
      this.prisma.userLogin.findMany({
        where,
        orderBy: { loginAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      totalLogins,
      uniqueUsers: uniqueUsers.length,
      recentLogins,
    };
  }

  /**
   * Get all logins for a specific user
   */
  async getByUserId(userId: string, limit = 50): Promise<UserLogin[]> {
    return this.prisma.userLogin.findMany({
      where: { userId },
      orderBy: { loginAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get logins grouped by domain
   */
  async getGroupedByDomain(startDate?: Date, endDate?: Date) {
    const where: any = {};
    
    if (startDate || endDate) {
      where.loginAt = {};
      if (startDate) where.loginAt.gte = startDate;
      if (endDate) where.loginAt.lte = endDate;
    }

    const logins = await this.prisma.userLogin.findMany({
      where,
      select: {
        domain: true,
        userId: true,
        loginAt: true,
      },
    });

    // Group by domain
    const grouped = logins.reduce((acc, login) => {
      if (!acc[login.domain]) {
        acc[login.domain] = {
          domain: login.domain,
          loginCount: 0,
          uniqueUsers: new Set(),
          lastLogin: login.loginAt,
        };
      }
      
      acc[login.domain].loginCount++;
      acc[login.domain].uniqueUsers.add(login.userId);
      
      if (login.loginAt > acc[login.domain].lastLogin) {
        acc[login.domain].lastLogin = login.loginAt;
      }
      
      return acc;
    }, {} as Record<string, any>);

    // Convert to array and format
    return Object.values(grouped).map((item: any) => ({
      domain: item.domain,
      loginCount: item.loginCount,
      uniqueUsers: item.uniqueUsers.size,
      lastLogin: item.lastLogin,
    }));
  }
}
