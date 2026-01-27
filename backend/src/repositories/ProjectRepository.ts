import type { PrismaClient, Project } from '@prisma/client';
import { logger } from '../utils/logger.js';

/**
 * Repository pattern for Project data access
 * Encapsulates all database operations for projects
 */
export class ProjectRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Find all projects
   */
  /**
   * Find all projects with pagination and filtering
   */
  async findAll(params?: {
    skip?: number;
    take?: number;
    search?: string;
    status?: string;
  }): Promise<Project[]> {
    const { skip, take, search, status } = params || {};
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { key: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.overview = {
        is: {
          projectStatus: status,
        },
      };
    }

    return this.prisma.project.findMany({
      skip,
      take,
      where,
      orderBy: { key: 'asc' },
    });
  }

  /**
   * Count projects matching filters
   */
  async count(params?: { search?: string; status?: string }): Promise<number> {
    const { search, status } = params || {};
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { key: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.overview = {
        is: {
          projectStatus: status,
        },
      };
    }

    return this.prisma.project.count({ where });
  }

  /**
   * Find a project by key
   */
  async findByKey(key: string): Promise<Project | null> {
    return this.prisma.project.findUnique({
      where: { key },
    });
  }

  /**
   * Upsert a project (create or update)
   */
  async upsert(data: {
    key: string;
    name: string;
    type?: string;
    avatarUrl?: string;
  }): Promise<Project> {
    return this.prisma.project.upsert({
      where: { key: data.key },
      update: {
        name: data.name,
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
      },
      create: {
        key: data.key,
        name: data.name,
        lead: 'Unassigned',
        type: data.type || 'Software',
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
        stakeholders: [],
        quickLinks: [],
        savedFilters: [],
      },
    });
  }

  /**
   * Update stakeholders for a project
   */
  async updateStakeholders(
    key: string,
    stakeholders: Array<{
      id: string;
      role: string;
      accountId?: string;
      displayName?: string;
      avatarUrl?: string;
    }>
  ): Promise<Project> {
    return this.prisma.project.update({
      where: { key },
      data: { stakeholders },
    });
  }

  /**
   * Update quick links for a project
   */
  async updateQuickLinks(
    key: string,
    quickLinks: Array<{
      id: string;
      name: string;
      url: string;
    }>
  ): Promise<Project> {
    return this.prisma.project.update({
      where: { key },
      data: { quickLinks },
    });
  }

  /**
   * Update saved filters for a project
   */
  async updateSavedFilters(
    key: string,
    savedFilters: Array<{
      id: string;
      name: string;
      jql: string;
      description?: string;
    }>
  ): Promise<Project> {
    return this.prisma.project.update({
      where: { key },
      data: { savedFilters },
    });
  }

  /**
   * Update overview for a project
   */
  async updateOverview(
    key: string,
    overview: {
      schdHealth?: string;
      complexity?: string;
      projectType?: string | null;
      projectStatus?: string | null;
      planStartDate?: string | null;
      planEndDate?: string | null;
      percentComplete?: string | null;
      clientLocation?: string | null;
      currentPhase?: string | null;
      bpwTargetMargin?: string | null;
      budget?: any;
      health?: any;
    }
  ): Promise<Project> {
    return this.prisma.project.update({
      where: { key },
      data: { overview },
    });
  }

  /**
   * Get project overview
   */
  async getOverview(key: string): Promise<any | null> {
    const project = await this.prisma.project.findUnique({
      where: { key },
      select: { overview: true },
    });
    return project?.overview || null;
  }
}
