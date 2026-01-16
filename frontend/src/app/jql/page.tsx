import { getJiraClient } from '@/lib/jira';
import Link from 'next/link';
import { StatusChart, PriorityChart } from '@/components/IssueCharts';
import { redirect } from 'next/navigation';

export default async function JqlPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const jql = q || '';

  let issues: any[] = [];
  let stats = {
    total: 0,
    byStatus: {} as Record<string, number>,
    byPriority: {} as Record<string, number>,
  };
  let error = null;

  if (jql) {
    try {
        const jira = await getJiraClient();
        
        // Fetch data based on JQL
        const [search, count] = await Promise.all([
            jira.issueSearch.searchForIssuesUsingJqlEnhancedSearchPost({
                jql: jql,
                maxResults: 100, // Limit for visualization
                fields: ['status', 'priority', 'assignee', 'summary', 'created']
            }),
            jira.issueSearch.countIssues({
                jql: jql
            })
        ]);

        issues = search.issues || [];
        stats.total = (count as any).total || 0;

        // Aggregate stats
        issues.forEach(issue => {
             // Status
            const status = issue.fields.status?.name || 'Unknown';
            stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

            // Priority
            const priority = issue.fields.priority?.name || 'None';
            stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1;
        });

    } catch (e: any) {
        console.error(e);
        error = e?.message || "Failed to execute JQL query";
    }
  }

  const statusData = Object.entries(stats.byStatus).map(([name, value]) => ({ name, value }));
  const priorityData = Object.entries(stats.byPriority).map(([name, value]) => ({ name, value }));

  return (
    <div className="dashboard-container">
      <header className="header" style={{ marginBottom: '2rem' }}>
        <div>
          <Link href="/" className="back-link">← Back to Dashboard</Link>
          <h1 style={{ marginTop: '0.5rem' }}>Custom JQL Analysis</h1>
        </div>
      </header>

      <div style={{ background: 'white', padding: '1.5rem', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
        <form action={async (formData) => {
            'use server';
            const query = formData.get('jql');
            if (query) redirect(`/jql?q=${encodeURIComponent(query.toString())}`);
        }} style={{ display: 'flex', gap: '1rem' }}>
            <input 
                name="jql" 
                defaultValue={jql} 
                placeholder="e.g. project = MYPROJ AND status = 'In Progress'" 
                style={{ 
                    flex: 1, 
                    padding: '10px', 
                    border: '1px solid #dfe1e6', 
                    borderRadius: 4, 
                    fontFamily: 'monospace',
                    fontSize: '1rem'
                }} 
            />
            <button type="submit" style={{
                background: '#0052cc',
                color: 'white',
                border: 'none',
                padding: '0 20px',
                borderRadius: 4,
                fontWeight: 600,
                cursor: 'pointer'
            }}>
                Visualize
            </button>
        </form>
      </div>

      {error && (
          <div style={{ background: '#FFFAFA', border: '1px solid #FF5252', color: '#FF5252', padding: '1rem', borderRadius: 8, marginBottom: '2rem' }}>
              <strong>Error:</strong> {error}
          </div>
      )}

      {jql && !error && (
        <>
            <div className="stats-overview" style={{ 
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' 
            }}>
                <div className="stat-card" style={{ background: 'white', padding: '1rem', borderRadius: 8, textAlign: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '2.5rem', color: '#0052cc' }}>{stats.total}</h2>
                    <p style={{ margin: 0, color: '#666' }}>Total Matches</p>
                </div>
                <div className="stat-card" style={{ background: 'white', padding: '1rem', borderRadius: 8, textAlign: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '2.5rem', color: '#0052cc' }}>{issues.length}</h2>
                    <p style={{ margin: 0, color: '#666' }}>Issues Visualized</p>
                </div>
            </div>

            <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
                <div style={{ background: 'white', padding: '1rem', borderRadius: 8 }}>
                    <StatusChart data={statusData} title="Status Breakdown" />
                </div>
                <div style={{ background: 'white', padding: '1rem', borderRadius: 8 }}>
                    <PriorityChart data={priorityData} title="Priority Breakdown" />
                </div>
            </div>

            <div className="mt-8" style={{ marginTop: '2rem' }}>
                <h3>Issue List</h3>
                <div style={{ background: 'white', borderRadius: 8, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#f4f5f7', borderBottom: '2px solid #dfe1e6' }}>
                            <tr>
                                <th style={{ padding: '10px', textAlign: 'left' }}>Key</th>
                                <th style={{ padding: '10px', textAlign: 'left' }}>Summary</th>
                                <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
                                <th style={{ padding: '10px', textAlign: 'left' }}>Priority</th>
                                <th style={{ padding: '10px', textAlign: 'left' }}>Assignee</th>
                            </tr>
                        </thead>
                        <tbody>
                            {issues.map((issue: any) => (
                                <tr key={issue.key} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '10px' }}>
                                         <span style={{color: '#0052cc', fontWeight: 500}}>{issue.key}</span>
                                    </td>
                                    <td style={{ padding: '10px' }}>{issue.fields.summary}</td>
                                    <td style={{ padding: '10px' }}>
                                        <span style={{ 
                                            padding: '2px 8px', borderRadius: 4, background: '#dfe1e6', fontSize: '0.85em', fontWeight: 500
                                        }}>
                                            {issue.fields.status?.name}
                                        </span>
                                    </td>
                                    <td style={{ padding: '10px' }}>{issue.fields.priority?.name}</td>
                                    <td style={{ padding: '10px' }}>
                                        {issue.fields.assignee ? issue.fields.assignee.displayName : 'Unassigned'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
      )}
    </div>
  );
}
