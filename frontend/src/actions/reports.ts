'use server';

import { getJiraClient } from '@/lib/jira';
import { getDomainTimezone } from './timezone';

export interface ReportIssue {
  key: string;
  summary: string;
  issueType: string;
  status: string;
  totalHours: number;
  estimatedHours?: number;
  assignees: { name: string; accountId: string; hours: number }[];
  children?: ReportIssue[];
  parent?: { key: string; summary: string };
  statusCategory?: string;
  dueDate?: string;
  created?: string;
  updated?: string;
}

export interface ReportSummary {
  totalHours: number;
  activeIssues: number;
  completedIssues: number;
  teamMembers: number;
  onTimeIssues: number;
  overdueIssues: number;
}

export interface DailyHours {
  date: string;
  hours: number;
}

export interface WorklogReport {
  summary: ReportSummary;
  issues: ReportIssue[];
  parentMetadata?: Record<string, ReportIssue>; // Fetched parent issues without worklogs
  trends: {
    dailyHours: DailyHours[];
    velocity: number;
    burnRate: number;
  };
  forecast: {
    projectedCompletion: string | null;
    remainingHours: number;
    averageVelocity: number;
  };
}

/**
 * Generate a comprehensive worklog report for a project within a date range
 */
export async function generateWorklogReport(
  projectKey: string,
  startDate: string,
  endDate: string
): Promise<WorklogReport> {
  const jira = await getJiraClient();

  // Get project to extract domain for timezone
  const project = await jira.projects.getProject(projectKey);
  const domain = project.self ? new URL(project.self.split('/rest/')[0]).hostname : '';
  const timezone = domain ? await getDomainTimezone(domain) : 'Asia/Bangkok';
  
  console.log(`[Report] Using timezone ${timezone} for domain ${domain}`);

  /**
   * Convert UTC timestamp to date string in the configured timezone
   */
  const convertToTimezoneDate = (utcTimestamp: string): string => {
    try {
      const date = new Date(utcTimestamp);
      // Format date in the target timezone
      const options: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      };
      const parts = new Intl.DateTimeFormat('en-CA', options).format(date);
      return parts; // Returns YYYY-MM-DD
    } catch (error) {
      console.error('Error converting date to timezone:', error);
      return utcTimestamp.split('T')[0]; // Fallback to UTC date
    }
  };

  // Fetch all issues with worklogs in the date range
  const jql = `project = "${projectKey}" AND worklogDate >= "${startDate}" AND worklogDate <= "${endDate}" ORDER BY created DESC`;

  const searchResult = await jira.issueSearch.searchForIssuesUsingJqlEnhancedSearchPost({
    jql,
    maxResults: 1000,
    fields: [
      'summary',
      'issuetype',
      'status',
      'assignee',
      'parent',
      'subtasks',
      'timetracking',
      'duedate',
      'created',
      'updated',
      'worklog'
    ]
  });

  const issues = searchResult.issues || [];

  // Build issue map for parent/child relationships
  const issueMap = new Map<string, any>();
  issues.forEach(issue => issueMap.set(issue.key, issue));

  // Collect all parent keys that are referenced but not in our results
  const missingParentKeys = new Set<string>();
  issues.forEach(issue => {
    if (issue.fields.parent && !issueMap.has(issue.fields.parent.key)) {
      missingParentKeys.add(issue.fields.parent.key);
    }
  });

  // Fetch missing parent issues from Jira
  if (missingParentKeys.size > 0) {
    const parentKeysArray = Array.from(missingParentKeys);
    const parentJql = `key IN (${parentKeysArray.map(k => `"${k}"`).join(',')})`;
    
    console.log('Fetching missing parent issues:', parentKeysArray);
    console.log('Parent JQL:', parentJql);
    
    try {
      const parentSearchResult = await jira.issueSearch.searchForIssuesUsingJqlEnhancedSearchPost({
        jql: parentJql,
        maxResults: 100,
        fields: [
          'summary',
          'issuetype',
          'status',
          'parent',
          'assignee'
        ]
      });

      console.log('Fetched parent issues:', parentSearchResult.issues?.length || 0);
      
      // Log detailed info about fetched parents
      parentSearchResult.issues?.forEach(parentIssue => {
        console.log(`Parent ${parentIssue.key}:`, {
          summary: parentIssue.fields.summary,
          issueType: parentIssue.fields.issuetype?.name,
          status: parentIssue.fields.status?.name,
          parent: parentIssue.fields.parent ? {
            key: parentIssue.fields.parent.key,
            summary: parentIssue.fields.parent.fields?.summary
          } : null
        });
      });
      
      // Add parent issues to the map and create a ReportIssue representation
      parentSearchResult.issues?.forEach(parentIssue => {
        issueMap.set(parentIssue.key, parentIssue);
        
        // Also create a basic ReportIssue for the parent (without worklogs)
        const parentReportIssue: ReportIssue = {
          key: parentIssue.key,
          summary: parentIssue.fields.summary || '',
          issueType: parentIssue.fields.issuetype?.name || 'Unknown',
          status: parentIssue.fields.status?.name || 'Unknown',
          statusCategory: parentIssue.fields.status?.statusCategory?.key,
          totalHours: 0,
          assignees: [],
          parent: parentIssue.fields.parent ? {
            key: parentIssue.fields.parent.key,
            summary: parentIssue.fields.parent.fields?.summary || ''
          } : undefined
        };
        
        // Store the ReportIssue version with a special key
        (issueMap as any).set(`${parentIssue.key}_REPORT`, parentReportIssue);
      });
      
      // Collect parent metadata for frontend use
      const parentMetadata: Record<string, ReportIssue> = {};
      parentSearchResult.issues?.forEach(parentIssue => {
        const reportVersion = (issueMap as any).get(`${parentIssue.key}_REPORT`);
        if (reportVersion) {
          parentMetadata[parentIssue.key] = reportVersion;
        }
      });
      
      // Store it for later use in the return
      (issueMap as any).set('__PARENT_METADATA__', parentMetadata);
    } catch (error) {
      console.error('Error fetching parent issues:', error);
      // Don't throw - continue with what we have
    }
  }

  // Calculate hours per issue from worklogs
  const issueHours = new Map<string, Map<string, number>>(); // issueKey -> (accountId -> hours)
  const authorNames = new Map<string, string>(); // accountId -> display name
  const dailyHoursMap = new Map<string, number>(); // date -> total hours
  const teamMembersSet = new Set<string>();

  for (const issue of issues) {
    const worklogs = issue.fields.worklog?.worklogs || [];
    
    for (const worklog of worklogs) {
      // Convert UTC timestamp to local timezone date
      const worklogDate = worklog.started ? convertToTimezoneDate(worklog.started) : null;
      
      // Only include worklogs within our date range
      if (worklogDate && worklogDate >= startDate && worklogDate <= endDate) {
        const hours = (worklog.timeSpentSeconds || 0) / 3600;
        const accountId = worklog.author?.accountId || 'unknown';
        const authorName = worklog.author?.displayName || 'Unassigned';
        
        // Track author name
        if (!authorNames.has(accountId)) {
          authorNames.set(accountId, authorName);
        }
        
        // Track by issue and assignee
        if (!issueHours.has(issue.key)) {
          issueHours.set(issue.key, new Map());
        }
        const issueAssignees = issueHours.get(issue.key)!;
        issueAssignees.set(accountId, (issueAssignees.get(accountId) || 0) + hours);
        
        // Track daily totals
        dailyHoursMap.set(worklogDate, (dailyHoursMap.get(worklogDate) || 0) + hours);
        
        // Track team members
        teamMembersSet.add(accountId);
      }
    }
  }

  // Build report issues with nested structure
  const reportIssues: ReportIssue[] = [];
  const processedKeys = new Set<string>();

  function buildReportIssue(issue: any): ReportIssue | null {
    if (!issueHours.has(issue.key)) {
      return null; // No worklogs in this period
    }

    const assigneeHours = issueHours.get(issue.key)!;
    const assignees = Array.from(assigneeHours.entries()).map(([accountId, hours]) => ({
      name: authorNames.get(accountId) || 'Unassigned',
      accountId,
      hours: Math.round(hours * 10) / 10
    }));

    const totalHours = Array.from(assigneeHours.values()).reduce((sum, h) => sum + h, 0);

    const reportIssue: ReportIssue = {
      key: issue.key,
      summary: issue.fields.summary || '',
      issueType: issue.fields.issuetype?.name || 'Unknown',
      status: issue.fields.status?.name || 'Unknown',
      statusCategory: issue.fields.status?.statusCategory?.key,
      totalHours: Math.round(totalHours * 10) / 10,
      estimatedHours: issue.fields.timetracking?.originalEstimateSeconds 
        ? issue.fields.timetracking.originalEstimateSeconds / 3600 
        : undefined,
      assignees,
      dueDate: issue.fields.duedate,
      created: issue.fields.created,
      updated: issue.fields.updated
    };

    // Add parent reference
    if (issue.fields.parent) {
      reportIssue.parent = {
        key: issue.fields.parent.key,
        summary: issue.fields.parent.fields?.summary || ''
      };
    }

    // Add children (subtasks)
    const subtasks = issue.fields.subtasks || [];
    const children: ReportIssue[] = [];
    
    for (const subtask of subtasks) {
      const subtaskIssue = issueMap.get(subtask.key);
      if (subtaskIssue && !processedKeys.has(subtask.key)) {
        const childReport = buildReportIssue(subtaskIssue);
        if (childReport) {
          children.push(childReport);
          processedKeys.add(subtask.key);
        }
      }
    }

    if (children.length > 0) {
      reportIssue.children = children;
      // Add children hours to parent total
      const childrenHours = children.reduce((sum, child) => sum + child.totalHours, 0);
      reportIssue.totalHours = Math.round((reportIssue.totalHours + childrenHours) * 10) / 10;
    }

    return reportIssue;
  }

  // Build top-level issues (no parent or parent not in result set with worklogs)
  for (const issue of issues) {
    if (processedKeys.has(issue.key)) continue;
    
    // Check if parent exists AND has worklogs in this period
    const hasParentWithWorklogs = issue.fields.parent && issueHours.has(issue.fields.parent.key);
    if (!hasParentWithWorklogs) {
      const reportIssue = buildReportIssue(issue);
      if (reportIssue) {
        reportIssues.push(reportIssue);
        processedKeys.add(issue.key);
      }
    }
  }

  // Calculate summary metrics
  const totalHours = Array.from(issueHours.values())
    .reduce((sum, assigneeMap) => 
      sum + Array.from(assigneeMap.values()).reduce((s, h) => s + h, 0), 0
    );

  const activeIssues = issueHours.size;
  const completedIssues = issues.filter(i => 
    i.fields.status?.statusCategory?.key === 'done' && issueHours.has(i.key)
  ).length;

  const now = new Date();
  const onTimeIssues = issues.filter(i => {
    if (!i.fields.duedate || !issueHours.has(i.key)) return false;
    const dueDate = new Date(i.fields.duedate);
    const isDone = i.fields.status?.statusCategory?.key === 'done';
    return isDone && dueDate >= now;
  }).length;

  const overdueIssues = issues.filter(i => {
    if (!i.fields.duedate || !issueHours.has(i.key)) return false;
    const dueDate = new Date(i.fields.duedate);
    const isDone = i.fields.status?.statusCategory?.key === 'done';
    return !isDone && dueDate < now;
  }).length;

  // Calculate trends
  const dailyHours: DailyHours[] = Array.from(dailyHoursMap.entries())
    .map(([date, hours]) => ({ date, hours: Math.round(hours * 10) / 10 }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalDays = dailyHours.length || 1;
  const burnRate = totalHours / totalDays;

  // Simple velocity calculation (completed issues per day)
  const velocity = completedIssues / totalDays;

  // Forecast remaining work
  const remainingIssues = activeIssues - completedIssues;
  const remainingHours = remainingIssues * (totalHours / activeIssues); // Average hours per issue
  const daysToComplete = burnRate > 0 ? Math.ceil(remainingHours / burnRate) : 0;
  
  const projectedCompletion = daysToComplete > 0 
    ? new Date(Date.now() + daysToComplete * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    : null;

  // Get parent metadata if it exists
  const parentMetadata = (issueMap as any).get('__PARENT_METADATA__') || {};
  
  console.log('Parent metadata keys:', Object.keys(parentMetadata));

  return {
    summary: {
      totalHours: Math.round(totalHours * 10) / 10,
      activeIssues,
      completedIssues,
      teamMembers: teamMembersSet.size,
      onTimeIssues,
      overdueIssues
    },
    issues: reportIssues,
    parentMetadata,
    trends: {
      dailyHours,
      velocity: Math.round(velocity * 100) / 100,
      burnRate: Math.round(burnRate * 10) / 10
    },
    forecast: {
      projectedCompletion,
      remainingHours: Math.round(remainingHours * 10) / 10,
      averageVelocity: Math.round(velocity * 100) / 100
    }
  };
}
