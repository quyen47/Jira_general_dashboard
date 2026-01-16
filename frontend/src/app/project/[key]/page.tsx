import { getJiraClient } from '@/lib/jira';
import { redirect } from 'next/navigation';
import Link from 'next/link';

import FilterManager from '@/components/FilterManager';
import StakeholderManager from '@/components/StakeholderManager';
import QuickLinksManager from '@/components/QuickLinksManager';
import ProjectOverview from '@/components/ProjectOverview';
import Timesheet from '@/components/Timesheet';
import { getProjectTotalHours } from '@/actions/timesheet';

export default async function ProjectPage({
    params,
    searchParams,
  }: {
    params: Promise<{ key: string }>;
    searchParams: Promise<{ filterJql?: string }>;
  }) {
  const { key } = await params;
  // Note: filterJql is now only used by FilterManager for its insights
  // The main page content always shows ALL project data
  
  // Base scope is the project - used for all main content
  const baseJql = `project = "${key}"`;
  
  let project;
  let issues = [];
  let epicList = [];
  let stats = {
    total: 0,
    byStatus: {} as Record<string, number>,
    byPriority: {} as Record<string, number>,
    byAssignee: {} as Record<string, number>,
  };
  let totalHours = 0;

  try {
    const jira = await getJiraClient();
    project = await jira.projects.getProject(key);
    
    // Epic JQL - always uses base project scope (no filter)
    const epicJql = `project = "${key}" AND issuetype = "Epic" AND statusCategory != Done`;

    // Parallel Fetch - all using base JQL (unfiltered)
    const [search, count, epicsSearch, _totalHours] = await Promise.all([
      jira.issueSearch.searchForIssuesUsingJqlEnhancedSearchPost({
        jql: `${baseJql} ORDER BY created DESC`,
        maxResults: 100,
        fields: ['status', 'priority', 'assignee', 'summary']
      }),
      jira.issueSearch.countIssues({
        jql: baseJql
      }),
      jira.issueSearch.searchForIssuesUsingJqlEnhancedSearchPost({
        jql: `${epicJql} ORDER BY created DESC`,
        maxResults: 50,
        fields: ['summary', 'status', 'created', 'duedate']
      }),
      getProjectTotalHours(key)
    ]);
    
    totalHours = _totalHours;

    issues = search.issues || [];
    stats.total = (count as any).total || 0;
    const epics = epicsSearch.issues || [];

    // Fetch children for calculations (if any epics found) - unfiltered
    let epicStats: Record<string, { total: number, todo: number, inprogress: number, done: number }> = {};
    if (epics.length > 0) {
        const epicKeys = epics.map(e => e.key);
        const childrenJql = `parent in (${epicKeys.join(',')})`;

        const childrenSearch = await jira.issueSearch.searchForIssuesUsingJqlEnhancedSearchPost({
            jql: childrenJql,
            maxResults: 1000, 
            fields: ['parent', 'status'] 
        });
        
        const children = childrenSearch.issues || [];
        children.forEach((child: any) => {
            const parentKey = child.fields.parent?.key;
            if (parentKey) {
                if (!epicStats[parentKey]) extraStats(epicStats, parentKey);
                
                epicStats[parentKey].total++;
                
                const category = child.fields.status?.statusCategory?.key;
                if (category === 'done') {
                    epicStats[parentKey].done++;
                } else if (category === 'indeterminate') {
                    epicStats[parentKey].inprogress++;
                } else {
                    // 'new' or undefined
                    epicStats[parentKey].todo++;
                }
            }
        });
    }

    epicList = epics.map(epic => ({
        key: epic.key,
        summary: epic.fields.summary,
        startDate: epic.fields.created, 
        dueDate: epic.fields.duedate || undefined,
        status: epic.fields.status?.name || 'Unknown',
        totalIssues: epicStats[epic.key]?.total || 0,
        todo: epicStats[epic.key]?.todo || 0,
        inprogress: epicStats[epic.key]?.inprogress || 0,
        done: epicStats[epic.key]?.done || 0,
    }));

  } catch (e) {
    console.error(e);
    // If project not found or error
    return (
        <div className="dashboard-container">
            <header className="header">
                <h1>Error</h1>
            </header>
            <p>Could not load project {key}. Please try again.</p>
            <Link href="/" className="back-link">← Back to Dashboard</Link>
        </div>
    )
  }

  function extraStats(stats: any, key: string) {
      stats[key] = { total: 0, todo: 0, inprogress: 0, done: 0 };
  }

  return (
    <div className="dashboard-container">
      <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Link href="/" className="back-link">← Back</Link>
          <div className="project-title-row" style={{ marginTop: '1rem', display: 'flex', alignItems: 'center' }}>
            {project.avatarUrls?.['48x48'] && (
                <img 
                    src={project.avatarUrls['48x48']} 
                    alt={project.name} 
                    style={{ width: 32, height: 32, borderRadius: 4, marginRight: 10 }}
                />
            )}
            <h1 style={{ margin: 0 }}>{project.name} <span style={{fontSize: '0.6em', color: '#666', verticalAlign: 'middle'}}>({project.key})</span></h1>
          </div>
          
          <div style={{ marginTop: '1.5rem' }}>
              <StakeholderManager projectKey={key} />
          </div>
        </div>
        
        <div style={{ marginLeft: 'auto', alignSelf: 'flex-start' }}>
            <QuickLinksManager projectKey={key} />
        </div>
      </header>
      
      <div style={{ marginBottom: '2rem' }}>
          <ProjectOverview projectKey={key} offshoreSpentHours={totalHours} epics={epicList} />
      </div>

      <Timesheet projectKey={key} />

      <FilterManager projectKey={key} />



    </div>
  );
}
