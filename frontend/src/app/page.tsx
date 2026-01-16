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
    // Fetch all projects
    const result: any = await jira.projects.searchProjects({});
    projects = Array.isArray(result) ? result : (result.values || []);
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
