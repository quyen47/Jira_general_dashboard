import { getJiraClient } from '@/lib/jira';
import { logout } from '@/actions/login';
import { redirect } from 'next/navigation';
import Link from 'next/link';

import ProjectTable from '@/components/ProjectListTable';
import PortfolioSummary from '@/components/PortfolioSummary';

export default async function Home() {
  let projects: any[] = [];
  
  try {
    const jira = await getJiraClient();
    console.log("[Projects Overview] Fetching project list...");
    console.log("[Projects Overview] API Call: jira.projects.searchProjects({})");
    
    // Fetch all projects
    const result: any = await jira.projects.searchProjects({});
    projects = Array.isArray(result) ? result : (result.values || []);
    
    console.log(`[Projects Overview] Received ${projects.length} projects.`);
    if (projects.length > 0) {
        console.log("[Projects Overview] Keys:", projects.map((p:any) => p.key).join(', '));
        
        // Sync with backend (fire and forget to not block UI, or await if critical)
        // Since we are in a server component (async function), we can await it.
        // However, we want the UI to load fast. But sync is fast. Let's await to ensure consistency.
        const { syncProjectsWithBackend } = await import('@/lib/sync');
        await syncProjectsWithBackend(projects);
    }
  } catch (e) {
    // If not authorized or error, redirect to login
    redirect('/login');
  }

  return (
    <div className="dashboard-container">
      <header className="header" style={{ marginBottom: '20px' }}>
        <h1>Projects Overview</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
            <form action={logout}>
            <button type="submit" className="logout-btn">Logout</button>
            </form>
        </div>
      </header>

      <PortfolioSummary projects={projects} />
      <ProjectTable projects={projects} />
    </div>
  );
}
