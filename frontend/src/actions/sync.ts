'use server';

import { getJiraClient } from '@/lib/jira';
import { revalidatePath } from 'next/cache';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001/api';

export async function syncProjectsAction() {
  try {
    console.log('[Sync Action] Starting sync...');
    const jira = await getJiraClient();
    
    // Fetch all projects from Jira (pagination loop might be needed if > 50)
    // Jira default maxResults is usually 50. We should fetch all.
    let projects: any[] = [];
    let startAt = 0;
    const maxResults = 50;
    let isLast = false;

    while (!isLast) {
      console.log(`[Sync Action] Fetching Jira projects startAt=${startAt}`);
      const result: any = await jira.projects.searchProjects({
        startAt,
        maxResults,
      });
      
      const page = Array.isArray(result) ? result : (result.values || []);
      if (page.length === 0) {
        isLast = true;
      } else {
        projects = [...projects, ...page];
        if (result.isLast || page.length < maxResults) {
          isLast = true;
        } else {
          startAt += maxResults;
        }
      }
    }
    
    console.log(`[Sync Action] Fetched ${projects.length} projects from Jira.`);

    // Transform for backend
    const payload = projects.map((p: any) => ({
      key: p.key,
      name: p.name,
      projectTypeKey: p.projectTypeKey,
      avatarUrl: p.avatarUrls?.['48x48'] || p.avatarUrl
    }));

    // Send to backend
    const res = await fetch(`${API_BASE}/projects/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`Backend sync failed: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    console.log('[Sync Action] Sync success:', data);

    revalidatePath('/');
    return { success: true, count: data.count };
  } catch (error) {
    console.error('[Sync Action] Error:', error);
    return { success: false, error: String(error) };
  }
}
