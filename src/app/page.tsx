import { getJiraClient } from '@/lib/jira';
import { logout } from '@/actions/login';
import { redirect } from 'next/navigation';
import Link from 'next/link';

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
      <header className="header">
        <h1>Projects Overview</h1>
        <Link href="/jql" style={{ 
            padding: '8px 16px', 
            background: '#0052cc', 
            color: 'white', 
            borderRadius: 4, 
            textDecoration: 'none',
            fontSize: '0.9rem',
            fontWeight: 500
        }}>
            Analyze with JQL
        </Link>
        <form action={logout}>
          <button type="submit" className="logout-btn">Logout</button>
        </form>
      </header>

      <div className="project-grid">
        {projects.map((project) => (
          <Link href={`/project/${project.key}`} key={project.key} className="project-card">
            <div className="project-header">
              {project.avatarUrls?.['48x48'] && (
                <img 
                  src={project.avatarUrls['48x48']} 
                  alt={project.name} 
                  className="project-avatar" 
                />
              )}
              <div className="project-info">
                <h3>{project.name}</h3>
                <div className="project-key">{project.key}</div>
              </div>
            </div>
            <div className="project-stats">
              <span>{project.projectTypeKey}</span>
              {project.lead && (
                <span>Lead: {project.lead.displayName}</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
