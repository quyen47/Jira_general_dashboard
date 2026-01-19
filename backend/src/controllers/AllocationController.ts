import { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import { AllocationService } from '../services/allocationService.js';
import { 
  createAllocationSchema, 
  updateAllocationSchema, 
  dateRangeQuerySchema,
  snapshotQuerySchema 
} from '../validators/allocationValidators.js';
import { ZodError } from 'zod';

/**
 * Controller for resource allocation endpoints
 */
export class AllocationController extends BaseController {
  constructor(private allocationService: AllocationService) {
    super();
  }

  /**
   * GET /api/projects/:key/allocations
   * Get all allocations for a project, optionally filtered by date range
   */
  getAllocations = async (req: Request, res: Response): Promise<void> => {
    try {
      const key = Array.isArray(req.params.key) ? req.params.key[0] : req.params.key;
      if (!key) {
        return this.handleValidationError(res, 'Project key is required');
      }
      
      // Validate query parameters
      const queryValidation = dateRangeQuerySchema.safeParse(req.query);
      if (!queryValidation.success) {
        return this.handleValidationError(res, queryValidation.error.issues.map(i => i.message).join(', '));
      }

      const { startDate, endDate } = queryValidation.data;
      
      const allocations = await this.allocationService.getAllocations(
        key,
        startDate,
        endDate
      );

      this.handleSuccess(res, allocations);
    } catch (error) {
      this.handleError(error, res, 'getAllocations');
    }
  };

  /**
   * GET /api/projects/:key/allocations/current
   * Get current allocations for the current week
   */
  getCurrentAllocations = async (req: Request, res: Response): Promise<void> => {
    try {
      const key = Array.isArray(req.params.key) ? req.params.key[0] : req.params.key;
      const { weekStart, weekEnd } = req.query;

      if (!key || !weekStart || !weekEnd) {
        return this.handleValidationError(res, 'Project key, weekStart, and weekEnd are required');
      }

      const allocations = await this.allocationService.getCurrentAllocations(
        key,
        weekStart as string,
        weekEnd as string
      );

      this.handleSuccess(res, allocations);
    } catch (error) {
      this.handleError(error, res, 'getCurrentAllocations');
    }
  };

  /**
   * POST /api/projects/:key/allocations
   * Create a new allocation
   */
  createAllocation = async (req: Request, res: Response): Promise<void> => {
    try {
      const key = Array.isArray(req.params.key) ? req.params.key[0] : req.params.key;
      if (!key) {
        return this.handleValidationError(res, 'Project key is required');
      }

      // Validate request body
      const validation = createAllocationSchema.safeParse(req.body);
      if (!validation.success) {
        return this.handleValidationError(res, validation.error.issues.map(i => i.message).join(', '));
      }

      const allocation = await this.allocationService.createAllocation({
        projectKey: key,
        ...validation.data
      });

      this.handleCreated(res, allocation);
    } catch (error) {
      if (error instanceof Error && (error.message.includes('Allocation percent') || error.message.includes('date'))) {
        return this.handleValidationError(res, error.message);
      }
      this.handleError(error, res, 'createAllocation');
    }
  };

  /**
   * PUT /api/projects/:key/allocations/:id
   * Update an existing allocation
   */
  updateAllocation = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) {
        return this.handleValidationError(res, 'Allocation ID is required');
      }

      // Validate request body
      const validation = updateAllocationSchema.safeParse(req.body);
      if (!validation.success) {
        return this.handleValidationError(res, validation.error.issues.map(i => i.message).join(', '));
      }

      const allocation = await this.allocationService.updateAllocation(id, validation.data);

      this.handleSuccess(res, allocation);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Allocation percent')) {
        return this.handleValidationError(res, error.message);
      }
      this.handleError(error, res, 'updateAllocation');
    }
  };

  /**
   * DELETE /api/projects/:key/allocations/:id
   * Delete an allocation
   */
  deleteAllocation = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id) {
        return this.handleValidationError(res, 'Allocation ID is required');
      }

      await this.allocationService.deleteAllocation(id);

      this.handleSuccess(res, { message: 'Allocation deleted successfully' });
    } catch (error) {
      this.handleError(error, res, 'deleteAllocation');
    }
  };

  /**
   * GET /api/projects/:key/allocations/snapshots
   * Get historical capacity snapshots
   */
  getSnapshots = async (req: Request, res: Response): Promise<void> => {
    try {
      const key = Array.isArray(req.params.key) ? req.params.key[0] : req.params.key;
      if (!key) {
        return this.handleValidationError(res, 'Project key is required');
      }
      
      const queryValidation = snapshotQuerySchema.safeParse(req.query);
      if (!queryValidation.success) {
        return this.handleValidationError(res, queryValidation.error.issues.map(i => i.message).join(', '));
      }

      const { limit } = queryValidation.data;

      const snapshots = await this.allocationService.getSnapshots(key, limit);

      this.handleSuccess(res, snapshots);
    } catch (error) {
      this.handleError(error, res, 'getSnapshots');
    }
  };

  /**
   * POST /api/projects/:key/allocations/snapshots
   * Create a capacity snapshot for a specific week
   */
  createSnapshot = async (req: Request, res: Response): Promise<void> => {
    try {
      const key = Array.isArray(req.params.key) ? req.params.key[0] : req.params.key;
      const { weekStart, weekEnd, worklogData } = req.body;

      if (!key || !weekStart || !weekEnd || !worklogData) {
        return this.handleValidationError(res, 'Project key, weekStart, weekEnd, and worklogData are required');
      }

      const snapshot = await this.allocationService.generateSnapshot(
        key,
        weekStart,
        weekEnd,
        worklogData
      );

      this.handleCreated(res, snapshot);
    } catch (error) {
      this.handleError(error, res, 'createSnapshot');
    }
  };
}
