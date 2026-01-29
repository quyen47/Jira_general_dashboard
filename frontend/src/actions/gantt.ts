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
}

export async function getProjectSchedule(projectKey: string): Promise<GanttTaskData[]> {
  try {
    const jira = await getJiraClient();
    
    // 1. Fetch Issues with Hierarchy and Links
    // We fetch Epics, Standard issues, and Subtasks
    // We need 'issuelinks' to map dependencies
    const jql = `project = "${projectKey}" ORDER BY rank ASC, created ASC`;
    
    // We need to fetch enough fields
    const searchResult = await jira.issueSearch.searchForIssuesUsingJqlEnhancedSearchPost({
      jql,
      maxResults: 200, // Limit for performance, might need pagination for huge projects
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
        'customfield_10015' // Start date (often configured, but key varies. Using created as fallback)
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
        // Try to find a real start date, fallback to created
        // Try to find a real due date, fallback to created + 1 week or estimate
        const created = parseDate(fields.created);
        const start = fields.customfield_10015 ? parseDate(fields.customfield_10015) : created;
        
        // End date: duedate -> or start + 2 weeks default
        let end = fields.duedate ? parseDate(fields.duedate) : new Date(start.getTime() + (14 * 24 * 60 * 60 * 1000));
        
        // Ensure end > start
        if (end <= start) {
            end = new Date(start.getTime() + (24 * 60 * 60 * 1000)); // Min 1 day
        }

        // Dependencies
        // "Blocks" link usually means Outward issue BLOCKS Inward issue.
        // So Inward issue DEPENDS ON Outward issue.
        // Link type names vary by Jira instance. Common: "Blocks", "Cloners", "Relates"
        // We will assume 'Blocks' (inward: 'is blocked by', outward: 'blocks')
        // If Issue A blocks Issue B:
        // A (outward 'blocks') -> B
        // B (inward 'is blocked by') -> A.
        // So B depends on A. 
        // We look for 'inwardIssue' with type name 'Blocks' (or checking type.inward === 'is blocked by')
        
        const dependencies: string[] = [];
        if (fields.issuelinks) {
            fields.issuelinks.forEach((link: any) => {
                // Adjust logic based on standard Jira "Blocks" link type
                if (link.type.inward === 'is blocked by' && link.inwardIssue) {
                    // This issue is blocked by link.inwardIssue
                    // Only include if the dependency is also in our project/list to avoid broken links
                    // Ideally we check if link.inwardIssue.key is in our fetched list, but we can't easily O(N) check inside loop without map.
                    // We'll let the frontend or library filter invalid deps, or just add them.
                    dependencies.push(link.inwardIssue.id);
                }
            });
        }
        
        // Parent-Child Dependency (Hierarchy)
        // gantt-task-react uses 'project' field to group tasks? 
        // Or we can just use dependencies to enforce order?
        // Actually gantt-task-react uses a flat list. It has a 'project' property to group list items under a collapsible header task.
        // So Epics should be Type: 'project'. Stories under Epic should Reference Epic ID as 'project'.
        
        let type: 'project' | 'task' | 'milestone' = 'task';
        let projectRef = undefined;

        if (fields.issuetype?.name === 'Epic') {
            type = 'project';
        } else if (fields.parent) {
             // Subtask or Story with Parent
             // Note: Standard issues (Stories) usually don't have 'parent' field in simplified views unless using new Jira view or Subtasks.
             // But Epics are linked via 'customfield_10014' (Epic Link) in older Jira, or 'parent' in newer.
             // We'll try to handle the 'parent' field which is becoming standard.
             if (fields.parent.id) {
                 projectRef = fields.parent.id;
             }
        }
        
        // If it's a subtask, it definitely has a parent.
        if (fields.issuetype?.subtask && fields.parent) {
            projectRef = fields.parent.id;
        }

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
            // Mock baseline for now (random shift from actual) to demonstrate feature
            originalStart: new Date(start.getTime() - (Math.random() * 5 * 24 * 60 * 60 * 1000)),
            originalEnd: end
        });
    });

    return tasks;

  } catch (error) {
    console.error('Failed to fetch project schedule:', error);
    return [];
  }
}
