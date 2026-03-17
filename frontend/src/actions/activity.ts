'use server';

import { getJiraClient } from '@/lib/jira';

export interface ActivityItem {
  id: string;
  type: 'comment' | 'history' | 'create';
  user: {
    name: string;
    avatarUrl?: string; // 24x24 or 48x48
  };
  timestamp: string; // ISO string
  issue: {
    key: string;
    summary: string;
    self: string; // to derive link if needed
    updated?: string;
    issueLinks?: any[];
  };
  details?: {
    field?: string;
    fromValue?: string;
    toValue?: string;
    commentBody?: string;
    // New fields for dashboard analysis
    status?: string;
    assignee?: string;
    dueDate?: string;
    startDate?: string;
    fullHistory?: any[];
  };
}

export async function getProjectRecentActivity(projectKey: string, username?: string, issueKey?: string, date?: string): Promise<ActivityItem[]> {
  const jira = await getJiraClient();
  
  // Target specific date or look back 14 days
  let jql = `project = "${projectKey}"`;
  
  if (date) {
      // Fetch +/- 1 day to be safe with timezones, then filter exactly in JS
      // This ensures we catch early morning or late night updates regardless of Jira server TZ
      const d = new Date(date);
      const prev = new Date(d); prev.setDate(d.getDate() - 1);
      const next = new Date(d); next.setDate(d.getDate() + 1);
      const prevStr = prev.toISOString().split('T')[0];
      const nextStr = next.toISOString().split('T')[0];
      
      jql += ` AND updated >= "${prevStr}" AND updated <= "${nextStr} 23:59"`;
  } else {
      jql += ` AND updated >= -14d`;
  }
  
  if (issueKey && issueKey.trim()) {
      jql += ` AND key = "${issueKey}"`;
  }

  if (username && username.trim()) {
      // Heuristic to find activity related to a user. 
      // Note: 'actor' is not standard JQL. We check common fields.
      const safeUser = username.replace(/"/g, '\\"');
      jql += ` AND (assignee = "${safeUser}" OR reporter = "${safeUser}" OR creator = "${safeUser}" OR comment ~ "${safeUser}" OR status CHANGED BY "${safeUser}")`;
  }

  jql += ` ORDER BY updated DESC`;

  console.log(`[RecentActivity] Fetching for project: ${projectKey}, User: ${username || 'All'}, Date: ${date || '14d'}`);
  console.log(`[RecentActivity] JQL: ${jql}`);

  let issues: any[] = [];
  try {
      const search = await jira.issueSearch.searchForIssuesUsingJqlEnhancedSearchPost({
        jql,
        maxResults: 100, // Increased limit for daily volume
        fields: ['summary', 'comment', 'creator', 'created', 'updated', 'status', 'assignee', 'duedate', 'customfield_10015', 'issuelinks']
      });
      console.log(`[RecentActivity] Jira Response: Found ${search.issues?.length || 0} issues`);
      issues = search.issues || [];
  } catch (e) {
      console.error("Failed to fetch project activity:", e);
      return [];
  }

  // Fetch changelogs explicitly since expand is unreliable
  // Map issueId -> history[]
  const issueHistories: Record<string, any[]> = {};
  try {
      // Fetch concurrently but safely
      const changelogPromises = issues.map(async (issue) => {
          try {
              const changelog = await jira.issues.getChangeLogs({ 
                  issueIdOrKey: issue.id,
                  maxResults: 10 // Only recent history needed
              });
              return { id: issue.id, history: changelog.values };
          } catch (e) {
              return { id: issue.id, history: [] };
          }
      });
      
      const results = await Promise.all(changelogPromises);
      results.forEach(r => {
          if (r.history) issueHistories[r.id] = r.history;
      });
  } catch (e) {
      console.error("Failed to fetch changelogs", e);
  }

  let activities: ActivityItem[] = [];

  for (const issue of issues) {
      if (!issue.fields) continue;

      const issueData: ActivityItem['issue'] = {
          key: issue.key,
          summary: issue.fields.summary,
          self: issue.self || '',
          updated: issue.fields.updated,
          issueLinks: issue.fields.issuelinks
      };

      let hasActivity = false;

      // 1. Issue Creation (if within window)
      const createdTime = new Date(issue.fields.created).getTime();
      let cutoff = Date.now() - (14 * 24 * 60 * 60 * 1000);
      let endCutoff = Date.now() + (24 * 60 * 60 * 1000); // Future buffer

      if (date) {
          const [y, m, d] = date.split('-').map(Number);
          cutoff = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
          endCutoff = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
      }
      
      const creatorName = issue.fields.creator?.displayName || 'Unknown';
      // Filter by username if provided
      if (createdTime >= cutoff && createdTime <= endCutoff && (!username || creatorName === username)) {
          hasActivity = true;
          activities.push({
              id: `${issue.id}-create`,
              type: 'create',
              user: {
                  name: creatorName,
                  avatarUrl: issue.fields.creator?.avatarUrls?.['48x48']
              },
              timestamp: issue.fields.created,
              issue: issueData,
              details: {
                  field: 'Issue',
                  toValue: 'Created',
                  status: issue.fields.status?.name,
                  assignee: issue.fields.assignee?.displayName,
                  dueDate: issue.fields.duedate,
                  startDate: issue.fields.customfield_10015
              }
          });
      }

      // 2. Comments
      if (issue.fields.comment && issue.fields.comment.comments) {
          issue.fields.comment.comments.forEach((comment: any) => {
              const cTime = new Date(comment.created).getTime();
              const authorName = comment.author?.displayName || 'Unknown';
              
              // Filter by username if provided
              if (cTime >= cutoff && cTime <= endCutoff && (!username || authorName === username)) {
                  hasActivity = true;
                  
                  let bodyText = '';
                  if (typeof comment.body === 'string') {
                      bodyText = comment.body;
                  } else if (comment.body && typeof comment.body === 'object' && comment.body.content) {
                      // Simple ADF extraction (just first paragraph or so)
                      // ADF structure: { content: [ { type: 'paragraph', content: [ { text: 'foo' } ] } ] }
                      try {
                          bodyText = comment.body.content.map((block: any) => 
                              block.content ? block.content.map((c: any) => c.text || '').join('') : ''
                          ).join(' ');
                      } catch (e) {
                          bodyText = '[Rich Content]';
                      }
                  } else {
                      bodyText = '[Content]';
                  }

                  activities.push({
                      id: `comment-${comment.id}`,
                      type: 'comment',
                      user: {
                          name: authorName,
                          avatarUrl: comment.author?.avatarUrls?.['48x48']
                      },
                      timestamp: comment.created,
                      issue: issueData,
                      details: {
                          commentBody: bodyText,
                          status: issue.fields.status?.name,
                          assignee: issue.fields.assignee?.displayName,
                          dueDate: issue.fields.duedate,
                          startDate: issue.fields.customfield_10015
                      }
                  });
              }
          });
      }

      // 3. Status Changes & History
      const histories = issueHistories[issue.id];
      if (histories) {
          histories.forEach((history: any) => {
              const hTime = new Date(history.created).getTime();
              const authorName = history.author?.displayName || 'Unknown';

              if (hTime >= cutoff && hTime <= endCutoff && (!username || authorName === username)) {
                   history.items.forEach((item: any, idx: number) => {
                      // We primarily care about Status, Priority, Assignee. 
                      // Maybe filter to reduce noise?
                      // For now, let's include all to be sure we capture "Status changed".
                      hasActivity = true;
                      activities.push({
                          id: `history-${history.id}-${idx}`,
                          type: 'history',
                          user: {
                              name: authorName,
                              avatarUrl: history.author?.avatarUrls?.['48x48']
                          },
                          timestamp: history.created,
                          issue: issueData,
                          details: {
                              field: item.field,
                              fromValue: item.fromString,
                              toValue: item.toString,
                              status: issue.fields.status?.name,
                              assignee: issue.fields.assignee?.displayName,
                              dueDate: issue.fields.duedate,
                              startDate: issue.fields.customfield_10015,
                              fullHistory: histories // Pass all changes for advanced metrics
                          }
                      });
                  });
              }
          });
      }
  }

  // Sort all activities by time DESC
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Limit total items returned to frontend
  return activities.slice(0, 100);
}
