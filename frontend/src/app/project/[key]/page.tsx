import { getJiraClient } from '@/lib/jira';
import Link from 'next/link';

import FilterManager from '@/components/FilterManager';
import StakeholderManager from '@/components/StakeholderManager';
import QuickLinksManager from '@/components/QuickLinksManager';
import ProjectOverview from '@/components/ProjectOverview';
import Timesheet from '@/components/Timesheet';
import { getProjectTotalHours } from '@/actions/timesheet';
import RecentActivity from '@/components/RecentActivity';
import ReportGenerator from '@/components/ReportGenerator';
import { updateDomainTimezone } from '@/actions/timezone';
import WBSGanttChart from '@/components/WBSGanttChart';
import { getProjectSchedule } from '@/actions/gantt';
import DailyCheckpoint from '@/components/DailyCheckpoint';


export default async function ProjectPage({
    params,
  }: {
    params: Promise<{ key: string }>;
    searchParams: Promise<{ filterJql?: string }>;
  }) {
  const { key } = await params;
  
  const baseJql = `project = "${key}"`;
  
  let project;
  let issues = [];
  let epicList = [];
  let schedule = [];
  let stats = {
    total: 0,
    byStatus: {} as Record<string, number>,
    byPriority: {} as Record<string, number>,
    byAssignee: {} as Record<string, number>,
  };
  let totalHours = 0;
  let baseUrl = '';

  try {
    const jira = await getJiraClient();
    project = await jira.projects.getProject(key);
    
    const epicJql = `project = "${key}" AND issuetype = "Epic" AND statusCategory != Done`;

    const [search, count, epicsSearch, _totalHours, _schedule] = await Promise.all([
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
      getProjectTotalHours(key),
      getProjectSchedule(key)
    ]);
    
    totalHours = _totalHours;
    schedule = _schedule;

    if (project && project.self) {
        baseUrl = project.self.split('/rest/')[0];
        
        try {
          const domain = new URL(baseUrl).hostname;
          await updateDomainTimezone(domain, 'Asia/Bangkok');
        } catch (error) {
          console.error('Error ensuring domain config:', error);
        }
    }

    issues = search.issues || [];
    stats.total = (count as any).total || 0;
    const epics = epicsSearch.issues || [];

    let epicStats: Record<string, { total: number, todo: number, inprogress: number, done: number }> = {};
    if (epics.length > 0) {
        const epicKeys = epics.map((e: any) => e.key);
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
                    epicStats[parentKey].todo++;
                }
            }
        });
    }

    epicList = epics.map((epic: any) => ({
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
    return (
        <div className="dashboard-container">
            <div style={{ 
              background: 'white', 
              borderRadius: '14px', 
              padding: '48px', 
              textAlign: 'center',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <h1 style={{ fontSize: '1.25rem', color: '#0F172A', marginBottom: 8 }}>Error Loading Project</h1>
                <p style={{ color: '#64748B', marginBottom: 20 }}>Could not load project {key}. Please try again.</p>
                <Link href="/" style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #1E40AF, #3B82F6)',
                  color: 'white',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  textDecoration: 'none',
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  Back to Dashboard
                </Link>
            </div>
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
          <Link href="/" className="back-link" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: '#3B82F6',
            fontSize: '0.85rem',
            fontWeight: 500,
            textDecoration: 'none',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to Dashboard
          </Link>
          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center' }}>
            {project.avatarUrls?.['48x48'] && (
                <img 
                    src={project.avatarUrls['48x48']} 
                    alt={project.name} 
                    style={{ width: 36, height: 36, borderRadius: 8, marginRight: 14, border: '1px solid #E2E8F0' }}
                />
            )}
            <div>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#0F172A' }}>
                {project.name}
              </h1>
              <span style={{ 
                fontSize: '0.8rem', 
                color: '#94A3B8', 
                fontWeight: 500,
                fontFamily: 'var(--font-geist-mono, monospace)',
                marginTop: 2,
                display: 'inline-block',
              }}>
                {project.key}
              </span>
            </div>
          </div>
          
          <div style={{ marginTop: '10px' }}>
              <StakeholderManager projectKey={key} />
          </div>
        </div>
        
        <div style={{ marginLeft: 'auto', alignSelf: 'flex-start', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <QuickLinksManager projectKey={key} />
        </div>
      </header>
      
      <div style={{ marginBottom: '12px' }}>
          <DailyCheckpoint projectKey={key} baseUrl={baseUrl} />
      </div>

      <div style={{ marginBottom: '12px' }}>
          <ProjectOverview projectKey={key} offshoreSpentHours={totalHours} epics={epicList} />
      </div>

      <div style={{ marginBottom: '12px' }}>
          <WBSGanttChart tasks={schedule} baseUrl={baseUrl} projectKey={key} />
      </div>

      <Timesheet projectKey={key} initialOpen={true} />

      <FilterManager projectKey={key} baseUrl={baseUrl} />

      <ReportGenerator projectKey={key} baseUrl={baseUrl} />

      <RecentActivity projectKey={key} baseUrl={baseUrl} />

    </div>
  );
}
