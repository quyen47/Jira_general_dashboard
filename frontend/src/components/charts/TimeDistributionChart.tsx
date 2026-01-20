'use client';

import { DailyHours } from '@/actions/reports';

interface TimeDistributionChartProps {
  dailyHours: DailyHours[];
  height?: number;
}

export default function TimeDistributionChart({ dailyHours, height = 200 }: TimeDistributionChartProps) {
  console.log('TimeDistributionChart - dailyHours:', dailyHours);
  
  if (dailyHours.length === 0) {
    return (
      <div style={{ padding: '20px', background: 'white', borderRadius: 8, border: '1px solid #dfe1e6' }}>
        <h4 style={{ margin: '0 0 20px 0', fontSize: '0.95rem', color: '#172b4d' }}>
          📈 Time Distribution
        </h4>
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          No worklog data available for the selected time range
        </div>
      </div>
    );
  }

  const maxHours = Math.max(...dailyHours.map(d => d.hours), 1);
  const chartWidth = 100; // percentage

  return (
    <div style={{ padding: '20px', background: 'white', borderRadius: 8, border: '1px solid #dfe1e6' }}>
      <h4 style={{ margin: '0 0 20px 0', fontSize: '0.95rem', color: '#172b4d' }}>
        📈 Time Distribution
      </h4>
      
      <div style={{ position: 'relative', height: `${height}px` }}>
        {/* Y-axis labels */}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 20, width: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '0.75rem', color: '#5e6c84' }}>
          <div>{Math.ceil(maxHours)}h</div>
          <div>{Math.ceil(maxHours * 0.75)}h</div>
          <div>{Math.ceil(maxHours * 0.5)}h</div>
          <div>{Math.ceil(maxHours * 0.25)}h</div>
          <div>0h</div>
        </div>

        {/* Chart area */}
        <div style={{ position: 'absolute', left: '50px', right: 0, top: 0, bottom: 20, display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
          {dailyHours.map((day, index) => {
            const barHeight = (day.hours / maxHours) * 100;
            const isWeekend = new Date(day.date).getUTCDay() === 0 || new Date(day.date).getUTCDay() === 6;
            
            return (
              <div
                key={day.date}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}
                title={`${day.date}: ${day.hours}h`}
              >
                <div
                  style={{
                    width: '100%',
                    height: `${barHeight}%`,
                    background: isWeekend ? '#dfe1e6' : '#0052cc',
                    borderRadius: '4px 4px 0 0',
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isWeekend ? '#c1c7d0' : '#0065ff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isWeekend ? '#dfe1e6' : '#0052cc';
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* X-axis labels */}
        <div style={{ position: 'absolute', left: '50px', right: 0, bottom: 0, height: '20px', display: 'flex', gap: '4px' }}>
          {dailyHours.map((day) => {
            const date = new Date(day.date);
            const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' });
            
            return (
              <div
                key={day.date}
                style={{ flex: 1, fontSize: '0.7rem', color: '#5e6c84', textAlign: 'center' }}
                title={day.date}
              >
                {dayLabel}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div style={{ marginTop: '15px', display: 'flex', gap: '20px', fontSize: '0.75rem', color: '#5e6c84', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: 12, height: 12, background: '#0052cc', borderRadius: 2 }} />
          <span>Weekday</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: 12, height: 12, background: '#dfe1e6', borderRadius: 2 }} />
          <span>Weekend</span>
        </div>
      </div>
    </div>
  );
}
