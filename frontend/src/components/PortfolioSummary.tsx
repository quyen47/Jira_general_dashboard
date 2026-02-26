'use client';

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { calculatePortfolioInsights } from '@/lib/portfolioInsights';
import { getAllProjectsOverview } from '@/actions/portfolio';
import MetricCard from './MetricCard';
import InsightsPanel from './InsightsPanel';

interface Project {
  key: string;
}

interface AggregatedData {
  phases: { [key: string]: number };
  health: { green: number; yellow: number; red: number };
  margins: { high: number; medium: number; low: number };
  values: { small: number; medium: number; large: number; enterprise: number; mega: number };
  complexity: { Low: number; Medium: number; High: number };
  locations: { [key: string]: number };
}

const COLORS_PHASE = ['#3B82F6', '#06B6D4', '#22C55E', '#F59E0B', '#8B5CF6'];
const COLORS_HEALTH = ['#22C55E', '#F59E0B', '#EF4444'];
const COLORS_VALUE = ['#CBD5E1', '#C4B5FD', '#A78BFA', '#7C3AED', '#5B21B6'];

const DEFAULT_OVERVIEW = {
    schdHealth: 'yellow',
    complexity: 'Medium',
    projectType: 'T&M',
    currentPhase: 'Validate',
    bpwTargetMargin: '75%',
    currentMargin: '68%',
    clientLocation: 'Hawaii',
};

// Custom tooltip for charts
function CustomTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#0F172A',
        color: 'white',
        padding: '10px 14px',
        borderRadius: '10px',
        fontSize: '0.8rem',
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        border: 'none',
      }}>
        <div style={{ fontWeight: 600, marginBottom: 2 }}>{payload[0].name}</div>
        <div style={{ color: '#94A3B8' }}>{payload[0].value} project{payload[0].value !== 1 ? 's' : ''}</div>
      </div>
    );
  }
  return null;
}

export default function PortfolioSummary() {
  const [data, setData] = useState<AggregatedData | null>(null);
  const [portfolioInsights, setPortfolioInsights] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const { projects } = await getAllProjectsOverview({ limit: 1000, enrich: false });
        
        const aggr: AggregatedData = {
          phases: {},
          health: { green: 0, yellow: 0, red: 0 },
          margins: { high: 0, medium: 0, low: 0 },
          values: { small: 0, medium: 0, large: 0, enterprise: 0, mega: 0 },
          complexity: { Low: 0, Medium: 0, High: 0 },
          locations: {}
        };

        projects.forEach((p: any) => {
          let overview: any = DEFAULT_OVERVIEW;
          
          if (p.overview && Object.keys(p.overview).length > 0) {
              overview = { ...DEFAULT_OVERVIEW, ...p.overview };
          }

          const phase = overview.currentPhase || 'Unknown';
          aggr.phases[phase] = (aggr.phases[phase] || 0) + 1;

          if (overview.schdHealth === 'green') aggr.health.green++;
          else if (overview.schdHealth === 'yellow') aggr.health.yellow++;
          else if (overview.schdHealth === 'red') aggr.health.red++;

          const marginStr = overview.currentMargin || '0%';
          const margin = parseFloat(marginStr.replace('%', ''));
          if (margin > 80) aggr.margins.high++;
          else if (margin >= 50) aggr.margins.medium++;
          else aggr.margins.low++;

          const comp = overview.complexity || 'Medium';
          if (aggr.complexity[comp as keyof typeof aggr.complexity] !== undefined) {
              aggr.complexity[comp as keyof typeof aggr.complexity]++;
          } else {
              aggr.complexity['Medium']++;
          }

          const loc = overview.clientLocation || 'Unknown';
          aggr.locations[loc] = (aggr.locations[loc] || 0) + 1;
          
          const budgetStr = overview.budget?.budget || '$350,000';
          const budget = parseFloat((budgetStr.toString()).replace(/[^0-9.]/g, ''));
          
          if (budget < 100000) aggr.values.small++;
          else if (budget < 500000) aggr.values.medium++;
          else if (budget < 1000000) aggr.values.large++;
          else if (budget < 5000000) aggr.values.enterprise++;
          else aggr.values.mega++;
        });

        setData(aggr);

        const insights = calculatePortfolioInsights(projects);
        setPortfolioInsights(insights);

      } catch (error) {
        console.error('Error loading portfolio summary:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadData();
  }, []);

  if (isLoading || !data) {
    return (
      <div style={{ 
        padding: '48px', 
        textAlign: 'center', 
        color: '#64748B',
        background: 'white',
        borderRadius: '14px',
        border: '1px solid #E2E8F0',
        marginBottom: '12px',
      }}>
        <div style={{
          width: 32,
          height: 32,
          border: '3px solid #E2E8F0',
          borderTop: '3px solid #3B82F6',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 12px',
        }} />
        <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>Loading portfolio data...</div>
      </div>
    );
  }

  const renderDonut = (title: string, dataKey: any, colors: string[], isSemiCircle = true) => {
    const chartData = Object.keys(dataKey).map((key) => ({
      name: key,
      value: dataKey[key]
    })).filter(d => d.value > 0);

    return (
      <div style={{ 
        background: '#F8FAFC', 
        borderRadius: '12px', 
        padding: '12px', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        border: '1px solid #F1F5F9',
        transition: 'all 200ms ease',
      }}>
        <h3 style={{ 
          margin: '0 0 12px 0', 
          fontSize: '0.85rem', 
          color: '#334155', 
          textAlign: 'center', 
          fontWeight: 600,
          letterSpacing: '-0.01em',
        }}>
          {title}
        </h3>
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
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={colors[index % colors.length]} 
                    style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.06))' }}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign={isSemiCircle ? "top" : "bottom"} 
                align="center" 
                wrapperStyle={isSemiCircle ? { top: 0 } : {}} 
                iconSize={8} 
                iconType="circle"
                formatter={(value: string) => (
                  <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 500 }}>{value}</span>
                )} 
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  return (
    <div style={{ marginBottom: '28px' }}>
      {/* Section Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 100%)', 
        color: 'white', 
        padding: '16px 24px', 
        borderRadius: '14px 14px 0 0', 
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: '8px',
          background: 'rgba(59, 130, 246, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(59, 130, 246, 0.3)',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>Portfolio Summary</div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>Overview of all projects</div>
        </div>
      </div>

      {/* Content Area */}
      <div style={{ 
        background: 'white', 
        padding: '24px', 
        borderRadius: '0 0 14px 14px', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02)',
        border: '1px solid #E2E8F0',
        borderTop: 'none',
      }}>
        
        {/* Metric Cards */}
        {!isLoading && portfolioInsights && (
          <>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(4, 1fr)', 
              gap: '16px', 
              marginBottom: '28px',
            }}>
              <MetricCard
                title="Health"
                status={portfolioInsights.health.green > portfolioInsights.health.red ? 'success' : 
                        portfolioInsights.health.red > 0 ? 'danger' : 'warning'}
                mainValue={`${Math.round((portfolioInsights.health.green / portfolioInsights.totalProjects) * 100)}%`}
                subValue={`${portfolioInsights.health.green} of ${portfolioInsights.totalProjects} healthy`}
              />
              <MetricCard
                title="At Risk"
                status={portfolioInsights.atRiskProjects.length === 0 ? 'success' : 
                        portfolioInsights.atRiskProjects.length > 3 ? 'danger' : 'warning'}
                mainValue={portfolioInsights.atRiskProjects.length.toString()}
                subValue={`${portfolioInsights.atRiskProjects.length === 0 ? 'No' : portfolioInsights.atRiskProjects.length} project${portfolioInsights.atRiskProjects.length !== 1 ? 's' : ''} need attention`}
              />
              <MetricCard
                title="Budget"
                status={portfolioInsights.budgetPerformance.healthy > portfolioInsights.budgetPerformance.overBudget ? 'success' : 
                        portfolioInsights.budgetPerformance.overBudget > 0 ? 'danger' : 'warning'}
                mainValue={`${portfolioInsights.budgetPerformance.healthy}/${portfolioInsights.totalProjects}`}
                subValue={`${portfolioInsights.budgetPerformance.overBudget} over budget`}
              />
              <MetricCard
                title="Schedule"
                status={portfolioInsights.schedulePerformance.ahead > portfolioInsights.schedulePerformance.behind ? 'success' : 
                        portfolioInsights.schedulePerformance.overtime > 0 ? 'danger' : 'warning'}
                mainValue={`${Math.round((portfolioInsights.schedulePerformance.ahead / portfolioInsights.totalProjects) * 100)}%`}
                subValue={`${portfolioInsights.schedulePerformance.ahead} ahead, ${portfolioInsights.schedulePerformance.behind} behind`}
              />
            </div>

            <div style={{ 
              height: 1, 
              background: 'linear-gradient(90deg, transparent, #E2E8F0, transparent)', 
              margin: '24px 0' 
            }} />
          </>
        )}
        
        {/* Charts Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
           {renderDonut('All Projects by Phase', data.phases, COLORS_PHASE)}
           {renderDonut('All Projects by Health', data.health, COLORS_HEALTH, true)}
           {renderDonut('All Projects by Contract Value', { 
               '< $100K': data.values.small, 
               '$100K-$350K': data.values.medium, 
               '$350K-$1M': data.values.large,
               '$1M-$5M': data.values.enterprise,
               '> $5M': data.values.mega
           }, COLORS_VALUE, true)}
        </div>

      </div>
    </div>
  );
}
