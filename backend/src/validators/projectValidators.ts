import { z } from 'zod';

// Stakeholder validation schema
export const stakeholderSchema = z.object({
  id: z.string().optional(),
  role: z.string().min(1, 'Role is required'),
  accountId: z.string().optional(),
  displayName: z.string().optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')).optional(),
  user: z.object({
    accountId: z.string().optional(),
    displayName: z.string().optional(),
    avatarUrl: z.string().optional(),
  }).optional(),
});

export const stakeholdersSchema = z.array(stakeholderSchema);

// Quick Link validation schema
export const quickLinkSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  url: z.string().url('Invalid URL format'),
});

export const quickLinksSchema = z.array(quickLinkSchema);

// Saved Filter validation schema
export const savedFilterSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  jql: z.string().min(1, 'JQL is required'),
  description: z.string().optional(),
});

export const savedFiltersSchema = z.array(savedFilterSchema);

// Project sync validation schema
export const syncProjectSchema = z.object({
  key: z.string().min(1, 'Project key is required'),
  name: z.string().min(1, 'Project name is required'),
  projectTypeKey: z.string().optional(),
  avatarUrl: z.string().optional(),
  avatarUrls: z.record(z.string(), z.string()).optional(),
});

export const syncProjectsSchema = z.array(syncProjectSchema);

// Overview validation schema
export const overviewSchema = z.object({
  overview: z.object({
    schdHealth: z.string().optional(),
    complexity: z.string().optional(),
    projectType: z.string().nullish(),
    projectStatus: z.string().nullish(),
    planStartDate: z.string().nullish(),
    planEndDate: z.string().nullish(),
    percentComplete: z.string().nullish(),
    clientLocation: z.string().nullish(),
    currentPhase: z.string().nullish(),
    bpwTargetMargin: z.string().nullish(),
  }).optional(),
  budget: z.record(z.string(), z.any()).optional(),
  health: z.record(z.string(), z.any()).optional(),
});

// Type exports
export type StakeholderInput = z.infer<typeof stakeholderSchema>;
export type QuickLinkInput = z.infer<typeof quickLinkSchema>;
export type SavedFilterInput = z.infer<typeof savedFilterSchema>;
export type SyncProjectInput = z.infer<typeof syncProjectSchema>;
export type OverviewInput = z.infer<typeof overviewSchema>;
