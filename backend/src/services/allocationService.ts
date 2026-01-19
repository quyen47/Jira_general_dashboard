import { AllocationRepository } from '../repositories/AllocationRepository.js';

/**
 * Service layer for resource allocation and capacity planning
 * Contains business logic for allocation calculations and status determination
 */
export class AllocationService {
  constructor(private allocationRepository: AllocationRepository) {}

  /**
   * Get all allocations for a project
   */
  async getAllocations(projectKey: string, startDate?: string, endDate?: string) {
    return this.allocationRepository.getAllocations(projectKey, startDate, endDate);
  }

  /**
   * Get current allocations for a specific week
   */
  async getCurrentAllocations(projectKey: string, weekStart: string, weekEnd: string) {
    return this.allocationRepository.getCurrentAllocations(projectKey, weekStart, weekEnd);
  }

  /**
   * Create a new allocation
   */
  async createAllocation(data: {
    projectKey: string;
    accountId: string;
    displayName: string;
    avatarUrl?: string;
    startDate: string;
    endDate: string;
    allocationPercent: number;
    notes?: string;
  }) {
    // Validate allocation percent
    if (data.allocationPercent < 0 || data.allocationPercent > 200) {
      throw new Error('Allocation percent must be between 0 and 200');
    }

    // Validate dates
    if (new Date(data.startDate) > new Date(data.endDate)) {
      throw new Error('Start date must be before or equal to end date');
    }

    return this.allocationRepository.createAllocation(data);
  }

  /**
   * Update an allocation
   */
  async updateAllocation(id: string, data: {
    startDate?: string;
    endDate?: string;
    allocationPercent?: number;
    notes?: string;
  }) {
    // Validate allocation percent if provided
    if (data.allocationPercent !== undefined) {
      if (data.allocationPercent < 0 || data.allocationPercent > 200) {
        throw new Error('Allocation percent must be between 0 and 200');
      }
    }

    return this.allocationRepository.updateAllocation(id, data);
  }

  /**
   * Delete an allocation
   */
  async deleteAllocation(id: string) {
    return this.allocationRepository.deleteAllocation(id);
  }

  /**
   * Calculate available hours based on allocation % and number of work days
   * @param allocationPercent - Allocation percentage (0-200)
   * @param workDays - Number of work days in the period
   * @returns Available hours
   */
  calculateAvailableHours(allocationPercent: number, workDays: number): number {
    const hoursPerDay = 8;
    return (workDays * (allocationPercent / 100) * hoursPerDay);
  }

  /**
   * Calculate utilization percentage
   * @param actualHours - Actual hours logged
   * @param availableHours - Available hours based on allocation
   * @returns Utilization percentage
   */
  calculateUtilization(actualHours: number, availableHours: number): number {
    if (availableHours === 0) return 0;
    return (actualHours / availableHours) * 100;
  }

  /**
   * Determine capacity status based on utilization and allocation
   * @param utilizationPercent - Utilization percentage
   * @param allocationPercent - Allocation percentage
   * @returns Status: 'optimal' | 'overloaded' | 'underloaded' | 'at-risk'
   */
  determineStatus(utilizationPercent: number, allocationPercent: number): string {
    // Overloaded: allocation > 100% OR utilization > 100%
    if (allocationPercent > 100 || utilizationPercent > 100) {
      return 'overloaded';
    }

    // At risk: utilization between 100-120%
    if (utilizationPercent >= 100 && utilizationPercent <= 120) {
      return 'at-risk';
    }

    // Underloaded: allocation < 50% OR utilization < 50%
    if (allocationPercent < 50 || utilizationPercent < 50) {
      return 'underloaded';
    }

    // Optimal: 80-100% utilization
    if (utilizationPercent >= 80 && utilizationPercent <= 100) {
      return 'optimal';
    }

    // Default to optimal for 50-80% range
    return 'optimal';
  }

  /**
   * Calculate number of work days between two dates (excluding weekends)
   */
  calculateWorkDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let workDays = 0;

    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay();
      // 0 = Sunday, 6 = Saturday
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workDays++;
      }
      current.setDate(current.getDate() + 1);
    }

    return workDays;
  }

  /**
   * Generate a capacity snapshot for a specific week
   */
  async generateSnapshot(projectKey: string, weekStart: string, weekEnd: string, worklogData: any) {
    // Get allocations for this week
    const allocations = await this.getCurrentAllocations(projectKey, weekStart, weekEnd);
    
    // Calculate work days in the week
    const workDays = this.calculateWorkDays(weekStart, weekEnd);

    // Build team capacity data
    const teamCapacity = allocations.map(allocation => {
      const availableHours = this.calculateAvailableHours(allocation.allocationPercent, workDays);
      
      // Get actual hours from worklog data
      const actualHours = worklogData[allocation.accountId] || 0;
      
      const utilizationPercent = this.calculateUtilization(actualHours, availableHours);
      const status = this.determineStatus(utilizationPercent, allocation.allocationPercent);

      return {
        accountId: allocation.accountId,
        displayName: allocation.displayName,
        avatarUrl: allocation.avatarUrl,
        plannedAllocation: allocation.allocationPercent,
        actualHours: Math.round(actualHours * 10) / 10,
        availableHours: Math.round(availableHours * 10) / 10,
        utilizationPercent: Math.round(utilizationPercent * 10) / 10,
        status
      };
    });

    // Save snapshot
    return this.allocationRepository.createSnapshot(projectKey, weekStart, teamCapacity);
  }

  /**
   * Get historical snapshots
   */
  async getSnapshots(projectKey: string, limit?: number) {
    return this.allocationRepository.getSnapshots(projectKey, limit);
  }
}
