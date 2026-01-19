/**
 * API client functions for resource allocation endpoints
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface ResourceAllocation {
  id: string;
  projectKey: string;
  accountId: string;
  displayName: string;
  avatarUrl?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  allocationPercent: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CapacitySnapshot {
  id: string;
  projectKey: string;
  weekStart: string;
  teamCapacity: TeamCapacityData[];
  createdAt: Date;
}

export interface TeamCapacityData {
  accountId: string;
  displayName: string;
  avatarUrl?: string;
  plannedAllocation: number;
  actualHours: number;
  availableHours: number;
  utilizationPercent: number;
  status: 'optimal' | 'overloaded' | 'underloaded' | 'at-risk';
}

/**
 * Get all allocations for a project
 */
export async function getAllocations(
  projectKey: string,
  startDate?: string,
  endDate?: string
): Promise<ResourceAllocation[]> {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  
  const url = `${API_BASE}/api/projects/${projectKey}/allocations?${params}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch allocations: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Get current allocations for a specific week
 */
export async function getCurrentAllocations(
  projectKey: string,
  weekStart: string,
  weekEnd: string
): Promise<ResourceAllocation[]> {
  const params = new URLSearchParams({ weekStart, weekEnd });
  const url = `${API_BASE}/api/projects/${projectKey}/allocations/current?${params}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch current allocations: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Create a new allocation
 */
export async function createAllocation(
  projectKey: string,
  data: {
    accountId: string;
    displayName: string;
    avatarUrl?: string;
    startDate: string;
    endDate: string;
    allocationPercent: number;
    notes?: string;
  }
): Promise<ResourceAllocation> {
  const url = `${API_BASE}/api/projects/${projectKey}/allocations`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create allocation');
  }
  
  return response.json();
}

/**
 * Update an existing allocation
 */
export async function updateAllocation(
  projectKey: string,
  id: string,
  data: {
    startDate?: string;
    endDate?: string;
    allocationPercent?: number;
    notes?: string;
  }
): Promise<ResourceAllocation> {
  const url = `${API_BASE}/api/projects/${projectKey}/allocations/${id}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update allocation');
  }
  
  return response.json();
}

/**
 * Delete an allocation
 */
export async function deleteAllocation(
  projectKey: string,
  id: string
): Promise<void> {
  const url = `${API_BASE}/api/projects/${projectKey}/allocations/${id}`;
  const response = await fetch(url, { method: 'DELETE' });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete allocation');
  }
}

/**
 * Get historical capacity snapshots
 */
export async function getSnapshots(
  projectKey: string,
  limit?: number
): Promise<CapacitySnapshot[]> {
  const params = new URLSearchParams();
  if (limit) params.append('limit', limit.toString());
  
  const url = `${API_BASE}/api/projects/${projectKey}/allocations/snapshots?${params}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch snapshots: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Create a capacity snapshot
 */
export async function createSnapshot(
  projectKey: string,
  weekStart: string,
  weekEnd: string,
  worklogData: Record<string, number>
): Promise<CapacitySnapshot> {
  const url = `${API_BASE}/api/projects/${projectKey}/allocations/snapshots`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ weekStart, weekEnd, worklogData }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create snapshot');
  }
  
  return response.json();
}
