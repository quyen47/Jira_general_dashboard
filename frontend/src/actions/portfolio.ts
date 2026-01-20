'use server';

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
          const overviewResponse = await fetch(`${API_BASE}/projects/${project.key}/overview`, {
            cache: 'no-store',
          });

          if (!overviewResponse.ok) {
            return {
              key: project.key,
              name: project.name,
              overview: {},
              budget: {},
              offshoreSpentHours: 0,
              epics: [],
            };
          }

          const data = await overviewResponse.json();

          return {
            key: project.key,
            name: project.name,
            overview: data.overview || {},
            budget: data.budget || {},
            offshoreSpentHours: 0, // TODO: Fetch from timesheet
            epics: [], // TODO: Fetch epic data
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
