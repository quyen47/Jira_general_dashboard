/**
 * Helper functions for capacity calculations
 */

/**
 * Calculate number of work days between two dates (excluding weekends)
 */
export function calculateWorkDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let workDays = 0;

  const current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getDay();
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workDays++;
    }
    current.setDate(current.getDate() + 1);
  }

  return workDays;
}

/**
 * Calculate available hours based on allocation % and work days
 */
export function calculateAvailableHours(allocationPercent: number, workDays: number): number {
  const hoursPerDay = 8;
  return workDays * (allocationPercent / 100) * hoursPerDay;
}

/**
 * Calculate utilization percentage
 */
export function calculateUtilization(actualHours: number, availableHours: number): number {
  if (availableHours === 0) return 0;
  return (actualHours / availableHours) * 100;
}

/**
 * Determine capacity status
 */
export function determineStatus(
  utilizationPercent: number,
  allocationPercent: number
): 'optimal' | 'overloaded' | 'underloaded' | 'at-risk' {
  // Overloaded: allocation > 100% OR utilization > 100%
  if (allocationPercent > 100 || utilizationPercent > 100) {
    return 'overloaded';
  }

  // At risk: utilization between 100-120%
  if (utilizationPercent >= 100 && utilizationPercent <= 120) {
    return 'at-risk';
  }

  // Underloaded: allocation < 50% OR utilization < 50%
  if (allocationPercent < 50 || utilizationPercent < 50) {
    return 'underloaded';
  }

  // Optimal: 80-100% utilization
  return 'optimal';
}

/**
 * Get Monday of the week for a given date
 */
export function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Calculate days to previous Monday
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  return monday.toISOString().split('T')[0];
}

/**
 * Get Sunday of the week for a given date
 */
export function getWeekEnd(dateStr: string): string {
  const weekStart = getWeekStart(dateStr);
  const sunday = new Date(weekStart);
  sunday.setDate(sunday.getDate() + 6);
  return sunday.toISOString().split('T')[0];
}

/**
 * Get status color configuration
 */
export function getStatusConfig(status: 'optimal' | 'overloaded' | 'underloaded' | 'at-risk') {
  const configs = {
    optimal: {
      color: '#36B37E',
      bgColor: '#E3FCEF',
      borderColor: '#36B37E',
      label: '✅ Optimal'
    },
    overloaded: {
      color: '#FF5630',
      bgColor: '#FFEBE6',
      borderColor: '#FF5630',
      label: '⚠️ Overloaded'
    },
    underloaded: {
      color: '#FFAB00',
      bgColor: '#FFF0B3',
      borderColor: '#FFAB00',
      label: '⚠️ Underload'
    },
    'at-risk': {
      color: '#FF991F',
      bgColor: '#FFF4E5',
      borderColor: '#FF991F',
      label: '⚡ At Risk'
    }
  };

  return configs[status];
}
