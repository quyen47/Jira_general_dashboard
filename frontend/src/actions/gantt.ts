'use server';

import { getJiraClient } from '@/lib/jira';

export interface GanttTaskData {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress: number;
  dependencies?: string[];
  type: 'project' | 'task' | 'milestone';
  project?: string;
  displayOrder?: number;
  // Jira specific
  jiraKey: string;
  status: string;
  assignee?: { displayName: string, avatarUrl: string };
  priority?: { name: string, iconUrl: string };
  issueType?: { name: string, iconUrl: string };
  originalStart?: Date; // For baseline
  originalEnd?: Date;   // For baseline
  hasChildren?: boolean; // For lazy loading
}

export async function getProjectSchedule(projectKey: string, parentId?: string): Promise<GanttTaskData[]> {
  try {
    const jira = await getJiraClient();
    
    // 1. Determine JQL for Lazy Loading
    // If parentId is provided, fetch direct children.
    // If not, fetch "Roots" (Issues without parents).
    let jql = '';
    if (parentId) {
        // Fetch children of the specific parent (Works for Epic -> Story and Story -> Subtask)
        // Note: 'parent' field works for both in modern Jira Cloud. 
        // For older instances, might need ' "Epic Link" = ... ' for Epics, but 'parent' is the safe standard attempt first.
        jql = `project = "${projectKey}" AND parent = "${parentId}" ORDER BY rank ASC, created ASC`;
    } else {
        // Fetch Root Level (Epics, or tasks/stories with no parent)
        jql = `project = "${projectKey}" AND parent is EMPTY ORDER BY rank ASC, created ASC`;
    }
    
    // We need to fetch enough fields
    const searchResult = await jira.issueSearch.searchForIssuesUsingJqlEnhancedSearchPost({
      jql,
      maxResults: 100, // Fetch chunk
      fields: [
        'summary', 
        'status', 
        'issuetype', 
        'created', 
        'duedate', 
        'priority', 
        'assignee', 
        'issuelinks', 
        'subtasks',
        'parent', // For hierarchy
        'timetracking', // For progress based on time spent? Or just status category
        'customfield_10015' // Start date
      ]
    });

    const issues = searchResult.issues || [];
    const tasks: GanttTaskData[] = [];

    // Helper to parse date or default to now/modified
    const parseDate = (dateStr?: string, fallback: Date = new Date()) => {
        return dateStr ? new Date(dateStr) : fallback;
    };

    // Helper to determine progress based on status category
    const getProgress = (statusCategory?: string) => {
        if (statusCategory === 'done') return 100;
        if (statusCategory === 'indeterminate') return 50; // In Progress
        return 0; // To Do / New
    };

    issues.forEach((issue: any) => {
        const fields = issue.fields as any;
        
        // Dates
        const created = parseDate(fields.created);
        const start = fields.customfield_10015 ? parseDate(fields.customfield_10015) : created;
        
        // End date: duedate -> or start + 2 weeks default
        let end = fields.duedate ? parseDate(fields.duedate) : new Date(start.getTime() + (14 * 24 * 60 * 60 * 1000));
        
        // Ensure end > start
        if (end <= start) {
            end = new Date(start.getTime() + (24 * 60 * 60 * 1000)); // Min 1 day
        }

        // Dependencies
        const dependencies: string[] = [];
        if (fields.issuelinks) {
            fields.issuelinks.forEach((link: any) => {
                if (link.type.inward === 'is blocked by' && link.inwardIssue) {
                    dependencies.push(link.inwardIssue.id);
                }
            });
        }
        
        // Hierarchy Type & Parent
        let type: 'project' | 'task' | 'milestone' = 'task';
        let projectRef = undefined;

        if (fields.issuetype?.name === 'Epic') {
            type = 'project';
        } else if (fields.parent) {
             if (fields.parent.id) {
                 projectRef = fields.parent.id;
             }
        }
        
        if (fields.issuetype?.subtask && fields.parent) {
            projectRef = fields.parent.id;
        }

        // Parent Logic Correction for Lazy Load Context
        // If we fetched regular roots, they wont have 'fields.parent' set usually (as per JQL).
        // If we fetched children, 'fields.parent' might be present.
        // We ensure 'project' (parentId) is set correctly if we know the parent from context? 
        // Actually, best to rely on Issue Data. 
        // If we fetched children of 'X', then 'project' should be 'X'.
        // Jira 'parent' field result is reliable.

        // Has Children Logic
        // 1. If Subtasks exist -> true
        // 2. If Epic -> true (assume)
        let hasChildren = false;
        if (fields.subtasks && fields.subtasks.length > 0) hasChildren = true;
        if (fields.issuetype?.name === 'Epic') hasChildren = true;

        tasks.push({
            id: issue.id,
            jiraKey: issue.key,
            name: fields.summary,
            start,
            end,
            progress: getProgress(fields.status?.statusCategory?.key),
            dependencies,
            type,
            project: projectRef,
            status: fields.status?.name || 'Unknown',
            assignee: fields.assignee ? {
                displayName: fields.assignee.displayName,
                avatarUrl: fields.assignee.avatarUrls?.['24x24']
            } : undefined,
            priority: fields.priority ? {
                name: fields.priority.name,
                iconUrl: fields.priority.iconUrl
            } : undefined,
            issueType: fields.issuetype ? {
                name: fields.issuetype.name,
                iconUrl: fields.issuetype.iconUrl
            } : undefined,
            // Mock baseline
            originalStart: new Date(start.getTime() - (Math.random() * 5 * 24 * 60 * 60 * 1000)),
            originalEnd: end,
            hasChildren
        });
    });

    return tasks;

  } catch (error) {
    console.error('Failed to fetch project schedule:', error);
    return [];
  }
}
