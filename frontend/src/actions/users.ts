'use server';

import { getJiraClient } from '@/lib/jira';

export async function searchJiraUsers(query: string) {
  if (!query) return [];

  try {
    const jira = await getJiraClient();
    // Use userSearch.findUsers for generic user search
    const users = await jira.userSearch.findUsers({
      query: query,
      maxResults: 10
    });

    return users.map((u: any) => ({
      accountId: u.accountId,
      displayName: u.displayName,
      avatarUrl: u.avatarUrls?.['24x24'] || u.avatarUrls?.['48x48'],
      emailAddress: u.emailAddress
    }));
  } catch (error) {
    console.error('Failed to search users:', error);
    return [];
  }
}

export async function getProjectUsers(projectKey: string) {
  try {
    const jira = await getJiraClient();
    // Fetch users assignable to the project to get the team list
    const users = await jira.userSearch.findAssignableUsers({
      project: projectKey,
      maxResults: 50
    });

    return users.map((u: any) => ({
      accountId: u.accountId,
      displayName: u.displayName,
      avatarUrl: u.avatarUrls?.['48x48'] || u.avatarUrls?.['24x24'],
      emailAddress: u.emailAddress
    }));
  } catch (error) {
    console.error('Failed to fetch project users:', error);
    return [];
  }
}
