'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getBurnDownData } from '@/actions/timesheet';

interface BurnDownDataPoint {
  date: string;
  idealHoursRemaining: number;
  actualHoursRemaining?: number;
  isLastWorklog?: boolean; // Flag for highlighting
}

interface BurnDownChartProps {
  offshoreBudget: number;
  offshoreSpentHours: number;
  planStartDate: string;
  planEndDate: string;
  projectKey: string;
}

export default function BurnDownChart({
  offshoreBudget,
  offshoreSpentHours,
  planStartDate,
  planEndDate,
  projectKey
}: BurnDownChartProps) {
  // HOOKS MUST BE CALLED FIRST - before any conditional returns
  const [chartData, setChartData] = useState<BurnDownDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [actualSpentHours, setActualSpentHours] = useState<number>(0);

  useEffect(() => {
    async function fetchBurnDownData() {
      // Check validations inside useEffect
      if (!planStartDate || !planEndDate || planStartDate === '-' || planEndDate === '-') {
        setLoading(false);
        return;
      }

      if (!offshoreBudget || offshoreBudget <= 0) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const start = new Date(planStartDate);
        const end = new Date(planEndDate);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          setLoading(false);
          return;
        }

        // Fetch actual worklog data from Jira (weekly cumulative hours)
        const worklogData = await getBurnDownData(projectKey, planStartDate, planEndDate);
        console.log('[Chart] Received worklog data:', worklogData.length, 'points');
        console.log('[Chart] Worklog data:', worklogData);
        
        // Create a map of week -> cumulative hours
        const worklogMap: { [weekStart: string]: number } = {};
        worklogData.forEach(item => {
          worklogMap[item.weekStart] = item.cumulativeHours;
        });
        
        // Find the last week with actual worklog data
        const weeksWithData = Object.keys(worklogMap).filter(w => worklogMap[w] > 0).sort();
        const lastWorklogWeek = weeksWithData.length > 0 ? weeksWithData[weeksWithData.length - 1] : null;
        console.log('[Chart] Last worklog week:', lastWorklogWeek);
        
        // Calculate ideal burn down (straight line from budget to 0)
        const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const dailyBurnRate = offshoreBudget / totalDays;
        
        // Generate ALL weekly checkpoints from start to end
        const data: BurnDownDataPoint[] = [];
        let currentWeek = new Date(start);
        currentWeek.setDate(currentWeek.getDate() - currentWeek.getDay() + 1); // Monday
        
        let lastCumulativeHours = 0; // Track cumulative hours for flat line after last worklog
        
        while (currentWeek <= end) {
          const weekStr = currentWeek.toISOString().split('T')[0];
          
          // Calculate ideal hours remaining for this week
          const daysElapsed = Math.ceil((currentWeek.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          const idealRemaining = Math.max(0, offshoreBudget - (daysElapsed * dailyBurnRate));
          
          // Get cumulative hours for this week (if exists, otherwise use last known value)
          const cumulativeHours = worklogMap[weekStr] !== undefined ? worklogMap[weekStr] : lastCumulativeHours;
          lastCumulativeHours = cumulativeHours;
          
          // Mark this as last worklog if it matches
          const isLastWorklog = lastWorklogWeek === weekStr;
          
          // Only include actual hours remaining up to the last worklog week
          // After that, stop the line to avoid confusing horizontal projection
          const actualRemaining = (weekStr <= (lastWorklogWeek || '9999-12-31'))
            ? Math.max(0, offshoreBudget - cumulativeHours)
            : undefined; // undefined will break the line
          
          data.push({
            date: currentWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            idealHoursRemaining: Math.round(idealRemaining * 10) / 10,
            actualHoursRemaining: actualRemaining !== undefined ? Math.round(actualRemaining * 10) / 10 : undefined,
            isLastWorklog
          });
          
          // Move to next week
          currentWeek.setDate(currentWeek.getDate() + 7);
        }
        
        console.log('[Chart] Generated chart data:', data.length, 'points');
        console.log('[Chart] Chart data:', data);
        
        // Store the actual cumulative hours for the status display
        const actualCumulativeHours = lastCumulativeHours;
        console.log('[Chart] Actual cumulative hours spent:', actualCumulativeHours);
        
        setChartData(data);
        setActualSpentHours(actualCumulativeHours);
      } catch (error) {
        console.error('Error fetching burn down data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchBurnDownData();
  }, [projectKey, planStartDate, planEndDate, offshoreBudget, offshoreSpentHours]);

  // Validation checks for rendering
  if (!planStartDate || !planEndDate || planStartDate === '-' || planEndDate === '-') {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#666', background: '#f9f9f9', borderRadius: 8 }}>
        <p>Please set project start and end dates to view burn down chart.</p>
      </div>
    );
  }

  if (!offshoreBudget || offshoreBudget <= 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#666', background: '#f9f9f9', borderRadius: 8 }}>
        <p>Please set offshore budget hours to view burn down chart.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
        <p>Loading burn down data...</p>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#666', background: '#f9f9f9', borderRadius: 8 }}>
        <p>No worklog data found for this project.</p>
        <p style={{ fontSize: '0.85rem', marginTop: '8px' }}>Check that:</p>
        <ul style={{ textAlign: 'left', display: 'inline-block', fontSize: '0.85rem' }}>
          <li>The project has logged hours in Jira</li>
          <li>Worklog dates fall within the project start/end dates</li>
        </ul>
      </div>
    );
  }

  
  // Calculate current status by comparing actual vs ideal at the latest data point
  let status = 'On Track';
  let statusColor = '#36B37E'; // Green
  
  // Find the last data point with actual hours remaining
  const lastActualPoint = chartData.slice().reverse().find(d => d.actualHoursRemaining !== undefined);
  
  if (lastActualPoint) {
    const actualRemaining = lastActualPoint.actualHoursRemaining || 0;
    const idealRemaining = lastActualPoint.idealHoursRemaining;
    
    // If actual is below ideal, we're burning hours faster than planned
    if (actualRemaining < idealRemaining) {
      status = 'At Risk';
      statusColor = '#FF5630'; // Red
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 15, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.85rem', color: '#5e6c84' }}>Budget Status</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: statusColor }}>{status}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.85rem', color: '#5e6c84' }}>Hours Remaining</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0052cc' }}>
            {Math.max(0, offshoreBudget - actualSpentHours).toFixed(1)} / {offshoreBudget}
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300} minHeight={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#dfe1e6" />
          <XAxis 
            dataKey="date" 
            stroke="#5e6c84"
            style={{ fontSize: '0.75rem' }}
          />
          <YAxis 
            stroke="#5e6c84"
            style={{ fontSize: '0.75rem' }}
            label={{ value: 'Hours Remaining', angle: -90, position: 'insideLeft', style: { fontSize: '0.8rem' } }}
          />
          <Tooltip 
            contentStyle={{ 
              background: 'white', 
              border: '1px solid #dfe1e6', 
              borderRadius: 4,
              fontSize: '0.85rem'
            }}
            formatter={(value: number | undefined, name: string | undefined) => {
              if (value === undefined) return ['', ''];
              
              // The 'name' parameter is the Line component's name prop value
              // "Ideal Burn Down" (blue line) -> "Ideal"
              // "Actual Hours Remaining" (green line) -> "Actual"
              const label = name === 'Ideal Burn Down' ? 'Ideal' : 'Actual';
              return [`${value} hrs`, label];
            }}
          />
          <Legend 
            wrapperStyle={{ fontSize: '0.85rem' }}
          />
          <Line 
            type="monotone" 
            dataKey="idealHoursRemaining" 
            stroke="#0052cc" 
            strokeWidth={2}
            name="Ideal Burn Down"
            dot={{ fill: '#0052cc', r: 3 }}
          />
          <Line 
            type="monotone" 
            dataKey="actualHoursRemaining" 
            stroke="#36B37E" 
            strokeWidth={2}
            strokeDasharray="5 5"
            name="Actual Hours Remaining"
            dot={(props: any) => {
              const { cx, cy, payload } = props;
              // Highlight last worklog point
              if (payload.isLastWorklog) {
                return (
                  <>
                    <circle cx={cx} cy={cy} r={6} fill="#FF991F" stroke="#FF6B00" strokeWidth={2} />
                    <circle cx={cx} cy={cy} r={3} fill="#FFF" />
                  </>
                );
              }
              return <circle cx={cx} cy={cy} r={3} fill="#36B37E" />;
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
