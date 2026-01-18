import type { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import { ProjectService } from '../services/projectService.js';
import {
  syncProjectsSchema,
  stakeholdersSchema,
  quickLinksSchema,
  savedFiltersSchema,
  overviewSchema,
} from '../validators/projectValidators.js';
import { ZodError } from 'zod';

/**
 * Controller for project-related endpoints
 * Extends BaseController for standardized response handling
 */
export class ProjectController extends BaseController {
  private projectService: ProjectService;

  constructor(projectService: ProjectService) {
    super();
    this.projectService = projectService;
  }

  /**
   * GET /api/projects
   * Get all projects
   */
  async getAllProjects(req: Request, res: Response): Promise<void> {
    try {
      const projects = await this.projectService.getAllProjects();
      this.handleSuccess(res, projects);
    } catch (error) {
      this.handleError(error, res, 'getAllProjects');
    }
  }

  /**
   * POST /api/projects/sync
   * Sync multiple projects
   */
  async syncProjects(req: Request, res: Response): Promise<void> {
    try {
      // Validate input
      const projects = syncProjectsSchema.parse(req.body);
      
      const result = await this.projectService.syncProjects(projects as any);
      this.handleSuccess(res, result);
    } catch (error) {
      if (error instanceof ZodError) {
        this.handleValidationError(res, error.issues[0]?.message || 'Invalid payload');
        return;
      }
      this.handleError(error, res, 'syncProjects');
    }
  }

  /**
   * GET /api/projects/:key/stakeholders
   * Get stakeholders for a project
   */
  async getStakeholders(req: Request, res: Response): Promise<void> {
    try {
      const key = typeof req.params.key === 'string' ? req.params.key : req.params.key?.[0];
      if (!key) {
        this.handleValidationError(res, 'Project key is required');
        return;
      }
      const stakeholders = await this.projectService.getStakeholders(key);
      this.handleSuccess(res, stakeholders);
    } catch (error) {
      this.handleError(error, res, 'getStakeholders');
    }
  }

  /**
   * POST /api/projects/:key/stakeholders
   * Save stakeholders for a project
   */
  async saveStakeholders(req: Request, res: Response): Promise<void> {
    try {
      const key = typeof req.params.key === 'string' ? req.params.key : req.params.key?.[0];
      if (!key) {
        this.handleValidationError(res, 'Project key is required');
        return;
      }
      
      // Validate input
      const stakeholders = stakeholdersSchema.parse(req.body);
      
      const result = await this.projectService.saveStakeholders(key, stakeholders);
      this.handleSuccess(res, result);
    } catch (error) {
      if (error instanceof ZodError) {
        this.handleValidationError(res, error.issues[0]?.message || 'Invalid data');
        return;
      }
      this.handleError(error, res, 'saveStakeholders');
    }
  }

  /**
   * GET /api/projects/:key/links
   * Get quick links for a project
   */
  async getQuickLinks(req: Request, res: Response): Promise<void> {
    try {
      const key = typeof req.params.key === 'string' ? req.params.key : req.params.key?.[0];
      if (!key) {
        this.handleValidationError(res, 'Project key is required');
        return;
      }
      const links = await this.projectService.getQuickLinks(key);
      this.handleSuccess(res, links);
    } catch (error) {
      this.handleError(error, res, 'getQuickLinks');
    }
  }

  /**
   * POST /api/projects/:key/links
   * Save quick links for a project
   */
  async saveQuickLinks(req: Request, res: Response): Promise<void> {
    try {
      const key = typeof req.params.key === 'string' ? req.params.key : req.params.key?.[0];
      if (!key) {
        this.handleValidationError(res, 'Project key is required');
        return;
      }
      
      // Validate input
      const links = quickLinksSchema.parse(req.body);
      
      const result = await this.projectService.saveQuickLinks(key, links);
      this.handleSuccess(res, result);
    } catch (error) {
      if (error instanceof ZodError) {
        this.handleValidationError(res, error.issues[0]?.message || 'Invalid data');
        return;
      }
      this.handleError(error, res, 'saveQuickLinks');
    }
  }

  /**
   * GET /api/projects/:key/filters
   * Get saved filters for a project
   */
  async getSavedFilters(req: Request, res: Response): Promise<void> {
    try {
      const key = typeof req.params.key === 'string' ? req.params.key : req.params.key?.[0];
      if (!key) {
        this.handleValidationError(res, 'Project key is required');
        return;
      }
      const filters = await this.projectService.getSavedFilters(key);
      this.handleSuccess(res, filters);
    } catch (error) {
      this.handleError(error, res, 'getSavedFilters');
    }
  }

  /**
   * POST /api/projects/:key/filters
   * Save filters for a project
   */
  async saveSavedFilters(req: Request, res: Response): Promise<void> {
    try {
      const key = typeof req.params.key === 'string' ? req.params.key : req.params.key?.[0];
      if (!key) {
        this.handleValidationError(res, 'Project key is required');
        return;
      }
      
      // Validate input
      const filters = savedFiltersSchema.parse(req.body);
      
      const result = await this.projectService.saveSavedFilters(key, filters);
      this.handleSuccess(res, result);
    } catch (error) {
      if (error instanceof ZodError) {
        this.handleValidationError(res, error.issues[0]?.message || 'Invalid data');
        return;
      }
      this.handleError(error, res, 'saveSavedFilters');
    }
  }

  /**
   * GET /api/projects/:key/overview
   * Get overview for a project
   */
  async getOverview(req: Request, res: Response): Promise<void> {
    try {
      const key = typeof req.params.key === 'string' ? req.params.key : req.params.key?.[0];
      if (!key) {
        this.handleValidationError(res, 'Project key is required');
        return;
      }
      const overview = await this.projectService.getOverview(key);
      this.handleSuccess(res, overview);
    } catch (error) {
      if (error instanceof Error && error.message === 'Overview not found') {
        this.handleNotFound(res, 'Overview');
        return;
      }
      this.handleError(error, res, 'getOverview');
    }
  }

  /**
   * POST /api/projects/:key/overview
   * Save overview for a project
   */
  async saveOverview(req: Request, res: Response): Promise<void> {
    try {
      const key = typeof req.params.key === 'string' ? req.params.key : req.params.key?.[0];
      if (!key) {
        this.handleValidationError(res, 'Project key is required');
        return;
      }
      
      // Validate input
      const data = overviewSchema.parse(req.body);
      
      const result = await this.projectService.saveOverview(key, data);
      this.handleSuccess(res, result);
    } catch (error) {
      if (error instanceof ZodError) {
        this.handleValidationError(res, error.issues[0]?.message || 'Invalid data');
        return;
      }
      this.handleError(error, res, 'saveOverview');
    }
  }
}
