'use server';

import { getJiraClient } from '@/lib/jira';

import { getJiraCredentials } from '@/lib/auth';

export interface WorklogEntry {
  id: string;
  issueId: string;
  issueKey: string;
  issueSummary: string;
  issueStatus: string; // New
  projectKey: string; // New
  projectName: string; // New
  author: {
    accountId: string;
    displayName: string;
    avatarUrl?: string;
  };
  timeSpent: string;
  timeSpentSeconds: number;
  started: string; // ISO Date Time
  updated: string; // New
  comment?: string;
  components: string[]; // New
  labels: string[]; // New
}

export interface TimesheetData {
  [date: string]: {
    [accountId: string]: {
      author: WorklogEntry['author'];
      entries: WorklogEntry[];
      totalSeconds: number;
    }
  }
}

interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export async function getProjectWorklogs(projectKey: string, range?: number | DateRange): Promise<{ data: TimesheetData, baseUrl: string }> {
  try {
    const jira = await getJiraClient();
    const credentials = await getJiraCredentials();
    let baseUrl = credentials?.domain || '';
    if (baseUrl && !baseUrl.startsWith('http')) {
      baseUrl = `https://${baseUrl}`;
    }
    
    // Determine date range
    let startStr: string;
    let endStr: string;
    
    if (typeof range === 'object') {
      startStr = range.startDate;
      endStr = range.endDate;
    } else {
      // Backward compatibility for 'days' number
      const days = range || 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startStr = startDate.toISOString().split('T')[0];
      endStr = new Date().toISOString().split('T')[0];
    }
    
    // worklogDate is the correct JQL field for filtering by worklog time
    // We add 1 day to end date for strict inequality if needed, but JQL <= supports inclusive date
    const jql = `project = "${projectKey}" AND worklogDate >= "${startStr}" AND worklogDate <= "${endStr}"`;
    
    // Fetch issues with worklogs
    const search = await jira.issueSearch.searchForIssuesUsingJqlEnhancedSearchPost({
      jql,
      maxResults: 1000, // Increased limit for fuller report
      fields: ['summary', 'worklog', 'assignee', 'status', 'updated', 'components', 'labels', 'project']
    });
    
    const issues = search.issues || [];
    const timesheetData: TimesheetData = {};
    
    // Process dates for JS comparison
    const filterStartDate = new Date(startStr);
    filterStartDate.setHours(0, 0, 0, 0);
    const filterEndDate = new Date(endStr);
    filterEndDate.setHours(23, 59, 59, 999);

    for (const issue of issues) {
      const worklogs = issue.fields.worklog?.worklogs || [];
      const projectKey = issue.fields.project?.key || '';
      const projectName = issue.fields.project?.name || '';
      const issueStatus = issue.fields.status?.name || 'Unknown';
      const components = issue.fields.components?.map((c: any) => c.name) || [];
      const labels = issue.fields.labels || [];
      const issueUpdated = issue.fields.updated || '';

      for (const log of worklogs) {
        if (!log.started) continue;
        
        const logDate = new Date(log.started);
        // Normalize to YYYY-MM-DD for grouping
        const logDateStr = logDate.toISOString().split('T')[0];
        
        // Filter by date range
        if (logDate >= filterStartDate && logDate <= filterEndDate) {
          if (!log.author) continue;
          
          const accountId = log.author.accountId || 'unknown';
          
          // Initialize data structure
          if (!timesheetData[logDateStr]) {
            timesheetData[logDateStr] = {};
          }
          
          if (!timesheetData[logDateStr][accountId]) {
            timesheetData[logDateStr][accountId] = {
              author: {
                accountId,
                displayName: log.author.displayName || 'Unknown',
                avatarUrl: log.author.avatarUrls?.['24x24']
              },
              entries: [],
              totalSeconds: 0
            };
          }
          
          // Add entry
          timesheetData[logDateStr][accountId].entries.push({
            id: log.id || Math.random().toString(),
            issueId: issue.id,
            issueKey: issue.key,
            issueSummary: issue.fields.summary,
            issueStatus,
            projectKey,
            projectName,
            author: {
              accountId,
              displayName: log.author.displayName || 'Unknown',
              avatarUrl: log.author.avatarUrls?.['24x24']
            },
            timeSpent: log.timeSpent || '0m',
            timeSpentSeconds: log.timeSpentSeconds || 0,
            started: log.started,
            updated: issueUpdated, // Using issue update time as proxy if log update not clear? Or log.updated?
            // Actually log has its own 'updated' field. Let's try log.updated if available, else issue.
            // Jira worklog object usually has 'updated'. But strict typing might miss it if not in fields? 
            // The 'fields' param requests issue fields. Worklog object structure is standard.
            comment: typeof log.comment === 'string' ? log.comment : 
                     (log.comment as any)?.content ? 'Complex content' : undefined,
            components,
            labels
          });
          
          timesheetData[logDateStr][accountId].totalSeconds += (log.timeSpentSeconds || 0);
        }
      }
    }
    
    return { data: timesheetData, baseUrl };
  } catch (e) {
    console.error('Failed to fetch project worklogs:', e);
    return { data: {}, baseUrl: '' };
  }
}
