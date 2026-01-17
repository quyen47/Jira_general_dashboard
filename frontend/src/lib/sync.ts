const API_BASE = 'http://localhost:3001/api';

export async function syncProjectsWithBackend(projects: any[]) {
    try {
        console.log(`[Sync] Syncing ${projects.length} projects with backend...`);
        const payload = projects.map((p: any) => ({
            key: p.key,
            name: p.name,
            projectTypeKey: p.projectTypeKey,
            avatarUrl: p.avatarUrls?.['48x48'] || p.avatarUrl
        }));

        const res = await fetch(`${API_BASE}/projects/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            console.error('[Sync] Backend returned error:', res.status, await res.text());
        } else {
            const data = await res.json();
            console.log('[Sync] Success:', data);
        }
    } catch (e) {
        console.error('[Sync] Failed to sync projects:', e);
    }
}
