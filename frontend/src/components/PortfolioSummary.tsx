'use client';

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer,  Tooltip, Legend } from 'recharts';
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

export default function PortfolioSummary() {
  const [data, setData] = useState<AggregatedData | null>(null);
  const [portfolioInsights, setPortfolioInsights] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        // Fetch all projects (lightweight, limit 1000)
        const { projects } = await getAllProjectsOverview({ limit: 1000, enrich: false });
        
        // --- Aggregation Logic ---
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
          let budgetOverall: any[] = [];
          
          // Legacy check or assume enriched p.overview is correct
          // The action returns p.overview (from DB).
          if (p.overview && Object.keys(p.overview).length > 0) {
              overview = { ...DEFAULT_OVERVIEW, ...p.overview };
          }
          if (p.budget) {
              // Action puts budget in p.budget
              // But aggregation logic used legacy structure? 
              // Let's stick to overview fields mostly.
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
              aggr.complexity['Medium']++;
          }

          // Location
          const loc = overview.clientLocation || 'Unknown';
          aggr.locations[loc] = (aggr.locations[loc] || 0) + 1;
          
          // Value
          const budgetStr = overview.budget?.budget || '$350,000'; // Access from overview or budget object
          const budget = parseFloat((budgetStr.toString()).replace(/[^0-9.]/g, ''));
          
          if (budget < 100000) aggr.values.small++;
          else if (budget < 500000) aggr.values.medium++;
          else if (budget < 1000000) aggr.values.large++;
          else if (budget < 5000000) aggr.values.enterprise++;
          else aggr.values.mega++;
        });

        setData(aggr);

        // --- Insights Logic ---
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
     return <div style={{ padding: '20px', textAlign: 'center', color: '#5E6C84' }}>Loading summary...</div>;
  }

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
        
        {/* Portfolio Insights Dashboard */}
        {!isLoading && portfolioInsights && (
          <>
            {/* Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
              <MetricCard
                title="Health"
                status={portfolioInsights.health.green > portfolioInsights.health.red ? 'success' : 
                        portfolioInsights.health.red > 0 ? 'danger' : 'warning'}
                mainValue={`${Math.round((portfolioInsights.health.green / portfolioInsights.totalProjects) * 100)}%`}
                subValue={`${portfolioInsights.health.green} of ${portfolioInsights.totalProjects} healthy`}
                icon="🟢"
              />
              <MetricCard
                title="At Risk"
                status={portfolioInsights.atRiskProjects.length === 0 ? 'success' : 
                        portfolioInsights.atRiskProjects.length > 3 ? 'danger' : 'warning'}
                mainValue={portfolioInsights.atRiskProjects.length.toString()}
                subValue={`${portfolioInsights.atRiskProjects.length === 0 ? 'No' : portfolioInsights.atRiskProjects.length} project${portfolioInsights.atRiskProjects.length !== 1 ? 's' : ''} need attention`}
                icon={portfolioInsights.atRiskProjects.length === 0 ? '✅' : '🔴'}
              />
              <MetricCard
                title="Budget"
                status={portfolioInsights.budgetPerformance.healthy > portfolioInsights.budgetPerformance.overBudget ? 'success' : 
                        portfolioInsights.budgetPerformance.overBudget > 0 ? 'danger' : 'warning'}
                mainValue={`${portfolioInsights.budgetPerformance.healthy}/${portfolioInsights.totalProjects}`}
                subValue={`${portfolioInsights.budgetPerformance.overBudget} over budget`}
                icon={portfolioInsights.budgetPerformance.overBudget === 0 ? '🟢' : '🟡'}
              />
              <MetricCard
                title="Schedule"
                status={portfolioInsights.schedulePerformance.ahead > portfolioInsights.schedulePerformance.behind ? 'success' : 
                        portfolioInsights.schedulePerformance.overtime > 0 ? 'danger' : 'warning'}
                mainValue={`${Math.round((portfolioInsights.schedulePerformance.ahead / portfolioInsights.totalProjects) * 100)}%`}
                subValue={`${portfolioInsights.schedulePerformance.ahead} ahead, ${portfolioInsights.schedulePerformance.behind} behind`}
                icon={portfolioInsights.schedulePerformance.ahead > portfolioInsights.schedulePerformance.behind ? '🟢' : '🟡'}
              />
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #dfe1e6', margin: '20px 0' }} />
          </>
        )}
        
        {/* Row 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
           {renderDonut('All Projects by Phase', data.phases, COLORS_PHASE)}
           {renderDonut('All Projects by Health', data.health, COLORS_HEALTH, true)}
           {renderDonut('All Projects by Contract Value', { 
               '< $100K': data.values.small, 
               '$100K-$350K': data.values.medium, 
               '$350K-$1M': data.values.large,
               '$1M-$5M': data.values.enterprise,
               '> $5M': data.values.mega
           }, ['#dfe1e6', '#eae6ff', '#bfb3ff', '#8777d9', '#5243aa'], true)}
        </div>

      </div>
    </div>
  );
}
