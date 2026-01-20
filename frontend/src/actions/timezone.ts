'use server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export interface DomainConfig {
  domain: string;
  timezone: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Get timezone configuration for a domain
 */
export async function getDomainTimezone(domain: string): Promise<string> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/user-tracking/domain-config/${encodeURIComponent(domain)}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('Failed to fetch domain timezone:', response.statusText);
      return 'Asia/Bangkok'; // Default
    }

    const data = await response.json();
    return data.data?.timezone || 'Asia/Bangkok';
  } catch (error) {
    console.error('Error fetching domain timezone:', error);
    return 'Asia/Bangkok'; // Default
  }
}

/**
 * Update timezone configuration for a domain
 */
export async function updateDomainTimezone(domain: string, timezone: string): Promise<DomainConfig | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/user-tracking/domain-config/${encodeURIComponent(domain)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ timezone }),
    });

    if (!response.ok) {
      console.error('Failed to update domain timezone:', response.statusText);
      return null;
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error updating domain timezone:', error);
    return null;
  }
}

/**
 * Get all domain configurations
 */
export async function getAllDomainConfigs(): Promise<DomainConfig[]> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/user-tracking/domain-config`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('Failed to fetch domain configs:', response.statusText);
      return [];
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching domain configs:', error);
    return [];
  }
}

/**
 * Track a user login
 */
export async function trackUserLogin(data: {
  domain: string;
  userId: string;
  email?: string;
}): Promise<void> {
  try {
    await fetch(`${BACKEND_URL}/api/user-tracking/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  } catch (error) {
    // Silent fail - tracking shouldn't break the app
    console.error('Error tracking login:', error);
  }
}

/**
 * Get login statistics
 */
export async function getLoginStats(domain?: string, startDate?: string, endDate?: string) {
  try {
    const params = new URLSearchParams();
    if (domain) params.append('domain', domain);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await fetch(`${BACKEND_URL}/api/user-tracking/stats?${params.toString()}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('Failed to fetch login stats:', response.statusText);
      return null;
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error fetching login stats:', error);
    return null;
  }
}
