import { PrismaClient } from '@prisma/client';

/**
 * Repository for ResourceAllocation operations
 * Handles database access for capacity planning and allocation tracking
 */
export class AllocationRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get all allocations for a project, optionally filtered by date range
   */
  async getAllocations(projectKey: string, startDate?: string, endDate?: string) {
    const where: any = { projectKey };
    
    if (startDate && endDate) {
      // Find allocations that overlap with the given date range
      where.OR = [
        { AND: [{ startDate: { lte: endDate } }, { endDate: { gte: startDate } }] }
      ];
    }
    
    return this.prisma.resourceAllocation.findMany({
      where,
      orderBy: [{ startDate: 'asc' }, { displayName: 'asc' }]
    });
  }

  /**
   * Get allocation by ID
   */
  async getAllocationById(id: string) {
    return this.prisma.resourceAllocation.findUnique({
      where: { id }
    });
  }

  /**
   * Get current allocations for a specific week
   */
  async getCurrentAllocations(projectKey: string, weekStart: string, weekEnd: string) {
    return this.prisma.resourceAllocation.findMany({
      where: {
        projectKey,
        OR: [
          { AND: [{ startDate: { lte: weekEnd } }, { endDate: { gte: weekStart } }] }
        ]
      },
      orderBy: { displayName: 'asc' }
    });
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
    return this.prisma.resourceAllocation.create({
      data
    });
  }

  /**
   * Update an existing allocation
   */
  async updateAllocation(id: string, data: {
    startDate?: string;
    endDate?: string;
    allocationPercent?: number;
    notes?: string;
  }) {
    return this.prisma.resourceAllocation.update({
      where: { id },
      data
    });
  }

  /**
   * Delete an allocation
   */
  async deleteAllocation(id: string) {
    return this.prisma.resourceAllocation.delete({
      where: { id }
    });
  }

  /**
   * Create a capacity snapshot
   */
  async createSnapshot(projectKey: string, weekStart: string, teamCapacity: any) {
    return this.prisma.capacitySnapshot.create({
      data: {
        projectKey,
        weekStart,
        teamCapacity
      }
    });
  }

  /**
   * Get capacity snapshots for a project
   */
  async getSnapshots(projectKey: string, limit: number = 12) {
    return this.prisma.capacitySnapshot.findMany({
      where: { projectKey },
      orderBy: { weekStart: 'desc' },
      take: limit
    });
  }

  /**
   * Get a specific snapshot by week
   */
  async getSnapshotByWeek(projectKey: string, weekStart: string) {
    return this.prisma.capacitySnapshot.findFirst({
      where: { projectKey, weekStart }
    });
  }
}
