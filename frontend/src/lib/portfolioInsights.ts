/**
 * Portfolio-level insights aggregation
 * Calculates health metrics across all projects
 */

import { 
  calculateScheduleInsights, 
  calculateBudgetInsights, 
  generateAlerts,
  Alert 
} from './insights';

export interface ProjectWithInsights {
  key: string;
  name: string;
  scheduleHealth: 'ahead' | 'on-track' | 'behind' | 'overtime';
  budgetHealth: 'healthy' | 'at-risk' | 'over-budget';
  alerts: Alert[];
  percentComplete: number;
  percentSpent: number;
}

export interface PortfolioInsights {
  totalProjects: number;
  health: {
    green: number;
    yellow: number;
    red: number;
  };
  atRiskProjects: ProjectWithInsights[];
  schedulePerformance: {
    ahead: number;
    onTrack: number;
    behind: number;
    overtime: number;
  };
  budgetPerformance: {
    healthy: number;
    atRisk: number;
    overBudget: number;
  };
  allAlerts: (Alert & { projectKey: string; projectName: string })[];
  topRisks: string[];
}

/**
 * Calculate portfolio-level insights from all projects
 */
export function calculatePortfolioInsights(
  projects: Array<{
    key: string;
    name: string;
    overview: any;
    budget: any;
    offshoreSpentHours: number;
    epics: any[];
  }>
): PortfolioInsights {
  const insights: PortfolioInsights = {
    totalProjects: projects.length,
    health: { green: 0, yellow: 0, red: 0 },
    atRiskProjects: [],
    schedulePerformance: { ahead: 0, onTrack: 0, behind: 0, overtime: 0 },
    budgetPerformance: { healthy: 0, atRisk: 0, overBudget: 0 },
    allAlerts: [],
    topRisks: [],
  };

  const projectsWithInsights: ProjectWithInsights[] = [];

  projects.forEach(project => {
    // Calculate epic completion
    let percentComplete = 0;
    if (project.epics && project.epics.length > 0) {
      let totalIssues = 0;
      let doneIssues = 0;
      project.epics.forEach((e: any) => {
        totalIssues += e.totalIssues || 0;
        doneIssues += e.done || 0;
      });
      percentComplete = totalIssues > 0 ? (doneIssues / totalIssues) * 100 : 0;
    } else {
      percentComplete = parseFloat(project.overview?.percentComplete || '0');
    }

    // Calculate budget
    const onshoreBudget = parseFloat(project.budget?.onshoreBudgetHours || '0');
    const offshoreBudget = parseFloat(project.budget?.offshoreBudgetHours || '0');
    const totalBudget = onshoreBudget + offshoreBudget;
    const onshoreSpent = parseFloat(project.budget?.onshoreSpentHours || '0');
    const totalSpent = onshoreSpent + project.offshoreSpentHours;

    // Calculate insights for this project
    const scheduleInsights = calculateScheduleInsights(
      percentComplete,
      project.overview?.planStartDate || '',
      project.overview?.planEndDate || '',
      project.overview?.projectStatus || ''
    );

    const budgetInsights = calculateBudgetInsights(
      totalBudget,
      totalSpent,
      project.overview?.planStartDate || '',
      project.overview?.planEndDate || ''
    );

    const alerts = generateAlerts(scheduleInsights, budgetInsights, project.epics || []);

    // Aggregate schedule performance
    if (scheduleInsights.status === 'ahead') insights.schedulePerformance.ahead++;
    else if (scheduleInsights.status === 'overtime') insights.schedulePerformance.overtime++;
    else if (scheduleInsights.status === 'behind') insights.schedulePerformance.behind++;
    else insights.schedulePerformance.onTrack++;

    // Aggregate budget performance
    if (budgetInsights.status === 'healthy') insights.budgetPerformance.healthy++;
    else if (budgetInsights.status === 'over-budget') insights.budgetPerformance.overBudget++;
    else insights.budgetPerformance.atRisk++;

    // Aggregate health (based on schedule + budget)
    const hasCritical = alerts.some(a => a.type === 'critical');
    const hasWarning = alerts.some(a => a.type === 'warning');
    
    if (hasCritical) {
      insights.health.red++;
    } else if (hasWarning) {
      insights.health.yellow++;
    } else {
      insights.health.green++;
    }

    // Track at-risk projects
    if (hasCritical || hasWarning) {
      projectsWithInsights.push({
        key: project.key,
        name: project.name,
        scheduleHealth: scheduleInsights.status,
        budgetHealth: budgetInsights.status,
        alerts,
        percentComplete,
        percentSpent: budgetInsights.percentSpent,
      });
    }

    // Collect all alerts with project context
    alerts.forEach(alert => {
      insights.allAlerts.push({
        ...alert,
        projectKey: project.key,
        projectName: project.name,
      });
    });
  });

  // Sort at-risk projects by severity (most critical first)
  insights.atRiskProjects = projectsWithInsights.sort((a, b) => {
    const aCritical = a.alerts.filter(alert => alert.type === 'critical').length;
    const bCritical = b.alerts.filter(alert => alert.type === 'critical').length;
    return bCritical - aCritical;
  });

  // Sort all alerts by priority
  insights.allAlerts.sort((a, b) => b.priority - a.priority);

  // Extract top risks (most common alert messages)
  const riskCounts = new Map<string, number>();
  insights.allAlerts.forEach(alert => {
    const baseMessage = alert.message.replace(/Project \w+:/, '').trim();
    riskCounts.set(baseMessage, (riskCounts.get(baseMessage) || 0) + 1);
  });

  insights.topRisks = Array.from(riskCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([message, count]) => count > 1 ? `${count} projects: ${message}` : message);

  return insights;
}
