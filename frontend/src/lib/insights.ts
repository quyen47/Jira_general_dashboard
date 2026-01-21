/**
 * Insights calculation engine for Project Overview Dashboard
 * Generates data-driven insights from project metrics
 */

export interface ProjectInsights {
  schedule: ScheduleInsight;
  budget: BudgetInsight;
  velocity: VelocityInsight;
  team: TeamInsight;
  alerts: Alert[];
}

export interface ScheduleInsight {
  status: 'ahead' | 'on-track' | 'behind' | 'overtime';
  percentComplete: number;
  percentTimeElapsed: number;
  variance: number; // positive = ahead, negative = behind
  daysAheadBehind: number;
  projectedEndDate: string;
  message: string;
}

export interface BudgetInsight {
  status: 'healthy' | 'at-risk' | 'over-budget';
  percentSpent: number;
  percentTimeElapsed: number;
  variance: number; // positive = burning too fast
  remainingBudget: number;
  weeklyBurnRate: number;
  weeksOfRunway: number;
  message: string;
}

export interface VelocityInsight {
  issuesPerWeek: number;
  hoursPerWeek: number;
  trend: 'up' | 'stable' | 'down';
  projectedCompletion: string;
  message: string;
}

export interface TeamInsight {
  activeMembers: number;
  totalMembers: number;
  hoursThisWeek: number;
  utilizationPercent: number;
  topContributor: string;
  message: string;
}

export interface Alert {
  type: 'critical' | 'warning' | 'positive';
  message: string;
  priority: number;
}

export interface Recommendation {
  type: 'action' | 'opportunity' | 'optimization';
  message: string;
  priority: number;
  action: string;
}

/**
 * Calculate schedule health and insights
 */
export function calculateScheduleInsights(
  percentComplete: number,
  startDate: string,
  endDate: string,
  projectStatus: string
): ScheduleInsight {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = new Date().getTime();

  // Handle invalid dates
  if (isNaN(start) || isNaN(end) || !startDate || !endDate) {
    return {
      status: 'on-track',
      percentComplete: 0,
      percentTimeElapsed: 0,
      variance: 0,
      daysAheadBehind: 0,
      projectedEndDate: endDate || '',
      message: 'Set start and end dates to see schedule insights',
    };
  }

  const totalDuration = end - start;
  const elapsed = now - start;
  const percentTimeElapsed = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
  
  // Check if overtime
  const isOvertime = now > end && projectStatus === 'On Going';
  
  if (isOvertime) {
    const daysOvertime = Math.floor((now - end) / (1000 * 60 * 60 * 24));
    return {
      status: 'overtime',
      percentComplete,
      percentTimeElapsed: 100,
      variance: percentComplete - 100,
      daysAheadBehind: -daysOvertime,
      projectedEndDate: endDate,
      message: `🚨 Project is ${daysOvertime} days overdue`,
    };
  }

  // Calculate variance (positive = ahead, negative = behind)
  const variance = percentComplete - percentTimeElapsed;
  
  // Calculate days ahead/behind
  const daysAheadBehind = Math.round((variance / 100) * (totalDuration / (1000 * 60 * 60 * 24)));
  
  // Project completion date based on current velocity
  let projectedEndDate = endDate;
  if (percentComplete > 0 && percentComplete < 100) {
    const velocity = percentComplete / percentTimeElapsed;
    const remainingTime = ((100 - percentComplete) / velocity) * elapsed;
    const projected = start + elapsed + remainingTime;
    projectedEndDate = new Date(projected).toISOString().split('T')[0];
  }

  // Determine status and message
  let status: 'ahead' | 'on-track' | 'behind' = 'on-track';
  let message = '';

  if (variance > 10) {
    status = 'ahead';
    message = `✅ Project is ${Math.abs(daysAheadBehind)} days ahead of schedule`;
  } else if (variance < -10) {
    status = 'behind';
    message = `🔴 Project is ${Math.abs(daysAheadBehind)} days behind schedule`;
  } else {
    message = `🟡 Project is on track`;
  }

  return {
    status,
    percentComplete,
    percentTimeElapsed,
    variance,
    daysAheadBehind,
    projectedEndDate,
    message,
  };
}

/**
 * Calculate budget health and insights
 */
export function calculateBudgetInsights(
  totalBudget: number,
  totalSpent: number,
  startDate: string,
  endDate: string
): BudgetInsight {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = new Date().getTime();

  // Handle invalid data
  if (totalBudget === 0 || isNaN(start) || isNaN(end)) {
    return {
      status: 'healthy',
      percentSpent: 0,
      percentTimeElapsed: 0,
      variance: 0,
      remainingBudget: totalBudget,
      weeklyBurnRate: 0,
      weeksOfRunway: 0,
      message: 'Set budget and dates to see budget insights',
    };
  }

  const percentSpent = (totalSpent / totalBudget) * 100;
  const totalDuration = end - start;
  const elapsed = now - start;
  const percentTimeElapsed = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
  
  // Calculate variance (positive = burning too fast)
  const variance = percentSpent - percentTimeElapsed;
  
  const remainingBudget = totalBudget - totalSpent;
  const weeksElapsed = elapsed / (1000 * 60 * 60 * 24 * 7);
  const weeklyBurnRate = weeksElapsed > 0 ? totalSpent / weeksElapsed : 0;
  const weeksOfRunway = weeklyBurnRate > 0 ? remainingBudget / weeklyBurnRate : 999;

  // Determine status and message
  let status: 'healthy' | 'at-risk' | 'over-budget' = 'healthy';
  let message = '';

  if (percentSpent > 100) {
    status = 'over-budget';
    message = `🚨 Budget exceeded by ${(percentSpent - 100).toFixed(1)}%`;
  } else if (variance > 15) {
    status = 'at-risk';
    message = `⚠️ Burning ${variance.toFixed(1)}% faster than schedule`;
  } else if (variance > 5) {
    status = 'at-risk';
    message = `⚠️ Budget consumption slightly ahead of schedule`;
  } else if (variance < -10) {
    message = `✅ Budget consumption ${Math.abs(variance).toFixed(1)}% below plan`;
  } else {
    message = `🟢 Budget on track`;
  }

  return {
    status,
    percentSpent,
    percentTimeElapsed,
    variance,
    remainingBudget,
    weeklyBurnRate,
    weeksOfRunway,
    message,
  };
}

/**
 * Generate alerts based on all insights
 */
export function generateAlerts(
  schedule: ScheduleInsight,
  budget: BudgetInsight,
  epics: any[]
): Alert[] {
  const alerts: Alert[] = [];

  // Critical alerts
  if (schedule.status === 'overtime') {
    alerts.push({
      type: 'critical',
      message: schedule.message,
      priority: 100,
    });
  }

  if (budget.status === 'over-budget') {
    alerts.push({
      type: 'critical',
      message: budget.message,
      priority: 90,
    });
  }

  if (schedule.status === 'behind' && Math.abs(schedule.daysAheadBehind) > 14) {
    alerts.push({
      type: 'critical',
      message: `🚨 Project is ${Math.abs(schedule.daysAheadBehind)} days behind schedule`,
      priority: 85,
    });
  }

  // Warning alerts
  if (budget.status === 'at-risk') {
    if (budget.weeksOfRunway < 4) {
      alerts.push({
        type: 'warning',
        message: `⚠️ Budget will run out in ${budget.weeksOfRunway.toFixed(1)} weeks`,
        priority: 70,
      });
    } else {
      alerts.push({
        type: 'warning',
        message: budget.message,
        priority: 60,
      });
    }
  }

  if (schedule.status === 'behind') {
    alerts.push({
      type: 'warning',
      message: schedule.message,
      priority: 65,
    });
  }

  // Check for stale epics
  if (epics && epics.length > 0) {
    const staleEpics = epics.filter(e => {
      const pct = e.totalIssues > 0 ? (e.done / e.totalIssues) * 100 : 0;
      return pct === 0 && e.totalIssues > 0;
    });

    if (staleEpics.length > 0) {
      alerts.push({
        type: 'warning',
        message: `⚠️ ${staleEpics.length} epic(s) have no progress`,
        priority: 55,
      });
    }
  }

  // Positive alerts
  if (schedule.status === 'ahead') {
    alerts.push({
      type: 'positive',
      message: schedule.message,
      priority: 30,
    });
  }

  if (budget.variance < -10) {
    alerts.push({
      type: 'positive',
      message: budget.message,
      priority: 25,
    });
  }

  // Sort by priority (highest first)
  return alerts.sort((a, b) => b.priority - a.priority);
}

/**
 * Generate actionable recommendations based on project insights
 * These should be unique solutions, not duplicating alert messages
 */
export function generateRecommendations(
  schedule: ScheduleInsight,
  budget: BudgetInsight,
  epics: any[]
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Only provide recommendations for situations that need specific actions
  // Avoid duplicating what's already in alerts
  
  // Action: Over budget - provide specific recovery options
  if (budget.status === 'over-budget') {
    recommendations.push({
      type: 'action',
      message: 'Budget Recovery Options',
      action: 'Request additional budget, reduce scope, or optimize resource allocation to bring costs under control',
      priority: 100,
    });
  }

  // Action: Overtime - provide escalation path
  if (schedule.status === 'overtime') {
    recommendations.push({
      type: 'action',
      message: 'Immediate Actions Required',
      action: 'Add resources, work overtime, or negotiate timeline extension with stakeholders',
      priority: 95,
    });
  }

  // Action: Low runway - provide funding options
  if (budget.weeksOfRunway < 4 && budget.weeksOfRunway > 0) {
    recommendations.push({
      type: 'action',
      message: 'Extend Budget Runway',
      action: 'Secure additional funding immediately or reduce team size to extend runway',
      priority: 90,
    });
  }

  // Action: Behind schedule + burning budget fast - provide combined solution
  if (schedule.status === 'behind' && budget.variance > 10) {
    const workRemaining = 100 - schedule.percentComplete;
    const scopeReduction = Math.round(workRemaining * 0.3);
    const daysDelay = Math.abs(schedule.daysAheadBehind);
    const manMonthsNeeded = (daysDelay / 30) * 2;
    
    recommendations.push({
      type: 'action',
      message: 'Recovery Strategy',
      action: `Option 1: Reduce scope by ${scopeReduction}% to align with budget | Option 2: Secure ${Math.round(budget.variance)}% additional budget and add ${manMonthsNeeded.toFixed(1)} man-months of senior resources | Option 3: Extend timeline by ${daysDelay} days`,
      priority: 85,
    });
  }

  // Action: Significantly behind schedule - provide resource calculation
  if (schedule.status === 'behind' && Math.abs(schedule.daysAheadBehind) > 14) {
    const daysDelay = Math.abs(schedule.daysAheadBehind);
    const workRemaining = 100 - schedule.percentComplete;
    const catchUpWorkDays = (workRemaining / 100) * daysDelay;
    const manMonthsNeeded = (catchUpWorkDays / 30) * 1.5;
    const scopeReduction = Math.round(workRemaining * 0.2);
    
    recommendations.push({
      type: 'action',
      message: 'Catch-Up Plan',
      action: `Add ${manMonthsNeeded.toFixed(1)} man-months to critical path (${Math.ceil(manMonthsNeeded)} person for 1 month or ${Math.ceil(manMonthsNeeded * 2)} people for 0.5 months), OR reduce non-essential features by ${scopeReduction}%, OR extend deadline by ${daysDelay} days`,
      priority: 80,
    });
  }

  // Action: Moderately behind schedule - provide acceleration options
  if (schedule.status === 'behind' && Math.abs(schedule.daysAheadBehind) <= 14 && Math.abs(schedule.daysAheadBehind) > 0) {
    const daysDelay = Math.abs(schedule.daysAheadBehind);
    const workRemaining = 100 - schedule.percentComplete;
    const catchUpWorkDays = (workRemaining / 100) * daysDelay;
    const manMonthsNeeded = (catchUpWorkDays / 30) * 1.2;
    const scopeReduction = Math.round(workRemaining * 0.1);
    
    recommendations.push({
      type: 'action',
      message: 'Acceleration Options',
      action: `Add ${manMonthsNeeded.toFixed(1)} man-months (e.g., ${Math.ceil(manMonthsNeeded)} person for 1 month) to accelerate delivery, OR identify and remove blockers, OR reduce scope by ${scopeReduction}%`,
      priority: 70,
    });
  }

  // Optimization: Burning budget too fast
  if (budget.status === 'at-risk' && budget.variance > 15) {
    recommendations.push({
      type: 'optimization',
      message: 'Optimize Resource Allocation',
      action: 'Review resource allocation, reduce non-essential work, or optimize team composition to slow burn rate',
      priority: 65,
    });
  }

  // Action: Stale epics - provide specific actions
  if (epics && epics.length > 0) {
    const staleEpics = epics.filter(e => {
      const pct = e.totalIssues > 0 ? (e.done / e.totalIssues) * 100 : 0;
      return pct === 0 && e.totalIssues > 0;
    });

    if (staleEpics.length > 0) {
      recommendations.push({
        type: 'action',
        message: 'Address Stale Epics',
        action: 'Review and prioritize stale epics, assign resources, or consider descoping',
        priority: 60,
      });
    }
  }

  // Optimization: Moderate budget risk
  if (budget.status === 'at-risk' && budget.variance > 5 && budget.variance <= 15) {
    recommendations.push({
      type: 'optimization',
      message: 'Monitor Budget Closely',
      action: 'Monitor burn rate closely and optimize resource utilization to prevent budget overrun',
      priority: 50,
    });
  }

  // Opportunity: Ahead of schedule
  if (schedule.status === 'ahead' && schedule.daysAheadBehind > 7) {
    recommendations.push({
      type: 'opportunity',
      message: 'Leverage Schedule Advantage',
      action: 'Consider adding value-add features, improving quality, or delivering early to exceed expectations',
      priority: 40,
    });
  }

  // Opportunity: Under budget
  if (budget.variance < -15 && budget.status === 'healthy') {
    recommendations.push({
      type: 'opportunity',
      message: 'Invest Budget Surplus',
      action: 'Consider investing in quality improvements, technical debt reduction, or additional features',
      priority: 35,
    });
  }

  // Opportunity: Good runway
  if (budget.weeksOfRunway > 12 && budget.status === 'healthy') {
    recommendations.push({
      type: 'opportunity',
      message: 'Maintain Quality Standards',
      action: 'Project is well-funded - maintain current pace and quality standards',
      priority: 30,
    });
  }

  // Sort by priority (highest first)
  return recommendations.sort((a, b) => b.priority - a.priority);
}
