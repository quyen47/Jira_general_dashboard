'use client';

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer,  Tooltip, Legend } from 'recharts';

interface Project {
  key: string;
}

interface AggregatedData {
  phases: { [key: string]: number };
  health: { green: number; yellow: number; red: number };
  margins: { high: number; medium: number; low: number }; // >80, 50-80, <50
  values: { small: number; medium: number; large: number; enterprise: number; mega: number }; // <100k, 100-500k, 500k-1m, 1m-5m, >5m
  complexity: { Low: number; Medium: number; High: number };
  locations: { [key: string]: number };
}

const COLORS_PHASE = ['#0052cc', '#00B8D9', '#36B37E', '#FFAB00', '#6554C0'];
const COLORS_HEALTH = ['#36B37E', '#FFAB00', '#FF5630'];
const COLORS_MARGIN = ['#36B37E', '#FFAB00', '#FF5630']; // High (Green), Med (Yellow), Low (Red)

const DEFAULT_OVERVIEW = {
    schdHealth: 'yellow',
    complexity: 'Medium',
    projectType: 'T&M',
    currentPhase: 'Validate',
    bpwTargetMargin: '75%',
    currentMargin: '68%',
    clientLocation: 'Hawaii',
};

export default function PortfolioSummary({ projects }: { projects: Project[] }) {
  const [data, setData] = useState<AggregatedData | null>(null);

  useEffect(() => {
    const aggr: AggregatedData = {
      phases: {},
      health: { green: 0, yellow: 0, red: 0 },
      margins: { high: 0, medium: 0, low: 0 },
      values: { small: 0, medium: 0, large: 0, enterprise: 0, mega: 0 },
      complexity: { Low: 0, Medium: 0, High: 0 },
      locations: {}
    };

    projects.forEach(p => {
      let overview: any = DEFAULT_OVERVIEW;
      let budgetOverall: any[] = [];
      
      const saved = localStorage.getItem(`jira_dashboard_overview_${p.key}`);
      if (saved) {
        try {
          const pData = JSON.parse(saved);
          if (pData.overview) overview = { ...DEFAULT_OVERVIEW, ...pData.overview };
          if (pData.budgetOverall) budgetOverall = pData.budgetOverall;
        } catch (e) {
          console.error(e);
        }
      }

      // Phase
      const phase = overview.currentPhase || 'Unknown';
      aggr.phases[phase] = (aggr.phases[phase] || 0) + 1;

      // Health
      if (overview.schdHealth === 'green') aggr.health.green++;
      else if (overview.schdHealth === 'yellow') aggr.health.yellow++;
      else if (overview.schdHealth === 'red') aggr.health.red++;

      // Margin
      const marginStr = overview.currentMargin || '0%';
      const margin = parseFloat(marginStr.replace('%', ''));
      if (margin > 80) aggr.margins.high++;
      else if (margin >= 50) aggr.margins.medium++;
      else aggr.margins.low++;

      // Complexity
      const comp = overview.complexity || 'Medium';
      if (aggr.complexity[comp as keyof typeof aggr.complexity] !== undefined) {
          aggr.complexity[comp as keyof typeof aggr.complexity]++;
      } else {
          aggr.complexity['Medium']++; // Default
      }

      // Location
      const loc = overview.clientLocation || 'Unknown';
      aggr.locations[loc] = (aggr.locations[loc] || 0) + 1;
      
      // Value
      // Fallback budget if not in saved data
      const budgetStr = budgetOverall?.[1]?.budget || '$350,000'; // Default from ProjectOverview
      const budget = parseFloat(budgetStr.replace(/[^0-9.]/g, ''));
      
      if (budget < 100000) aggr.values.small++;
      else if (budget < 500000) aggr.values.medium++;
      else if (budget < 1000000) aggr.values.large++;
      else if (budget < 5000000) aggr.values.enterprise++;
      else aggr.values.mega++;
    });

    setData(aggr);
  }, [projects]);

  if (!data) return null;

  // Chart Rendering Helpers
  const renderDonut = (title: string, dataKey: any, colors: string[], isSemiCircle = true) => {
    // Transform object to array
    const chartData = Object.keys(dataKey).map((key, i) => ({
      name: key,
      value: dataKey[key]
    })).filter(d => d.value > 0);

    return (
      <div style={{ background: '#f4f5f7', borderRadius: 8, padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: '#172b4d', textAlign: 'center' }}>{title}</h3>
        <div style={{ width: '100%', height: 160, position: 'relative' }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy={isSemiCircle ? "100%" : "50%"}
                startAngle={isSemiCircle ? 180 : 90}
                endAngle={isSemiCircle ? 0 : -270}
                innerRadius={isSemiCircle ? 60 : 40}
                outerRadius={isSemiCircle ? 100 : 70}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign={isSemiCircle ? "top" : "bottom"} align="center" wrapperStyle={isSemiCircle ? { top: 0 } : {}} iconSize={8} formatter={(value, entry: any) => <span style={{fontSize: '0.75rem', color: '#172b4d'}}>{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
          {/* Label specific for semi-circle center if needed */}
        </div>
      </div>
    );
  };

  return (
    <div style={{ marginBottom: '30px' }}>
      <div style={{ background: '#0747A6', color: 'white', padding: '10px 20px', borderRadius: '4px 4px 0 0', fontWeight: 'bold', textAlign: 'center', fontSize: '1.1rem' }}>
        Portfolio Summary
      </div>
      <div style={{ background: 'white', padding: '20px', borderRadius: '0 0 4px 4px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
        
        {/* Row 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
           {renderDonut('All Projects by Phase', data.phases, COLORS_PHASE)}
           {renderDonut('All Projects by Health', data.health, COLORS_HEALTH, true)}
           {renderDonut('All Projects by Margin', data.margins, COLORS_MARGIN, true)}
        </div>

        {/* Row 2 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
           {renderDonut('All Projects by Contract Value', { 
               '< $100K': data.values.small, 
               '$100K-$350K': data.values.medium, 
               '$350K-$1M': data.values.large,
               '$1M-$5M': data.values.enterprise,
               '> $5M': data.values.mega
           }, ['#dfe1e6', '#eae6ff', '#bfb3ff', '#8777d9', '#5243aa'], true)}
           
           {renderDonut('All Projects by Complexity', data.complexity, ['#b3d4ff', '#4c9aff', '#0747a6'], true)}
           
           {/* Dynamic colors for Locations */}
           {renderDonut('All Projects by Client Location', data.locations, ['#FF991F', '#FFC400', '#00B8D9', '#0052CC', '#6554C0', '#36B37E'], true)}
        </div>

      </div>
    </div>
  );
}
