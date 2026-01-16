'use server';

import { getJiraClient } from '@/lib/jira';
import { getJiraCredentials } from '@/lib/auth';

export interface SearchResult {
  key: string;
  summary: string;
  status: string;
}

export async function searchIssues(query: string, projectKey: string, issueType?: string): Promise<{ issues: SearchResult[], baseUrl: string }> {
  const jira = await getJiraClient();
  const creds = await getJiraCredentials();
  
  let baseUrl = '';
  if (creds?.domain) {
      baseUrl = creds.domain;
      if (!baseUrl.startsWith('http')) baseUrl = `https://${baseUrl}`;
  }
  
  // Basic text search in the project
  // We sanitize the query slightly to prevent JQL massive errors, but basic quote escaping is good enough
  const safeQuery = query.replace(/"/g, '\\"');
  let jql = `project = "${projectKey}" AND text ~ "${safeQuery}*"`;
  
  if (issueType) {
      jql += ` AND issuetype = "${issueType}"`;
  }
  
  jql += ` ORDER BY updated DESC`;
  
  try {
    const response = await jira.issueSearch.searchForIssuesUsingJqlEnhancedSearchPost({
        jql,
        maxResults: 10,
        fields: ['summary', 'status']
    });
    
    return {
        issues: (response.issues || []).map((issue: any) => ({
            key: issue.key,
            summary: issue.fields.summary,
            status: issue.fields.status.name
        })),
        baseUrl
    };
  } catch (e) {
    console.error("Search failed", e);
    return { issues: [], baseUrl };
  }
}
