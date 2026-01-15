'use server';

import { getJiraClient } from '@/lib/jira';

export interface JiraFilter {
  id: string;
  name: string;
  jql: string;
  owner?: string;
  favourite?: boolean;
}

export async function getJiraFilters(): Promise<JiraFilter[]> {
  try {
    const jira = await getJiraClient();
    
    // Fetch user's favourite filters first
    const favourites = await jira.filters.getMyFilters({ expand: 'jql' });
    
    const filters: JiraFilter[] = (favourites || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      jql: f.jql || '',
      owner: f.owner?.displayName,
      favourite: true
    }));
    
    return filters;
  } catch (e) {
    console.error('Failed to fetch Jira filters:', e);
    return [];
  }
}

export interface FilterIssue {
  key: string;
  summary: string;
  status: string;
  statusColor: string;
  priority: string;
  priorityIcon?: string;
  assignee?: string;
  assigneeAvatar?: string;
  updated: string;
}

export async function getFilterInsights(jql: string, projectKey: string, jiraBaseUrl?: string): Promise<{
  total: number;
  byStatus: { name: string; value: number }[];
  byPriority: { name: string; value: number }[];
  issues: FilterIssue[];
}> {
  try {
    const jira = await getJiraClient();
    
    // Build effective JQL
    const effectiveJql = jql ? `project = "${projectKey}" AND (${jql.replace(/ORDER\s+BY\s+.*$/i, '').trim()})` : `project = "${projectKey}"`;
    
    const [search, count] = await Promise.all([
      jira.issueSearch.searchForIssuesUsingJqlEnhancedSearchPost({
        jql: `${effectiveJql} ORDER BY updated DESC`,
        maxResults: 50,
        fields: ['summary', 'status', 'priority', 'assignee', 'updated']
      }),
      jira.issueSearch.countIssues({ jql: effectiveJql })
    ]);
    
    const rawIssues = search.issues || [];
    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    
    const issues: FilterIssue[] = rawIssues.map((issue: any) => {
      const status = issue.fields.status?.name || 'Unknown';
      const priority = issue.fields.priority?.name || 'None';
      byStatus[status] = (byStatus[status] || 0) + 1;
      byPriority[priority] = (byPriority[priority] || 0) + 1;
      
      return {
        key: issue.key,
        summary: issue.fields.summary,
        status,
        statusColor: issue.fields.status?.statusCategory?.colorName || 'default',
        priority,
        priorityIcon: issue.fields.priority?.iconUrl,
        assignee: issue.fields.assignee?.displayName,
        assigneeAvatar: issue.fields.assignee?.avatarUrls?.['24x24'],
        updated: issue.fields.updated
      };
    });
    
    return {
      total: (count as any).total || issues.length,
      byStatus: Object.entries(byStatus).map(([name, value]) => ({ name, value })),
      byPriority: Object.entries(byPriority).map(([name, value]) => ({ name, value })),
      issues
    };
  } catch (e) {
    console.error('Failed to fetch filter insights:', e);
    return { total: 0, byStatus: [], byPriority: [], issues: [] };
  }
}
