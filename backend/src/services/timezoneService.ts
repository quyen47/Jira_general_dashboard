import { PrismaClient } from '@prisma/client';
import { DomainConfigRepository } from '../repositories/DomainConfigRepository.js';

export class TimezoneService {
  private domainConfigRepo: DomainConfigRepository;

  constructor(prisma: PrismaClient) {
    this.domainConfigRepo = new DomainConfigRepository(prisma);
  }

  /**
   * Get timezone for a domain
   */
  async getTimezoneForDomain(domain: string): Promise<string> {
    return this.domainConfigRepo.getTimezone(domain);
  }

  /**
   * Set timezone for a domain
   */
  async setTimezoneForDomain(domain: string, timezone: string) {
    return this.domainConfigRepo.upsert(domain, timezone);
  }

  /**
   * Get all domain configurations
   */
  async getAllDomainConfigs() {
    return this.domainConfigRepo.getAll();
  }

  /**
   * Convert a date to a specific timezone
   * Returns ISO string in the target timezone
   */
  convertToTimezone(date: Date, timezone: string): string {
    try {
      return date.toLocaleString('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    } catch (error) {
      console.error(`Error converting date to timezone ${timezone}:`, error);
      return date.toISOString();
    }
  }

  /**
   * Get timezone offset in hours for a given timezone
   */
  getTimezoneOffset(timezone: string): number {
    try {
      const now = new Date();
      const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
      const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
      return (tzDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60);
    } catch (error) {
      console.error(`Error getting timezone offset for ${timezone}:`, error);
      return 7; // Default to UTC+7
    }
  }

  /**
   * Format a date in a specific timezone (YYYY-MM-DD)
   */
  formatDateInTimezone(date: Date, timezone: string): string {
    try {
      const options: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      };
      
      const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(date);
      const year = parts.find(p => p.type === 'year')?.value;
      const month = parts.find(p => p.type === 'month')?.value;
      const day = parts.find(p => p.type === 'day')?.value;
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error(`Error formatting date in timezone ${timezone}:`, error);
      return date.toISOString().split('T')[0];
    }
  }

  /**
   * Adjust a date string from one timezone to another
   * Input: date string in source timezone (YYYY-MM-DD)
   * Output: equivalent date string in target timezone (YYYY-MM-DD)
   */
  adjustDateBetweenTimezones(
    dateString: string,
    sourceTimezone: string,
    targetTimezone: string
  ): string {
    try {
      // Parse the date in the source timezone
      const [year, month, day] = dateString.split('-').map(Number);
      const sourceDate = new Date(year, month - 1, day, 12, 0, 0); // Use noon to avoid edge cases
      
      // Format in target timezone
      return this.formatDateInTimezone(sourceDate, targetTimezone);
    } catch (error) {
      console.error('Error adjusting date between timezones:', error);
      return dateString;
    }
  }
}
