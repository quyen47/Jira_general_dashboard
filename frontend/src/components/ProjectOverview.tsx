'use client';

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

// --- Types ---
interface OverviewData {
    schdHealth: 'green' | 'yellow' | 'red';
    complexity: string;
    projectType: string;
    contractStartDate: string;
    contractEndDate: string;
    planStartDate: string;
    planEndDate: string;
    percentComplete: string;
    clientLocation: string;
    currentPhase: string;
    nextGateReview: string;
    bpwTargetMargin: string;
    currentMargin: string;
}

interface BudgetRow {
  label: string;
  budget?: string;
  hours?: string;
  [key: string]: string | undefined;
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

interface ProjectData {
  overview: OverviewData;
  budgetOverall: BudgetRow[];
  budgetOnshore: BudgetRow[];
  budgetOffshore: BudgetRow[];
  health: HealthStats;
}

// --- Defaults ---
const DEFAULT_DATA: ProjectData = {
  overview: {
    schdHealth: 'yellow',
    complexity: 'Medium',
    projectType: 'T&M',
    contractStartDate: '09/08/25',
    contractEndDate: '01/09/26',
    planStartDate: '09/02/25',
    planEndDate: '12/29/26',
    percentComplete: '17%',
    clientLocation: 'Hawaii',
    currentPhase: 'Validate',
    nextGateReview: '12/01/25',
    bpwTargetMargin: '75%',
    currentMargin: '68%',
  },
  budgetOverall: [
     { label: 'Baseline', budget: '$350,000', hours: '2,042' },
     { label: 'Total (Contract+CRs)', budget: '$350,000', hours: '2,042' },
     { label: 'Invoiced / Worked', budget: '$60,775', hours: '425.25' },
     { label: 'Remaining', budget: '$289,225', hours: '1,616.75' },
     { label: '% Remaining', budget: '83%', hours: '79%' },
  ],
  budgetOnshore: [
     { label: 'Baseline', hours: '634' },
     { label: 'Total (+CRs)', hours: '634' },
     { label: 'Worked', hours: '273' },
     { label: 'Remaining', hours: '361' },
     { label: '% Remaining', hours: '56.94%' },
  ],
  budgetOffshore: [
     { label: 'From PPW', budget: '$33,792', hours: '1,408' },
     { label: 'From WO', budget: '$36,243', hours: '1,408' },
     { label: 'Total (WO+CRs)', budget: '$36,243', hours: '1,408' },
     { label: 'Invoiced / Worked', budget: '$4,065', hours: '152.25' },
     { label: 'Remaining', budget: '$4,065', hours: '1,255.75' },
     { label: '% Remaining', budget: '89%', hours: '89%' },
  ],
  health: {
    notStarted: 49, inProgress: 18, complete: 32,
    green: 40, yellow: 4, red: 56,
    riskOpen: 3, actionOpen: 3, issueOpen: 0, decisionOpen: 0,
    riskLate: 2, actionLate: 3, issueLate: 0, decisionLate: 0,
  }
};

const COLORS_STATUS = ['#0052cc', '#00B8D9', '#36B37E', '#dfe1e6']; // Blue, Cyan, Green, Gray
const COLORS_HEALTH = ['#36B37E', '#FFAB00', '#FF5630', '#dfe1e6']; // Green, Yellow, Red
const COLORS_RAID = ['#0052cc', '#6554C0', '#FFAB00', '#FF5630']; // Blue, Purple, Yellow, Red

export default function ProjectOverview({ projectKey }: { projectKey: string }) {
  const [data, setData] = useState<ProjectData>(DEFAULT_DATA);
  const [isOpen, setIsOpen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const STORAGE_KEY = `jira_dashboard_overview_${projectKey}`;

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setData(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, [projectKey]);

  const saveData = (newData: ProjectData) => {
    setData(newData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
  };

  const updateOverview = (field: keyof OverviewData, value: string) => {
    saveData({ ...data, overview: { ...data.overview, [field]: value } });
  };

  const updateBudget = (section: 'budgetOverall' | 'budgetOnshore' | 'budgetOffshore', index: number, field: string, value: string) => {
      const newSection = [...data[section]];
      newSection[index] = { ...newSection[index], [field]: value };
      saveData({ ...data, [section]: newSection });
  };
  
  const updateHealth = (field: keyof HealthStats, value: number) => {
      saveData({ ...data, health: { ...data.health, [field]: value } });
  };

  // --- Render Helpers ---

  const renderEditableInput = (value: string, onChange: (val: string) => void, width?: string) => {
      if (isEditing) {
          return (
             <input 
                value={value} 
                onChange={e => onChange(e.target.value)}
                style={{ width: width || '100%', padding: '4px', border: '1px solid #ccc', borderRadius: 4, fontSize: '0.9rem' }} 
             />
          );
      }
      return <span>{value}</span>;
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
            {/* Center Value or Label could go here */}
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
                
                {/* 1. Overview Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '15px 10px', marginBottom: '30px' }}>
                    
                    {/* First Row */}
                    <div style={{ textAlign: 'center' }}>
                         <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>Schd. Health</div>
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
                             <div style={{ 
                                 width: 16, height: 16, borderRadius: '50%', margin: '0 auto',
                                 background: data.overview.schdHealth === 'green' ? '#36B37E' : data.overview.schdHealth === 'yellow' ? '#FFAB00' : '#FF5630' 
                             }} />
                         )}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>Complexity</div>
                        {renderEditableInput(data.overview.complexity, v => updateOverview('complexity', v))}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                         <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>Project Type</div>
                         {renderEditableInput(data.overview.projectType, v => updateOverview('projectType', v))}
                    </div>
                     <div style={{ textAlign: 'center' }}>
                         <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>Contract Start Date</div>
                         {renderEditableInput(data.overview.contractStartDate, v => updateOverview('contractStartDate', v))}
                    </div>
                     <div style={{ textAlign: 'center' }}>
                         <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>Contract End Date</div>
                         {renderEditableInput(data.overview.contractEndDate, v => updateOverview('contractEndDate', v))}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                         <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>Plan Start Date</div>
                         {renderEditableInput(data.overview.planStartDate, v => updateOverview('planStartDate', v))}
                    </div>

                    {/* Second Row Mix */}
                    <div style={{ textAlign: 'center' }}>
                         <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>Plan End Date</div>
                         {renderEditableInput(data.overview.planEndDate, v => updateOverview('planEndDate', v))}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                         <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>% Complete</div>
                         {renderEditableInput(data.overview.percentComplete, v => updateOverview('percentComplete', v))}
                    </div>
                     <div style={{ textAlign: 'center' }}>
                         <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>Client Location</div>
                         {renderEditableInput(data.overview.clientLocation, v => updateOverview('clientLocation', v))}
                    </div>
                    <div style={{ textAlign: 'center', gridColumn: 'span 1' }}>
                         <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>Current Phase</div>
                         {renderEditableInput(data.overview.currentPhase, v => updateOverview('currentPhase', v))}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                         <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>Next Gate Review</div>
                         {renderEditableInput(data.overview.nextGateReview, v => updateOverview('nextGateReview', v))}
                    </div>
                    <div>{/* Spacer */}</div>

                    {/* Third Row Margins */}
                     <div style={{ textAlign: 'center', gridColumn: '5' }}>
                         <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>BPW Target Margin</div>
                         {renderEditableInput(data.overview.bpwTargetMargin, v => updateOverview('bpwTargetMargin', v))}
                    </div>
                     <div style={{ textAlign: 'center' }}>
                         <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 4 }}>Current Margin</div>
                         {renderEditableInput(data.overview.currentMargin, v => updateOverview('currentMargin', v))}
                    </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #dfe1e6', margin: '20px 0' }} />

                {/* 2. Budget & Hours */}
                <div style={{ marginBottom: '30px' }}>
                     <h3 style={{ textAlign: 'center', fontSize: '1.2rem', color: '#172b4d', marginBottom: '20px' }}>Overall Budget & Hours (Onshore & Offshore)</h3>
                     
                     <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, fontSize: '0.9rem', textAlign: 'center', marginBottom: 20 }}>
                        {data.budgetOverall.map((row, i) => (
                            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <strong style={{ fontSize: '0.8rem', color: '#42526e' }}>{row.label}</strong>
                                {renderEditableInput(row.budget || '', v => updateBudget('budgetOverall', i, 'budget', v))}
                                {isEditing && <span style={{fontSize: '0.7em'}}>Hours:</span>}
                                {renderEditableInput(row.hours || '', v => updateBudget('budgetOverall', i, 'hours', v))}
                            </div>
                        ))}
                     </div>

                     <h3 style={{ textAlign: 'center', fontSize: '1.1rem', color: '#172b4d', marginBottom: '20px' }}>Onshore Hours</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, fontSize: '0.9rem', textAlign: 'center', marginBottom: 20 }}>
                        {data.budgetOnshore.map((row, i) => (
                            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <strong style={{ fontSize: '0.8rem', color: '#42526e' }}>{row.label}</strong>
                                {renderEditableInput(row.hours || '', v => updateBudget('budgetOnshore', i, 'hours', v))}
                            </div>
                        ))}
                     </div>
                     
                     <h3 style={{ textAlign: 'center', fontSize: '1.1rem', color: '#172b4d', marginBottom: '20px' }}>Offshore Budget & Hours</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, fontSize: '0.9rem', textAlign: 'center' }}>
                        {data.budgetOffshore.map((row, i) => (
                            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <strong style={{ fontSize: '0.8rem', color: '#42526e' }}>{row.label}</strong>
                                {renderEditableInput(row.budget || '', v => updateBudget('budgetOffshore', i, 'budget', v))}
                                {isEditing && <span style={{fontSize: '0.7em'}}>Hours:</span>}
                                {renderEditableInput(row.hours || '', v => updateBudget('budgetOffshore', i, 'hours', v))}
                            </div>
                        ))}
                     </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #dfe1e6', margin: '20px 0' }} />

                {/* 3. Project Health Gauges */}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    
                    {renderGauge(dStatus, COLORS_STATUS, 'Tasks by Status', () => (
                        <>
                            {isEditing ? (
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label>Not Started: <input type="number" value={data.health.notStarted} onChange={e => updateHealth('notStarted', +e.target.value)} style={{width: 50}} /></label>
                                    <label>In Progress: <input type="number" value={data.health.inProgress} onChange={e => updateHealth('inProgress', +e.target.value)} style={{width: 50}} /></label>
                                    <label>Complete: <input type="number" value={data.health.complete} onChange={e => updateHealth('complete', +e.target.value)} style={{width: 50}} /></label>
                                </div>
                            ) : (
                                dStatus.map(d => <span key={d.name} style={{ color: '#555' }}><span style={{fontWeight: 700}}>{d.value}%</span> {d.name}</span>)
                            )}
                        </>
                    ))}

                    {renderGauge(dHealth, COLORS_HEALTH, 'Tasks by Health', () => (
                         <>
                            {isEditing ? (
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label>Green: <input type="number" value={data.health.green} onChange={e => updateHealth('green', +e.target.value)} style={{width: 50}} /></label>
                                    <label>Yellow: <input type="number" value={data.health.yellow} onChange={e => updateHealth('yellow', +e.target.value)} style={{width: 50}} /></label>
                                    <label>Red: <input type="number" value={data.health.red} onChange={e => updateHealth('red', +e.target.value)} style={{width: 50}} /></label>
                                </div>
                            ) : (
                                dHealth.map(d => <span key={d.name} style={{ color: '#555' }}><span style={{fontWeight: 700}}>{d.value}%</span> {d.name}</span>)
                            )}
                        </>
                    ))}

                    {renderGauge(dRaidOpen, COLORS_RAID, 'Open RAID Items', () => (
                        <>
                            {isEditing ? (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                                    <label>Risk: <input type="number" value={data.health.riskOpen} onChange={e => updateHealth('riskOpen', +e.target.value)} style={{width: 30}} /></label>
                                    <label>Action: <input type="number" value={data.health.actionOpen} onChange={e => updateHealth('actionOpen', +e.target.value)} style={{width: 30}} /></label>
                                    <label>Issue: <input type="number" value={data.health.issueOpen} onChange={e => updateHealth('issueOpen', +e.target.value)} style={{width: 30}} /></label>
                                    <label>Dec: <input type="number" value={data.health.decisionOpen} onChange={e => updateHealth('decisionOpen', +e.target.value)} style={{width: 30}} /></label>
                                </div>
                            ) : (
                                dRaidOpen.map(d => <span key={d.name} style={{ color: '#555' }}><span style={{fontWeight: 700}}>{d.value}</span> {d.name}</span>)
                            )}
                        </>
                    ))}

                    {renderGauge(dRaidLate, COLORS_RAID, 'Late RAID Items', () => (
                        <>
                            {isEditing ? (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                                    <label>Risk: <input type="number" value={data.health.riskLate} onChange={e => updateHealth('riskLate', +e.target.value)} style={{width: 30}} /></label>
                                    <label>Action: <input type="number" value={data.health.actionLate} onChange={e => updateHealth('actionLate', +e.target.value)} style={{width: 30}} /></label>
                                    <label>Issue: <input type="number" value={data.health.issueLate} onChange={e => updateHealth('issueLate', +e.target.value)} style={{width: 30}} /></label>
                                    <label>Dec: <input type="number" value={data.health.decisionLate} onChange={e => updateHealth('decisionLate', +e.target.value)} style={{width: 30}} /></label>
                                </div>
                            ) : (
                                dRaidLate.map(d => <span key={d.name} style={{ color: '#555' }}><span style={{fontWeight: 700}}>{d.value}</span> {d.name}</span>)
                            )}
                        </>
                    ))}

                </div>

            </div>
        )}
    </div>
  );
}
