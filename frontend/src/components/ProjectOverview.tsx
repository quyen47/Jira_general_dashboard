'use client';

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { getOverview, saveOverview as apiSaveOverview } from '@/lib/api';
import BurnDownChart from './BurnDownChart';
import { calculateScheduleInsights, calculateBudgetInsights, generateAlerts, generateRecommendations } from '@/lib/insights';
import MetricCard from './MetricCard';
import InsightsPanel from './InsightsPanel';

// --- Types ---
interface OverviewData {
    schdHealth: 'green' | 'yellow' | 'red';
    complexity: string;
    projectType: string;
    projectStatus: 'To Do' | 'On Going' | 'On Hold' | 'Closed' | '';
    planStartDate: string;
    planEndDate: string;
    percentComplete: string;
    clientLocation: string;
    currentPhase: string;
    bpwTargetMargin: string;
}



interface HealthStats {
  notStarted: number;
  inProgress: number;
  complete: number;
  
  green: number;
  yellow: number;
  red: number;

  riskOpen: number;
  actionOpen: number;
  issueOpen: number;
  decisionOpen: number;

  riskLate: number;
  actionLate: number;
  issueLate: number;
  decisionLate: number;
}

interface BudgetData {
  contractValue: string;
  onshoreBudgetHours: string;
  offshoreBudgetHours: string;
  onshoreSpentHours: string;
}

interface ProjectData {
  overview: OverviewData;
  budget: BudgetData;
  health: HealthStats;
}

// --- Defaults ---
// --- Defaults ---
const DEFAULT_DATA: ProjectData = {
  overview: {
    schdHealth: 'yellow',
    complexity: '',
    projectType: '',
    projectStatus: '',
    planStartDate: '',
    planEndDate: '',
    percentComplete: '0', 
    clientLocation: '',
    currentPhase: '',
    bpwTargetMargin: '',
  },
  budget: {
    contractValue: '',
    onshoreBudgetHours: '',
    offshoreBudgetHours: '',
    onshoreSpentHours: '',
  },
  health: {
    notStarted: 0, inProgress: 0, complete: 0,
    green: 0, yellow: 0, red: 0,
    riskOpen: 0, actionOpen: 0, issueOpen: 0, decisionOpen: 0,
    riskLate: 0, actionLate: 0, issueLate: 0, decisionLate: 0,
  }
};

const COLORS_STATUS = ['#0052cc', '#00B8D9', '#36B37E', '#dfe1e6']; // Blue, Cyan, Green, Gray
const COLORS_HEALTH = ['#36B37E', '#FFAB00', '#FF5630', '#dfe1e6']; // Green, Yellow, Red
const COLORS_RAID = ['#0052cc', '#6554C0', '#FFAB00', '#FF5630']; // Blue, Purple, Yellow, Red

export default function ProjectOverview({ projectKey, offshoreSpentHours = 0, epics = [] }: { projectKey: string, offshoreSpentHours?: number, epics?: any[] }) {
  const [data, setData] = useState<ProjectData>(DEFAULT_DATA);
  const [isOpen, setIsOpen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showEpicDetails, setShowEpicDetails] = useState(false);

  useEffect(() => {
    async function load() {
        try {
            const saved = await getOverview(projectKey);
            if (saved) {
                // Map API response (flattened overview + json budget/health) to ProjectData
                // Ensure nulls become empty strings for controlled inputs
                const mapped: ProjectData = {
                    overview: {
                        schdHealth: (saved.schdHealth || 'yellow') as any,
                        complexity: saved.complexity || '',
                        projectType: saved.projectType || '',
                        projectStatus: saved.projectStatus || '',
                        planStartDate: saved.planStartDate || '',
                        planEndDate: saved.planEndDate || '',
                        percentComplete: saved.percentComplete || '0',
                        clientLocation: saved.clientLocation || '',
                        currentPhase: saved.currentPhase || '',
                        bpwTargetMargin: saved.bpwTargetMargin || '',
                    },
                    budget: {
                        contractValue: saved.budget?.contractValue || '',
                        onshoreBudgetHours: saved.budget?.onshoreBudgetHours || '',
                        offshoreBudgetHours: saved.budget?.offshoreBudgetHours || '',
                        onshoreSpentHours: saved.budget?.onshoreSpentHours || ''
                    },
                    health: saved.health as any
                };
                
                // Merge with defaults to ensure all fields exist if API partial
                const finalData = {
                    overview: { ...DEFAULT_DATA.overview, ...mapped.overview },
                    budget: { ...DEFAULT_DATA.budget, ...(mapped.budget || {}) },
                    health: { ...DEFAULT_DATA.health, ...(mapped.health || {}) }
                };
                
                setData(finalData);
            }
        } catch (e) {
            console.error("Failed to load overview", e);
        }
    }
    load();
  }, [projectKey]);

  const saveData = async (newData: ProjectData) => {
    setData(newData);
    try {
        await apiSaveOverview(projectKey, newData);
    } catch (e) {
        console.error("Failed to save overview", e);
    }
  };

  const updateOverview = (field: keyof OverviewData, value: string) => {
    saveData({ ...data, overview: { ...data.overview, [field]: value } });
  };

  const updateBudgetField = (field: keyof BudgetData, value: string) => {
      saveData({ ...data, budget: { ...data.budget, [field]: value } });
  };
  
  const updateHealth = (field: keyof HealthStats, value: number) => {
      saveData({ ...data, health: { ...data.health, [field]: value } });
  };

  // --- Calculations ---
  // Budget - safely parse, handling '-' or empty as 0
  const safeParse = (val: string) => {
      if (!val || val === '-') return 0;
      return parseFloat(val) || 0;
  };

  const onshoreBudget = safeParse(data.budget.onshoreBudgetHours);
  const offshoreBudget = safeParse(data.budget.offshoreBudgetHours);
  const totalBudget = onshoreBudget + offshoreBudget;
  const onshoreSpent = safeParse(data.budget.onshoreSpentHours);
  const totalSpent = onshoreSpent + offshoreSpentHours;
  const percentSpent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const percentOnshore = onshoreBudget > 0 ? (onshoreSpent / onshoreBudget) * 100 : 0;
  const percentOffshore = offshoreBudget > 0 ? (offshoreSpentHours / offshoreBudget) * 100 : 0;

  // Timeline & Progress
  // % Complete from Epics
  let percentComplete = 0;
  let totalEpicIssues = 0;
  let doneEpicIssues = 0;
  
  if (epics && epics.length > 0) {
      epics.forEach(e => {
          totalEpicIssues += (e.totalIssues || 0);
          doneEpicIssues += (e.done || 0);
      });
      percentComplete = totalEpicIssues > 0 ? (doneEpicIssues / totalEpicIssues) * 100 : 0;
  } else {
      percentComplete = safeParse(data.overview.percentComplete);
  }

  // Timeline Bar Logic
  const [timeProgress, setTimeProgress] = useState(0);

  useEffect(() => {
    if (!data.overview.planStartDate || !data.overview.planEndDate || data.overview.planStartDate === '-' || data.overview.planEndDate === '-') {
        setTimeProgress(0);
        return;
    }
    const startDate = new Date(data.overview.planStartDate).getTime();
    const endDate = new Date(data.overview.planEndDate).getTime();
    if (isNaN(startDate) || isNaN(endDate)) {
        setTimeProgress(0);
        return;
    }
    const now = new Date().getTime();
    const totalDuration = endDate - startDate;
    const elapsed = now - startDate;
    const progress = totalDuration > 0 ? Math.min(Math.max(elapsed / totalDuration, 0), 1) * 100 : 0;
    setTimeProgress(progress);
  }, [data.overview.planStartDate, data.overview.planEndDate]);


  // --- Render Helpers ---

  const renderEditableInput = (value: string, onChange: (val: string) => void, width?: string, type: 'text'|'number'|'date' = 'text') => {
      if (isEditing) {
          return (
             <input 
                type={type}
                value={value} 
                onChange={e => onChange(e.target.value)}
                style={{ width: width || '100%', padding: '4px', border: '1px solid #ccc', borderRadius: 4, fontSize: '0.9rem', fontFamily: 'inherit' }} 
             />
          );
      }
      // Display placeholder if empty
      const displayValue = (!value || value.trim() === '') ? '-' : value;
      return <span>{displayValue}</span>;
  };
  
  const renderProgressBar = (value: number, total: number, color: string) => {
      const pct = total > 0 ? Math.min((value / total) * 100, 100) : 0;
      return (
          <div style={{ width: '100%', background: '#dfe1e6', height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 8 }}>
              <div style={{ width: `${pct}%`, background: color, height: '100%' }} />
          </div>
      );
  };

  const renderTimelineBar = () => {
      // Check if project is overtime (today > end date) and status is "On Going"
      const startDate = new Date(data.overview.planStartDate).getTime();
      const endDate = new Date(data.overview.planEndDate).getTime();
      const now = new Date().getTime();
      const isOvertime = now > endDate && data.overview.projectStatus === 'On Going';
      
      const originalDuration = endDate - startDate;
      const overtimeDuration = isOvertime ? (now - endDate) : 0;
      const totalDisplayDuration = isOvertime ? (originalDuration + overtimeDuration) : originalDuration;

      // Calculate percentages based on the total display duration (which includes overtime if applicable)
      // If overtime, the total width matches "now". If not, it matches "endDate".
      
      let blueBarWidth = 100;
      let redBarWidth = 0;
      let markerPosition = timeProgress; // Default for normal case

      if (isOvertime && totalDisplayDuration > 0) {
        // Rescale: The whole container represents start -> now
        // Blue bar (start -> end)
        blueBarWidth = Math.min((originalDuration / totalDisplayDuration) * 100, 100);
        // Red bar (end -> now)
        redBarWidth = (overtimeDuration / totalDisplayDuration) * 100;
        // Marker is exactly at the end (100% of container)
        markerPosition = 100;
      }

      return (
        <div style={{ marginTop: 25, marginBottom: 10 }}>
            <div style={{ position: 'relative' }}>
                {/* Today Label */}
                 <div style={{ 
                    position: 'absolute', 
                    left: `${markerPosition}%`, 
                    top: -24, 
                    transform: 'translateX(-100%)', // Shift left to keep it inside properly
                    fontSize: '0.75rem', 
                    color: isOvertime ? '#FF5630' : '#FF5630', 
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    paddingRight: isOvertime ? 0 : 0
                }}>
                    {isOvertime ? 'Today (OVERTIME)' : 'Today'}
                </div>

                {/* Bar Container - always 100% width */}
                <div style={{ height: 8, background: '#dfe1e6', borderRadius: 4, position: 'relative', overflow: 'hidden', width: '100%' }}>
                    {/* Normal progress (blue) */}
                    <div style={{ 
                        position: 'absolute', left: 0, top: 0, height: '100%', width: `${isOvertime ? blueBarWidth : Math.min(timeProgress, 100)}%`, 
                        background: '#0052cc', borderRadius: isOvertime ? '4px 0 0 4px' : '4px' 
                    }} />
                    
                    {/* Overtime period (red) */}
                    {isOvertime && (
                        <div style={{ 
                            position: 'absolute', left: `${blueBarWidth}%`, top: 0, height: '100%', width: `${redBarWidth}%`, 
                            background: '#FF5630', borderRadius: '0 4px 4px 0'
                        }} />
                    )}
                    
                    {/* Marker */}
                    <div style={{ 
                        position: 'absolute', left: `${markerPosition}%`, top: -4, bottom: -4, width: 2, background: '#FF5630', zIndex: 2, marginLeft: -2
                    }} />
                </div>
            </div>

            {/* Date Labels */}
            <div style={{ position: 'relative', height: '1.5em', marginTop: 8, fontSize: '0.75rem', color: '#666' }}>
                <span style={{ position: 'absolute', left: 0 }}>{data.overview.planStartDate}</span>
                
                {/* End Date Label - Position depends on if we are overtime */}
                <span style={{ 
                    position: 'absolute', 
                    left: isOvertime ? `${blueBarWidth}%` : '100%', 
                    transform: isOvertime ? 'translateX(-50%)' : 'translateX(-100%)',
                    color: isOvertime ? '#FF5630' : '#666', 
                    fontWeight: isOvertime ? 700 : 'normal',
                    whiteSpace: 'nowrap'
                }}>
                    {isOvertime && 'Due: '}{data.overview.planEndDate}
                </span>

                {/* Overtime End Label (Today's date) */}
                {isOvertime && (
                     <span style={{ position: 'absolute', right: 0, color: '#FF5630', fontWeight: 700 }}>
                        {new Date().toISOString().split('T')[0]}
                     </span>
                )}
            </div>
        </div>
      );
  };

  const renderGauge = (chartData: any[], colors: string[], title: string, renderLegend: () => React.ReactNode) => (
      <div style={{ textAlign: 'center', width: '25%' }}>
          <h4 style={{ margin: '0 0 10px 0', background: '#e0e0e0', padding: '4px', borderRadius: 4, fontSize: '0.9rem', fontWeight: 700, color: '#333' }}>{title}</h4>
          <div style={{ height: 100, position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={chartData}
                        cy="100%"
                        startAngle={180}
                        endAngle={0}
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                        ))}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ marginTop: '5px', fontSize: '0.75rem', display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '8px' }}>
              {renderLegend()}
          </div>
      </div>
  );
  
  // Data prep for charts
  const dStatus = [
      { name: 'Not Started', value: data.health.notStarted },
      { name: 'In Progress', value: data.health.inProgress },
      { name: 'Complete', value: data.health.complete },
  ];
  const dHealth = [
      { name: 'Green', value: data.health.green },
      { name: 'Yellow', value: data.health.yellow },
      { name: 'Red', value: data.health.red },
  ];
  const dRaidOpen = [
      { name: 'Risk', value: data.health.riskOpen },
      { name: 'Action', value: data.health.actionOpen },
      { name: 'Issues', value: data.health.issueOpen },
      { name: 'Decisions', value: data.health.decisionOpen },
  ];
  const dRaidLate = [
       { name: 'Risk', value: data.health.riskLate },
      { name: 'Action', value: data.health.actionLate },
      { name: 'Issues', value: data.health.issueLate },
      { name: 'Decisions', value: data.health.decisionLate },
  ];


  return (
    <div style={{ background: 'white', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.1)', overflow: 'hidden', marginBottom: '2rem' }}>
        {/* Header */}
        <div 
            onClick={() => setIsOpen(!isOpen)}
            style={{ 
                background: '#0747A6', // Jira Blue
                color: 'white', 
                padding: '10px 16px', 
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontWeight: 600,
                letterSpacing: '1px'
            }}
        >
            <span>PROJECT OVERVIEW</span>
            <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                    onClick={(e) => { e.stopPropagation(); setIsEditing(!isEditing); }}
                    style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '2px 8px', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem' }}
                >
                    {isEditing ? 'Done' : 'Edit'}
                </button>
                <span>{isOpen ? '▼' : '▶'}</span>
            </div>
        </div>

        {isOpen && (
            <div style={{ padding: '20px' }}>
                
                {/* Insights Dashboard Section */}
                {(() => {
                  // Calculate insights
                  const scheduleInsights = calculateScheduleInsights(
                    percentComplete,
                    data.overview.planStartDate,
                    data.overview.planEndDate,
                    data.overview.projectStatus
                  );

                  const budgetInsights = calculateBudgetInsights(
                    totalBudget,
                    totalSpent,
                    data.overview.planStartDate,
                    data.overview.planEndDate
                  );

                  const alerts = generateAlerts(scheduleInsights, budgetInsights, epics);
                  const recommendations = generateRecommendations(scheduleInsights, budgetInsights, epics);

                  // Determine metric card statuses
                  const scheduleStatus = scheduleInsights.status === 'ahead' ? 'success' :
                                       scheduleInsights.status === 'overtime' ? 'danger' :
                                       scheduleInsights.status === 'behind' ? 'danger' : 'warning';

                  const budgetStatus = budgetInsights.status === 'healthy' ? 'success' :
                                     budgetInsights.status === 'over-budget' ? 'danger' : 'warning';

                  return (
                    <>
                      {/* Metric Cards */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                        <MetricCard
                          title="Schedule"
                          status={scheduleStatus}
                          mainValue={`${scheduleInsights.percentComplete.toFixed(0)}%`}
                          subValue={`${scheduleInsights.percentTimeElapsed.toFixed(0)}% time elapsed`}
                          icon={scheduleInsights.status === 'ahead' ? '🟢' : 
                                scheduleInsights.status === 'overtime' ? '🚨' : 
                                scheduleInsights.status === 'behind' ? '🔴' : '🟡'}
                        />
                        <MetricCard
                          title="Budget"
                          status={budgetStatus}
                          mainValue={`${budgetInsights.percentSpent.toFixed(0)}%`}
                          subValue={`${budgetInsights.remainingBudget.toFixed(0)}h remaining`}
                          icon={budgetInsights.status === 'healthy' ? '🟢' : 
                                budgetInsights.status === 'over-budget' ? '🚨' : '🟡'}
                        />
                        <MetricCard
                          title="Runway"
                          status={budgetInsights.weeksOfRunway < 4 ? 'danger' : 
                                  budgetInsights.weeksOfRunway < 8 ? 'warning' : 'success'}
                          mainValue={budgetInsights.weeksOfRunway < 999 ? `${budgetInsights.weeksOfRunway.toFixed(1)}w` : '∞'}
                          subValue={`${budgetInsights.weeklyBurnRate.toFixed(0)}h/week burn`}
                          icon="⏱️"
                        />
                        <MetricCard
                          title="Completion"
                          status={scheduleInsights.status === 'ahead' ? 'success' : 'info'}
                          mainValue={scheduleInsights.projectedEndDate ? 
                                    new Date(scheduleInsights.projectedEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 
                                    '-'}
                          subValue={scheduleInsights.daysAheadBehind !== 0 ? 
                                   `${Math.abs(scheduleInsights.daysAheadBehind)}d ${scheduleInsights.daysAheadBehind > 0 ? 'ahead' : 'behind'}` : 
                                   'On track'}
                          icon="🎯"
                        />
                      </div>

                      {/* Insights Panel */}
                      <div style={{ marginBottom: '30px' }}>
                        <InsightsPanel recommendations={recommendations} />
                      </div>
                    </>
                  );
                })()}

                <hr style={{ border: 'none', borderTop: '1px solid #dfe1e6', margin: '20px 0' }} />
                
                {/* 1. General & Health/Progress Split */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
                    
                    {/* General Section */}
                    <div style={{ background: '#f9f9f9', padding: 15, borderRadius: 8 }}>
                       <h3 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: '#172b4d', borderBottom: '2px solid #dfe1e6', paddingBottom: 8 }}>1. General</h3>
                       <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>

                           <div>
                               <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#5e6c84', marginBottom: 4 }}>Complexity</div>
                               {renderEditableInput(data.overview.complexity, v => updateOverview('complexity', v))}
                           </div>
                           <div>
                               <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#5e6c84', marginBottom: 4 }}>Project Type</div>
                               {renderEditableInput(data.overview.projectType, v => updateOverview('projectType', v))}
                           </div>
                           <div>
                               <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#5e6c84', marginBottom: 4 }}>Project Status</div>
                               {isEditing ? (
                                   <select 
                                       value={data.overview.projectStatus}
                                       onChange={e => updateOverview('projectStatus', e.target.value as any)}
                                       style={{ width: '100%', padding: '4px', border: '1px solid #ccc', borderRadius: 4, fontSize: '0.9rem', fontFamily: 'inherit' }}
                                   >
                                       <option value="">-</option>
                                       <option value="To Do">To Do</option>
                                       <option value="On Going">On Going</option>
                                       <option value="On Hold">On Hold</option>
                                       <option value="Closed">Closed</option>
                                   </select>
                               ) : (
                                   <span>{data.overview.projectStatus || '-'}</span>
                               )}
                           </div>
                           <div>
                               <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#5e6c84', marginBottom: 4 }}>Client Location</div>
                               {renderEditableInput(data.overview.clientLocation, v => updateOverview('clientLocation', v))}
                           </div>
                            <div>
                               <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#5e6c84', marginBottom: 4 }}>Current Phase</div>
                               {renderEditableInput(data.overview.currentPhase, v => updateOverview('currentPhase', v))}
                           </div>
                           <div>
                               <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#5e6c84', marginBottom: 4 }}>BPW Target Margin</div>
                               {renderEditableInput(data.overview.bpwTargetMargin, v => updateOverview('bpwTargetMargin', v))}
                           </div>
                       </div>

                    </div>

                    {/* Health and Progress Section */}
                    <div style={{ background: '#f9f9f9', padding: 15, borderRadius: 8 }}>
                       <h3 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: '#172b4d', borderBottom: '2px solid #dfe1e6', paddingBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                           <span>2. Health and Progress</span>
                           <div style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 8 }}>

                               {isEditing ? (
                                     <select 
                                        value={data.overview.schdHealth}
                                        onChange={e => updateOverview('schdHealth', e.target.value as any)}
                                        style={{ padding: 4 }}
                                     >
                                         <option value="green">Green</option>
                                         <option value="yellow">Yellow</option>
                                         <option value="red">Red</option>
                                     </select>
                                 ) : (
                                     <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                         <div style={{ 
                                             width: 12, height: 12, borderRadius: '50%',
                                             background: (() => {
                                                 // Check if overtime
                                                 const now = new Date().getTime();
                                                 const endDate = new Date(data.overview.planEndDate).getTime();
                                                 const isOvertime = now > endDate && data.overview.projectStatus === 'On Going';
                                                 if (isOvertime) return '#FF5630';
                                                 return data.overview.schdHealth === 'green' ? '#36B37E' : data.overview.schdHealth === 'yellow' ? '#FFAB00' : '#FF5630';
                                             })()
                                         }} />
                                         <span style={{ textTransform: 'capitalize' }}>
                                             {(() => {
                                                 const now = new Date().getTime();
                                                 const endDate = new Date(data.overview.planEndDate).getTime();
                                                 const isOvertime = now > endDate && data.overview.projectStatus === 'On Going';
                                                 if (isOvertime) return 'red';
                                                 return data.overview.schdHealth;
                                             })()}
                                         </span>
                                     </div>
                                 )}
                           </div>
                       </h3>
                       
                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                           <div style={{ width: '48%' }}>
                               <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#5e6c84', marginBottom: 4 }}>Start Date</div>
                               {renderEditableInput(data.overview.planStartDate, v => updateOverview('planStartDate', v), undefined, 'date')}
                           </div>
                           <div style={{ width: '48%' }}>
                               <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#5e6c84', marginBottom: 4 }}>End Date</div>
                               {renderEditableInput(data.overview.planEndDate, v => updateOverview('planEndDate', v), undefined, 'date')}
                           </div>
                       </div>


                       <div style={{ marginBottom: 15 }}>
                           <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#5e6c84', marginBottom: 4 }}>Timeline Progress</div>
                           {renderTimelineBar()}
                       </div>

                       <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                           <div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#5e6c84' }}>% Complete (Issues)</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: (() => {
                                    // Check if overtime
                                    const now = new Date().getTime();
                                    const endDate = new Date(data.overview.planEndDate).getTime();
                                    const isOvertime = now > endDate && data.overview.projectStatus === 'On Going';
                                    return isOvertime ? '#FF5630' : '#0052cc';
                                })() }}>{percentComplete.toFixed(0)}%</div>
                           </div>
                           <div>
                                <button 
                                    onClick={() => setShowEpicDetails(!showEpicDetails)}
                                    style={{ padding: '4px 10px', fontSize: '0.8rem', cursor: 'pointer', background: '#e9e9e9', border: 'none', borderRadius: 4 }}
                                >
                                    {showEpicDetails ? 'Hide Details' : 'Drill Down'}
                                </button>
                           </div>
                       </div>
                       
                       {/* Drill Down Details */}
                       {showEpicDetails && epics && epics.length > 0 && (
                           <div style={{ marginTop: 15, maxHeight: 200, overflowY: 'auto', border: '1px solid #eee', borderRadius: 4, padding: 5, background: 'white' }}>
                               <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
                                   <thead>
                                       <tr style={{ textAlign: 'left', background: '#f4f5f7' }}>
                                           <th style={{ padding: 4 }}>Epic</th>
                                           <th style={{ padding: 4 }}>Status</th>
                                           <th style={{ padding: 4 }}>Progress</th>
                                       </tr>
                                   </thead>
                                   <tbody>
                                       {epics.map(e => {
                                           const total = e.totalIssues || 1;
                                           const done = e.done || 0;
                                           const pct = Math.round((done / total) * 100);
                                           return (
                                               <tr key={e.key} style={{ borderBottom: '1px solid #eee' }}>
                                                   <td style={{ padding: 4 }}>{e.summary}</td>
                                                   <td style={{ padding: 4 }}>{e.status}</td>
                                                   <td style={{ padding: 4 }}>
                                                       <div style={{ width: '100%', background: '#dfe1e6', height: 4, borderRadius: 2 }}>
                                                           <div style={{ width: `${pct}%`, background: pct === 100 ? '#36B37E' : '#0052cc', height: '100%' }} />
                                                       </div>
                                                       <div style={{fontSize: '0.65em', color: '#666'}}>{pct}%</div>
                                                   </td>
                                               </tr>
                                           )
                                       })}
                                   </tbody>
                               </table>
                           </div>
                       )}
                    </div>

                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #dfe1e6', margin: '20px 0' }} />

                {/* 3. Budget & Hours */}
                <div style={{ marginBottom: '30px' }}>
                     <h3 style={{ textAlign: 'center', fontSize: '1.2rem', color: '#172b4d', marginBottom: '20px' }}>Overall Budget & Hours (Onshore & Offshore)</h3>
                     
                     {/* Summary Grid */}
                     <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '20px', textAlign: 'center' }}>
                        
                        {/* Contract Value */}
                        <div style={{ background: '#f4f5f7', padding: 15, borderRadius: 8 }}>
                             <div style={{ fontSize: '0.9rem', color: '#5e6c84', marginBottom: 5 }}>Total Contract Value</div>
                             <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#0747A6' }}>
                                 ${renderEditableInput(data.budget.contractValue, v => updateBudgetField('contractValue', v))}
                             </div>
                        </div>

                        {/* Onshore */}
                        <div style={{ background: '#f4f5f7', padding: 15, borderRadius: 8 }}>
                             <div style={{ fontSize: '0.9rem', color: '#5e6c84', marginBottom: 5 }}>Onshore Hours</div>
                             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 5 }}>
                                 <span>Budgeted:</span>
                                 <strong>{renderEditableInput(data.budget.onshoreBudgetHours, v => updateBudgetField('onshoreBudgetHours', v))}</strong>
                             </div>
                             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                 <span>Spent:</span>
                                 <strong>{renderEditableInput(data.budget.onshoreSpentHours, v => updateBudgetField('onshoreSpentHours', v))}</strong>
                             </div>
                             {renderProgressBar(onshoreSpent, onshoreBudget, '#0052cc')}
                             <div style={{ fontSize: '0.75rem', textAlign: 'right', marginTop: 4 }}>{percentOnshore.toFixed(1)}%</div>
                        </div>

                        {/* Offshore */}
                        <div style={{ background: '#f4f5f7', padding: 15, borderRadius: 8 }}>
                             <div style={{ fontSize: '0.9rem', color: '#5e6c84', marginBottom: 5 }}>Offshore Hours</div>
                             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 5 }}>
                                 <span>Budgeted:</span>
                                 <strong>{renderEditableInput(data.budget.offshoreBudgetHours, v => updateBudgetField('offshoreBudgetHours', v))}</strong>
                             </div>
                             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                 <span>Spent:</span>
                                 <strong>{offshoreSpentHours.toFixed(1)}</strong>
                             </div>
                             {renderProgressBar(offshoreSpentHours, offshoreBudget, '#36B37E')}
                             <div style={{ fontSize: '0.75rem', textAlign: 'right', marginTop: 4 }}>{percentOffshore.toFixed(1)}%</div>
                        </div>

                        {/* Total Hours */}
                        <div style={{ background: '#f4f5f7', padding: 15, borderRadius: 8 }}>
                             <div style={{ fontSize: '0.9rem', color: '#5e6c84', marginBottom: 5 }}>Total Hours</div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 5 }}>
                                 <span>Budgeted:</span>
                                 <strong>{totalBudget.toFixed(1)}</strong>
                             </div>
                             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                 <span>Spent:</span>
                                 <strong>{totalSpent.toFixed(1)}</strong>
                             </div>
                             {renderProgressBar(totalSpent, totalBudget, '#FFAB00')}
                             <div style={{ fontSize: '0.75rem', textAlign: 'right', marginTop: 4 }}>{percentSpent.toFixed(1)}%</div>
                        </div>

                     </div>

                     {/* Burn Down Chart */}
                     <div style={{ marginTop: '30px', background: '#f4f5f7', padding: 20, borderRadius: 8 }}>
                         <h4 style={{ margin: '0 0 20px 0', fontSize: '1rem', color: '#172b4d', borderBottom: '2px solid #dfe1e6', paddingBottom: 8 }}>
                           Offshore Hours Burn Down
                         </h4>
                         <BurnDownChart
                           projectKey={projectKey}
                           offshoreBudget={offshoreBudget}
                           offshoreSpentHours={offshoreSpentHours}
                           planStartDate={data.overview.planStartDate}
                           planEndDate={data.overview.planEndDate}
                         />
                     </div>
                 </div>

            </div>
        )}
    </div>
  );
}
