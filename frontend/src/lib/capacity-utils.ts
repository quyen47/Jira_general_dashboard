/**
 * Enhanced capacity calculation utilities with support for multiple allocations over time
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
    const dayOfWeek = current.getUTCDay();
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workDays++;
    }
    current.setUTCDate(current.getUTCDate() + 1);
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
 * Calculate weighted average allocation across multiple allocation periods
 * @param allocations - Array of allocations with date ranges
 * @param rangeStart - Start of the period to calculate for
 * @param rangeEnd - End of the period to calculate for
 * @returns Weighted average allocation percentage and total available hours
 */
export function calculateWeightedAllocation(
  allocations: Array<{
    startDate: string;
    endDate: string;
    allocationPercent: number;
  }>,
  rangeStart: string,
  rangeEnd: string
): {
  weightedAllocation: number;
  totalAvailableHours: number;
  allocationPeriods: Array<{
    startDate: string;
    endDate: string;
    allocationPercent: number;
    workDays: number;
    availableHours: number;
  }>;
} {
  if (allocations.length === 0) {
    return {
      weightedAllocation: 0,
      totalAvailableHours: 0,
      allocationPeriods: []
    };
  }

  const rangeStartDate = new Date(rangeStart);
  const rangeEndDate = new Date(rangeEnd);
  
  let totalWeightedAllocation = 0;
  let totalWorkDays = 0;
  let totalAvailableHours = 0;
  const allocationPeriods: Array<{
    startDate: string;
    endDate: string;
    allocationPercent: number;
    workDays: number;
    availableHours: number;
  }> = [];

  // Process each allocation period
  allocations.forEach(allocation => {
    const allocStart = new Date(allocation.startDate);
    const allocEnd = new Date(allocation.endDate);

    // Find the overlap between allocation period and requested range
    const overlapStart = allocStart > rangeStartDate ? allocStart : rangeStartDate;
    const overlapEnd = allocEnd < rangeEndDate ? allocEnd : rangeEndDate;

    // Only process if there's an overlap
    if (overlapStart <= overlapEnd) {
      const overlapStartStr = overlapStart.toISOString().split('T')[0];
      const overlapEndStr = overlapEnd.toISOString().split('T')[0];
      
      const workDays = calculateWorkDays(overlapStartStr, overlapEndStr);
      const availableHours = calculateAvailableHours(allocation.allocationPercent, workDays);

      totalWeightedAllocation += allocation.allocationPercent * workDays;
      totalWorkDays += workDays;
      totalAvailableHours += availableHours;

      allocationPeriods.push({
        startDate: overlapStartStr,
        endDate: overlapEndStr,
        allocationPercent: allocation.allocationPercent,
        workDays,
        availableHours
      });
    }
  });

  const weightedAllocation = totalWorkDays > 0 ? totalWeightedAllocation / totalWorkDays : 0;

  return {
    weightedAllocation: Math.round(weightedAllocation * 10) / 10,
    totalAvailableHours: Math.round(totalAvailableHours * 10) / 10,
    allocationPeriods
  };
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
  const diff = day === 0 ? -6 : 1 - day;
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
