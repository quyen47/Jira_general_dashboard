import { z } from 'zod';

/**
 * Validation schemas for resource allocation endpoints
 */

export const createAllocationSchema = z.object({
  accountId: z.string().min(1, 'Account ID is required'),
  displayName: z.string().min(1, 'Display name is required'),
  avatarUrl: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format'),
  allocationPercent: z.number().int().min(0).max(200, 'Allocation must be between 0 and 200'),
  notes: z.string().optional()
});

export const updateAllocationSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format').optional(),
  allocationPercent: z.number().int().min(0).max(200, 'Allocation must be between 0 and 200').optional(),
  notes: z.string().optional()
});

export const dateRangeQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

export const snapshotQuerySchema = z.object({
  limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().min(1).max(52)).optional()
});
