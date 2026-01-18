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
    // ✅ OPTIMIZATION: Parallelize independent async operations
    // Fetch jira client and credentials concurrently instead of sequentially
    const [jira, credentials] = await Promise.all([
      getJiraClient(),
      getJiraCredentials()
    ]);
    
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
/**
 * Get total hours spent on a project (for offshore hours calculation)
 * Uses worklogDate JQL filter for consistency with getBurnDownData
 */
export async function getProjectTotalHours(projectKey: string): Promise<number> {
  try {
    const jira = await getJiraClient();
    
    console.log('[TotalHours] Fetching total hours for project:', projectKey);
    
    // Use worklogDate filter to capture ALL worklogs
    const startDate = '2000-01-01'; // Capture all historical worklogs
    const endDate = new Date().toISOString().split('T')[0]; // Up to today
    
    const jql = `project = "${projectKey}" AND worklogDate >= "${startDate}" AND worklogDate <= "${endDate}"`;
    
    console.log('[TotalHours] JQL:', jql);
    
    const search = await jira.issueSearch.searchForIssuesUsingJqlEnhancedSearchPost({
      jql,
      maxResults: 1000,
      fields: ['worklog']
    });

    let totalSeconds = 0;
    let worklogCount = 0;
    
    for (const issue of search.issues || []) {
      const fields = issue.fields as any;
      const worklogs = fields.worklog?.worklogs || [];
      
      for (const log of worklogs) {
        totalSeconds += log.timeSpentSeconds || 0;
        worklogCount++;
      }
    }
    
    const totalHours = totalSeconds / 3600;
    
    console.log('[TotalHours] Found', worklogCount, 'worklogs');
    console.log('[TotalHours] Total hours:', totalHours.toFixed(2));
    
    return Math.round(totalHours * 100) / 100;
  } catch (e) {
    console.error('Failed to fetch project total hours:', e);
    return 0;
  }
}

/**
 * Helper function to get the start of the week (Monday) for a given date
 */
function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Calculate days to previous Monday
  const monday = new Date(date); // Create new instance to avoid mutation
  monday.setDate(date.getDate() + diff);
  return monday.toISOString().split('T')[0];
}

/**
 * Get weekly worklog data for burn down chart (optimized for performance)
 * Returns cumulative hours spent per week
 * Uses worklogDate JQL filter (like Timesheet) and fetches in weekly chunks
 */
export async function getBurnDownData(
  projectKey: string,
  startDate: string,
  endDate: string
): Promise<{ date: string; cumulativeHours: number; weekStart: string }[]> {
  try {
    const jira = await getJiraClient();
    
    console.log('[BurnDown] ==========================================');
    console.log('[BurnDown] Fetching data for project:', projectKey);
    console.log('[BurnDown] Date range:', startDate, 'to', endDate);
    console.log('[BurnDown] ==========================================');
    
    // Split date range into weekly chunks for fetching
    const weekRanges: { start: string; end: string }[] = [];
    let currentWeekStart = getWeekStart(startDate);
    const projectEnd = new Date(endDate);
    
    while (new Date(currentWeekStart) <= projectEnd) {
      const weekStartDate = new Date(currentWeekStart);
      const weekEndDate = new Date(currentWeekStart);
      weekEndDate.setDate(weekStartDate.getDate() + 6); // Sunday
      
      const weekEnd = weekEndDate > projectEnd 
        ? endDate 
        : weekEndDate.toISOString().split('T')[0];
      
      weekRanges.push({
        start: currentWeekStart,
        end: weekEnd
      });
      
      // Move to next week
      const nextWeek = new Date(currentWeekStart);
      nextWeek.setDate(nextWeek.getDate() + 7);
      currentWeekStart = nextWeek.toISOString().split('T')[0];
    }
    
    console.log('[BurnDown] Fetching', weekRanges.length, 'weeks of data');
    
    // Collect all worklogs grouped by week
    const weeklyHours: { [weekStart: string]: number } = {};
    let totalIssuesFetched = 0;
    let totalWorklogsInRange = 0;
    
    // ✅ OPTIMIZATION: Parallelize weekly fetches using Promise.all()
    // This eliminates the sequential waterfall and fetches all weeks concurrently
    // Expected improvement: 2-3x faster for multi-week ranges
    const weeklyFetches = weekRanges.map(async (week) => {
      // Use worklogDate JQL filter (like Timesheet does)
      const jql = `project = "${projectKey}" AND worklogDate >= "${week.start}" AND worklogDate <= "${week.end}"`;
      
      console.log('[BurnDown] Fetching week:', week.start, 'to', week.end);
      console.log('[BurnDown] JQL:', jql);
      
      const search = await jira.issueSearch.searchForIssuesUsingJqlEnhancedSearchPost({
        jql,
        maxResults: 1000,
        fields: ['worklog']
      });
      
      const issues = search.issues || [];
      console.log('[BurnDown]   - Issues found:', issues.length);
      
      // Process worklogs from this week's issues
      const weekData: { [weekStart: string]: number } = {};
      let worklogCount = 0;
      
      for (const issue of issues) {
        const fields = issue.fields as any;
        const worklogs = fields.worklog?.worklogs || [];
        
        for (const log of worklogs) {
          const logDate = log.started.split('T')[0]; // Get YYYY-MM-DD
          
          // Only include logs within the overall date range and this week
          if (logDate >= week.start && logDate <= week.end && logDate >= startDate && logDate <= endDate) {
            worklogCount++;
            
            // Group by week start (Monday)
            const logWeekStart = getWeekStart(logDate);
            
            if (!weekData[logWeekStart]) {
              weekData[logWeekStart] = 0;
            }
            weekData[logWeekStart] += (log.timeSpentSeconds || 0) / 3600; // Convert to hours
          }
        }
      }
      
      return { issues: issues.length, worklogs: worklogCount, weekData };
    });
    
    // Wait for all weekly fetches to complete in parallel
    const weeklyResults = await Promise.all(weeklyFetches);
    
    // Aggregate results from all weeks
    for (const result of weeklyResults) {
      totalIssuesFetched += result.issues;
      totalWorklogsInRange += result.worklogs;
      
      // Merge week data
      for (const [weekStart, hours] of Object.entries(result.weekData)) {
        if (!weeklyHours[weekStart]) {
          weeklyHours[weekStart] = 0;
        }
        weeklyHours[weekStart] += hours;
      }
    }
    
    console.log('[BurnDown] ==========================================');
    console.log('[BurnDown] Summary:');
    console.log('[BurnDown]   - Total issues fetched:', totalIssuesFetched);
    console.log('[BurnDown]   - Worklogs within date range:', totalWorklogsInRange);
    console.log('[BurnDown]   - Unique weeks with data:', Object.keys(weeklyHours).length);
    console.log('[BurnDown]   - Weekly breakdown:', weeklyHours);
    console.log('[BurnDown] ==========================================');
    
    // Convert to array and sort by week start
    const sortedWeeks = Object.keys(weeklyHours).sort();
    
    // Calculate cumulative hours per week
    let cumulativeHours = 0;
    const result: { date: string; cumulativeHours: number; weekStart: string }[] = [];
    
    // Always include project start week (even if no worklogs)
    const projectStartWeek = getWeekStart(startDate);
    if (sortedWeeks.length === 0 || sortedWeeks[0] > projectStartWeek) {
      result.push({
        date: projectStartWeek,
        weekStart: projectStartWeek,
        cumulativeHours: 0
      });
    }
    
    // Add all weekly data points
    for (const weekStart of sortedWeeks) {
      cumulativeHours += weeklyHours[weekStart];
      result.push({
        date: weekStart,
        weekStart,
        cumulativeHours: Math.round(cumulativeHours * 100) / 100
      });
    }
    
    // DO NOT add project end week padding - it causes horizontal line in chart
    // The chart component will handle extending the ideal line to project end
    
    console.log('[BurnDown] Final result:', result.length, 'data points');
    console.log('[BurnDown] Data points:', result);
    console.log('[BurnDown] ==========================================');
    
    return result;
  } catch (e) {
    console.error('Failed to fetch burn down data:', e);
    return [];
  }
}
