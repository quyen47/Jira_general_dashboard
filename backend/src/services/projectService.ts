import { ProjectRepository } from '../repositories/ProjectRepository.js';
import { logger } from '../utils/logger.js';
import type { Project } from '@prisma/client';

/**
 * Service layer for project business logic
 * Depends on ProjectRepository via dependency injection
 */
export class ProjectService {
  private repository: ProjectRepository;

  constructor(repository: ProjectRepository) {
    this.repository = repository;
  }

  /**
   * Get all projects
   */
  async getAllProjects(): Promise<Project[]> {
    logger.info('Fetching all projects');
    return this.repository.findAll();
  }

  /**
   * Sync multiple projects
   */
  async syncProjects(
    projects: Array<{
      key: string;
      name: string;
      projectTypeKey?: string;
      avatarUrl?: string;
      avatarUrls?: Record<string, string>;
    }>
  ): Promise<{ success: boolean; count: number }> {
    logger.info(`Syncing ${projects.length} projects`);

    for (const project of projects) {
      const avatarUrl = project.avatarUrls?.['48x48'] || project.avatarUrl;
      
      await this.repository.upsert({
        key: project.key,
        name: project.name,
        type: project.projectTypeKey,
        ...(avatarUrl !== undefined && { avatarUrl }),
      });
    }

    return { success: true, count: projects.length };
  }

  /**
   * Get stakeholders for a project
   */
  async getStakeholders(key: string): Promise<any[]> {
    const project = await this.repository.findByKey(key);
    return project?.stakeholders || [];
  }

  /**
   * Save stakeholders for a project
   */
  async saveStakeholders(
    key: string,
    stakeholders: Array<{
      id?: string;
      role: string;
      accountId?: string;
      displayName?: string;
      avatarUrl?: string;
      user?: {
        accountId?: string;
        displayName?: string;
        avatarUrl?: string;
      };
    }>
  ): Promise<any[]> {
    // Transform and normalize stakeholder data
    const normalizedStakeholders = stakeholders.map((s) => ({
      id: s.id || Math.random().toString(36).substr(2, 9),
      role: s.role,
      ...(s.user?.accountId && { accountId: s.user.accountId }),
      ...(s.accountId && { accountId: s.accountId }),
      ...(s.user?.displayName && { displayName: s.user.displayName }),
      ...(s.displayName && { displayName: s.displayName }),
      ...(s.user?.avatarUrl && { avatarUrl: s.user.avatarUrl }),
      ...(s.avatarUrl && { avatarUrl: s.avatarUrl }),
    }));

    const project = await this.repository.updateStakeholders(key, normalizedStakeholders);
    return project.stakeholders;
  }

  /**
   * Get quick links for a project
   */
  async getQuickLinks(key: string): Promise<any[]> {
    const project = await this.repository.findByKey(key);
    return project?.quickLinks || [];
  }

  /**
   * Save quick links for a project
   */
  async saveQuickLinks(
    key: string,
    links: Array<{
      id?: string;
      name: string;
      url: string;
    }>
  ): Promise<any[]> {
    const normalizedLinks = links.map((l) => ({
      id: l.id || Math.random().toString(36).substr(2, 9),
      name: l.name,
      url: l.url,
    }));

    const project = await this.repository.updateQuickLinks(key, normalizedLinks);
    return project.quickLinks;
  }

  /**
   * Get saved filters for a project
   */
  async getSavedFilters(key: string): Promise<any[]> {
    const project = await this.repository.findByKey(key);
    return project?.savedFilters || [];
  }

  /**
   * Save filters for a project
   */
  async saveSavedFilters(
    key: string,
    filters: Array<{
      id?: string;
      name: string;
      jql: string;
      description?: string;
    }>
  ): Promise<any[]> {
    const normalizedFilters = filters.map((f) => ({
      id: f.id || Math.random().toString(36).substr(2, 9),
      name: f.name,
      jql: f.jql,
      description: f.description || '',
    }));

    const project = await this.repository.updateSavedFilters(key, normalizedFilters);
    return project.savedFilters;
  }

  /**
   * Get overview for a project
   */
  async getOverview(key: string): Promise<any> {
    const overview = await this.repository.getOverview(key);
    if (!overview) {
      throw new Error('Overview not found');
    }
    return overview;
  }

  /**
   * Save overview for a project
   */
  async saveOverview(
    key: string,
    data: {
      overview?: any;
      budget?: any;
      health?: any;
    }
  ): Promise<any> {
    const ov = data.overview || {};

    const overviewData = {
      schdHealth: ov.schdHealth || 'yellow',
      complexity: ov.complexity || 'Medium',
      projectType: ov.projectType || null,
      projectStatus: ov.projectStatus || null,
      planStartDate: ov.planStartDate || null,
      planEndDate: ov.planEndDate || null,
      percentComplete: ov.percentComplete || null,
      clientLocation: ov.clientLocation || null,
      currentPhase: ov.currentPhase || null,
      bpwTargetMargin: ov.bpwTargetMargin || null,
      budget: data.budget || {},
      health: data.health || {},
    };

    await this.repository.updateOverview(key, overviewData);
    
    // Return the updated overview
    return this.repository.getOverview(key);
  }
}
