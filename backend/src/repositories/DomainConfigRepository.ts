import { PrismaClient, DomainConfig } from '@prisma/client';

export class DomainConfigRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get domain configuration by domain name
   */
  async getByDomain(domain: string): Promise<DomainConfig | null> {
    return this.prisma.domainConfig.findUnique({
      where: { domain },
    });
  }

  /**
   * Get timezone for a domain (returns default if not found)
   */
  async getTimezone(domain: string): Promise<string> {
    const config = await this.getByDomain(domain);
    return config?.timezone || 'Asia/Bangkok'; // Default UTC+7
  }

  /**
   * Create or update domain configuration
   */
  async upsert(domain: string, timezone: string): Promise<DomainConfig> {
    return this.prisma.domainConfig.upsert({
      where: { domain },
      update: { timezone },
      create: { domain, timezone },
    });
  }

  /**
   * Get all domain configurations
   */
  async getAll(): Promise<DomainConfig[]> {
    return this.prisma.domainConfig.findMany({
      orderBy: { domain: 'asc' },
    });
  }

  /**
   * Delete a domain configuration
   */
  async delete(domain: string): Promise<DomainConfig> {
    return this.prisma.domainConfig.delete({
      where: { domain },
    });
  }
}
