'use server';

import { getJiraClient } from '@/lib/jira';
import { getProjectTotalHours } from './timesheet';

/**
 * Fetch all projects with their overview data for portfolio insights
 */
export async function getAllProjectsOverview() {
  try {
    const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001/api';
    
    // Fetch all projects from backend
    const response = await fetch(`${API_BASE}/projects`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('Failed to fetch projects:', response.statusText);
      return [];
    }

    const projects = await response.json();

    // Fetch overview data for each project
    const projectsWithData = await Promise.all(
      projects.map(async (project: any) => {
        try {
          // Fetch overview from backend
          const overviewResponse = await fetch(`${API_BASE}/projects/${project.key}/overview`, {
            cache: 'no-store',
          });

          let overview = {};
          let budget = {};
          
          if (overviewResponse.ok) {
            const data = await overviewResponse.json();
            overview = data.overview || {};
            budget = data.budget || {};
          }

          // Fetch offshore hours from timesheet (same as project page)
          let offshoreSpentHours = 0;
          try {
            offshoreSpentHours = await getProjectTotalHours(project.key);
          } catch (error) {
            console.error(`Error fetching hours for ${project.key}:`, error);
          }

          // Fetch epics with progress (same as project page)
          let epics: any[] = [];
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
            console.error(`Error fetching epics for ${project.key}:`, error);
          }

          return {
            key: project.key,
            name: project.name,
            overview,
            budget,
            offshoreSpentHours,
            epics,
          };
        } catch (error) {
          console.error(`Error fetching overview for ${project.key}:`, error);
          return {
            key: project.key,
            name: project.name,
            overview: {},
            budget: {},
            offshoreSpentHours: 0,
            epics: [],
          };
        }
      })
    );

    return projectsWithData;
  } catch (error) {
    console.error('Error fetching all projects overview:', error);
    return [];
  }
}
