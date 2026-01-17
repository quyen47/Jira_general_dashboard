const API_BASE = 'http://localhost:3001/api';

export async function getDashboardData(projectKey: string) {
    // In a real app, we might have a single endpoint for all data, 
    // but here we can fetch them in parallel or rely on individual component fetching.
    // For now, let's keep component-level fetching as they were independent.
    // But this function might be useful for a "Resolve All" or initial load if needed.
    return {};
}

// --- Stakeholders ---
export async function getStakeholders(projectKey: string) {
    const res = await fetch(`${API_BASE}/projects/${projectKey}/stakeholders`);
    if (!res.ok) throw new Error('Failed to fetch stakeholders');
    return res.json();
}

export async function saveStakeholders(projectKey: string, stakeholders: any[]) {
    const res = await fetch(`${API_BASE}/projects/${projectKey}/stakeholders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stakeholders)
    });
    if (!res.ok) throw new Error('Failed to save stakeholders');
    return res.json();
}

// --- Quick Links ---
export async function getLinks(projectKey: string) {
    const res = await fetch(`${API_BASE}/projects/${projectKey}/links`);
    if (!res.ok) throw new Error('Failed to fetch links');
    return res.json();
}

export async function saveLinks(projectKey: string, links: any[]) {
    const res = await fetch(`${API_BASE}/projects/${projectKey}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(links)
    });
    if (!res.ok) throw new Error('Failed to save links');
    return res.json();
}

// --- Filters ---
export async function getFilters(projectKey: string) {
    const res = await fetch(`${API_BASE}/projects/${projectKey}/filters`);
    if (!res.ok) throw new Error('Failed to fetch filters');
    return res.json();
}

export async function saveFilters(projectKey: string, filters: any[]) {
    const res = await fetch(`${API_BASE}/projects/${projectKey}/filters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters)
    });
    if (!res.ok) throw new Error('Failed to save filters');
    return res.json();
}

// --- Overview ---
export async function getOverview(projectKey: string) {
    const res = await fetch(`${API_BASE}/projects/${projectKey}/overview`);
    // 404 might mean no data yet, so return null
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Failed to fetch overview');
    
    const data = await res.json();
    return data;
}

export async function saveOverview(projectKey: string, data: any) {
    const res = await fetch(`${API_BASE}/projects/${projectKey}/overview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to save overview');
    return res.json();
}
