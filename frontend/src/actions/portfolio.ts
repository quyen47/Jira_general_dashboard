'use server';

import { getJiraClient } from '@/lib/jira';
import { getProjectTotalHours } from './timesheet';

/**
 * Fetch all projects with their overview data for portfolio insights
 */
/**
 * Fetch projects with pagination and overview data
 */
export async function getAllProjectsOverview({
  page = 1,
  limit = 10,
  search = '',
  status = '',
  enrich = true,
}: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  enrich?: boolean;
} = {}) {
  try {
    const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001/api';
    
    // Build query string
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (search) params.append('search', search);
    if (status) params.append('status', status);

    // Fetch paginated projects from backend
    const response = await fetch(`${API_BASE}/projects?${params.toString()}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('Failed to fetch projects:', response.statusText);
      return { projects: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } };
    }

    const json = await response.json();
    // Handle both paginated structure { data, meta } and potential legacy array fallback
    const projects = Array.isArray(json) ? json : (json.data || []);
    const meta = json.meta || { total: projects.length, page: 1, limit: 10, totalPages: 1 };

    // Fetch enrichment data for the current page only
    const projectsWithData = await Promise.all(
      projects.map(async (project: any) => {
        try {
          // Use overview from project object if available (optimization)
          const overview = project.overview || {};
          const budget = overview.budget || {};
          
          let offshoreSpentHours = 0;
          let epics: any[] = [];

          if (enrich) {
            // Fetch offshore hours from timesheet (same as project page)
            try {
              offshoreSpentHours = await getProjectTotalHours(project.key);
            } catch (error) {
              console.error(`Error fetching hours for ${project.key}:`, error);
            }

            // Fetch epics with progress (same as project page)
            try {
              const jira = await getJiraClient();
              const epicJql = `project = "${project.key}" AND issuetype = "Epic" AND statusCategory != Done`;
              const epicsSearch = await jira.issueSearch.searchForIssuesUsingJqlEnhancedSearchPost({
                jql: `${epicJql} ORDER BY created DESC`,
                maxResults: 50,
                fields: ['summary', 'status', 'created', 'duedate']
              });

              const epicIssues = epicsSearch.issues || [];
              
              if (epicIssues.length > 0) {
                const epicKeys = epicIssues.map((e: any) => e.key);
                const childrenJql = `parent in (${epicKeys.join(',')})`;
                
                const childrenSearch = await jira.issueSearch.searchForIssuesUsingJqlEnhancedSearchPost({
                  jql: childrenJql,
                  maxResults: 1000,
                  fields: ['parent', 'status']
                });

                const children = childrenSearch.issues || [];
                const epicStats: Record<string, { total: number, done: number }> = {};

                children.forEach((child: any) => {
                  const parentKey = child.fields.parent?.key;
                  if (parentKey) {
                    if (!epicStats[parentKey]) {
                      epicStats[parentKey] = { total: 0, done: 0 };
                    }
                    epicStats[parentKey].total++;
                    if (child.fields.status?.statusCategory?.key === 'done') {
                      epicStats[parentKey].done++;
                    }
                  }
                });

                epics = epicIssues.map((epic: any) => ({
                  key: epic.key,
                  summary: epic.fields.summary,
                  totalIssues: epicStats[epic.key]?.total || 0,
                  done: epicStats[epic.key]?.done || 0,
                }));
              }
            } catch (error) {
               // Suppress error log for epics
            }
          }


          // Calculate completion
          let percentComplete = parseFloat(overview.percentComplete || '0');
          if (epics && epics.length > 0) {
            let totalIssues = 0;
            let doneIssues = 0;
            epics.forEach((e: any) => {
              totalIssues += e.totalIssues || 0;
              doneIssues += e.done || 0;
            });
            percentComplete = totalIssues > 0 ? (doneIssues / totalIssues) * 100 : 0;
          }

          // Calculate budget
          const offshoreBudget = parseFloat(budget.offshoreBudgetHours || '0');
          
          // Calculate timeline progress
          let timelineProgress = 0;
          if (overview.planStartDate && overview.planEndDate) {
            const startDate = new Date(overview.planStartDate).getTime();
            const endDate = new Date(overview.planEndDate).getTime();
            const now = new Date().getTime();
            if (!isNaN(startDate) && !isNaN(endDate)) {
              const totalDuration = endDate - startDate;
              const elapsed = now - startDate;
              timelineProgress = totalDuration > 0 ? Math.min(Math.max(elapsed / totalDuration, 0), 1) * 100 : 0;
            }
          }

          // Determine schedule health
          let scheduleHealth = 'unknown';
          if (overview.planStartDate && overview.planEndDate) {
            const now = new Date().getTime();
            const endDate = new Date(overview.planEndDate).getTime();
            const isOvertime = now > endDate && overview.projectStatus === 'On Going';
            
            if (isOvertime) {
              scheduleHealth = 'overtime';
            } else if (percentComplete > timelineProgress + 10) {
              scheduleHealth = 'ahead';
            } else if (percentComplete < timelineProgress - 10) {
              scheduleHealth = 'behind';
            } else {
              scheduleHealth = 'on-track';
            }
          }

          // Determine Lead (DHA Project Manager)
          const dhaPm = project.stakeholders?.find((s: any) => s.role === 'DHA Project Manager');
          const finalLead = dhaPm?.displayName || project.lead || 'Unassigned';

          // Calculate offshore budget health
          const offshorePercentSpent = offshoreBudget > 0 ? (offshoreSpentHours / offshoreBudget) * 100 : 0;
          let budgetHealth = 'unknown';
          if (offshoreBudget > 0) {
            if (offshorePercentSpent > 100) {
              budgetHealth = 'over-budget';
            } else if (offshorePercentSpent > timelineProgress + 15) {
              budgetHealth = 'at-risk';
            } else {
              budgetHealth = 'healthy';
            }
          }

          return {
            key: project.key,
            name: project.name,
            overview,
            budget,
            avatarUrl: project.avatarUrl, // Assumed from DB sync
            scheduleHealth,
            budgetHealth,
            percentComplete,
            percentSpent: offshorePercentSpent,
            offshoreSpentHours,
            offshoreBudgetHours: offshoreBudget,
            projectStatus: overview.projectStatus || 'Unknown',
            schdHealth: overview.schdHealth || 'yellow',
            timelineProgress,
            lead: finalLead,
          };
        } catch (error) {
          console.error(`Error fetching overview/enrichment for ${project.key}:`, error);
          return {
            key: project.key,
            name: project.name,
            overview: project.overview || {},
            budget: project.overview?.budget || {},
            avatarUrl: project.avatarUrl,
            scheduleHealth: 'unknown',
            budgetHealth: 'unknown',
            percentComplete: 0,
            percentSpent: 0,
            offshoreSpentHours: 0,
            offshoreBudgetHours: 0,
            projectStatus: project.overview?.projectStatus || 'Unknown',
            schdHealth: 'yellow',
            timelineProgress: 0,
            lead: project.lead || 'Unassigned',
          };
        }
      })
    );

    return {
      projects: projectsWithData,
      pagination: meta,
    };
  } catch (error) {
    console.error('Error fetching all projects overview:', error);
    return { projects: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } };
  }
}
