'use client';

import { useState, useEffect, useTransition } from 'react';
import { generateWorklogReport, WorklogReport, ReportIssue } from '@/actions/reports';

interface ReportGeneratorProps {
  projectKey: string;
  baseUrl?: string;
}

export default function ReportGenerator({ projectKey, baseUrl = '' }: ReportGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [report, setReport] = useState<WorklogReport | null>(null);
  const [isLoading, startTransition] = useTransition();
  
  // Date range state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [preset, setPreset] = useState<'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'custom'>('thisWeek');

  // Initialize with current week
  useEffect(() => {
    applyPreset('thisWeek');
  }, []);

  function getMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  function getSunday(date: Date): Date {
    const monday = getMonday(date);
    return new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000);
  }

  function applyPreset(presetType: typeof preset) {
    const now = new Date();
    let start: Date, end: Date;

    switch (presetType) {
      case 'thisWeek':
        start = getMonday(now);
        end = getSunday(now);
        break;
      case 'lastWeek':
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        start = getMonday(lastWeek);
        end = getSunday(lastWeek);
        break;
      case 'thisMonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'lastMonth':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      default:
        return;
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
    setPreset(presetType);
  }

  function handleGenerate() {
    if (!startDate || !endDate) return;
    
    startTransition(async () => {
      const reportData = await generateWorklogReport(projectKey, startDate, endDate);
      setReport(reportData);
    });
  }

  // Auto-generate when panel opens
  useEffect(() => {
    if (isOpen && startDate && endDate && !report) {
      handleGenerate();
    }
  }, [isOpen]);

  function exportCSV() {
    if (!report) return;

    const rows: string[][] = [
      ['Key', 'Summary', 'Type', 'Status', 'Hours', 'Estimated Hours', 'Assignees']
    ];

    function addIssueRows(issue: ReportIssue, indent = 0) {
      const indentStr = '  '.repeat(indent);
      rows.push([
        indentStr + issue.key,
        issue.summary,
        issue.issueType,
        issue.status,
        issue.totalHours.toString(),
        issue.estimatedHours?.toString() || '',
        issue.assignees.map(a => `${a.name} (${a.hours}h)`).join('; ')
      ]);

      if (issue.children) {
        issue.children.forEach(child => addIssueRows(child, indent + 1));
      }
    }

    report.issues.forEach(issue => addIssueRows(issue));

    const csvContent = rows.map(row => 
      row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report_${projectKey}_${startDate}_${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ background: 'white', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.1)', overflow: 'hidden', marginBottom: '2rem' }}>
      {/* Header */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          background: '#0747A6',
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
        <span>REPORT GENERATOR</span>
        <span>{isOpen ? '▼' : '▶'}</span>
      </div>

      {isOpen && (
        <div style={{ padding: '20px' }}>
          {/* Date Range Selector */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap' }}>
              <label style={{ fontWeight: 600, color: '#172b4d' }}>Time Range:</label>
              
              {(['thisWeek', 'lastWeek', 'thisMonth', 'lastMonth'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => applyPreset(p)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 4,
                    border: preset === p ? '2px solid #0052cc' : '1px solid #dfe1e6',
                    background: preset === p ? '#deebff' : 'white',
                    color: preset === p ? '#0052cc' : '#172b4d',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: preset === p ? 600 : 400
                  }}
                >
                  {p === 'thisWeek' ? 'This Week' : p === 'lastWeek' ? 'Last Week' : p === 'thisMonth' ? 'This Month' : 'Last Month'}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#5e6c84', marginBottom: '4px' }}>Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPreset('custom'); }}
                  style={{ padding: '8px', border: '1px solid #dfe1e6', borderRadius: 4, fontSize: '0.9rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#5e6c84', marginBottom: '4px' }}>End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPreset('custom'); }}
                  style={{ padding: '8px', border: '1px solid #dfe1e6', borderRadius: 4, fontSize: '0.9rem' }}
                />
              </div>
              <button
                onClick={handleGenerate}
                disabled={isLoading || !startDate || !endDate}
                style={{
                  padding: '8px 16px',
                  background: '#0052cc',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  opacity: isLoading ? 0.7 : 1,
                  alignSelf: 'flex-end'
                }}
              >
                {isLoading ? 'Generating...' : 'Generate Report'}
              </button>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <div style={{ fontSize: '1.2rem', marginBottom: '10px' }}>📊</div>
              <div>Analyzing worklogs and generating report...</div>
            </div>
          )}

          {/* Report Content */}
          {!isLoading && report && (
            <>
              {/* Summary Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                <MetricCard label="Total Hours" value={`${report.summary.totalHours}h`} color="#0052cc" />
                <MetricCard label="Active Issues" value={report.summary.activeIssues} color="#00875a" />
                <MetricCard label="Completed" value={report.summary.completedIssues} color="#36b37e" />
                <MetricCard label="Team Members" value={report.summary.teamMembers} color="#6554c0" />
                <MetricCard label="On Time" value={report.summary.onTimeIssues} color="#00b8d9" />
                <MetricCard label="Overdue" value={report.summary.overdueIssues} color="#ff5630" />
              </div>

              {/* Forecast Panel */}
              {report.forecast.projectedCompletion && (
                <div style={{ background: '#f4f5f7', padding: '15px', borderRadius: 8, marginBottom: '20px', borderLeft: '4px solid #0052cc' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: '#172b4d' }}>📈 Forecast</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', fontSize: '0.85rem' }}>
                    <div>
                      <div style={{ color: '#5e6c84', marginBottom: '4px' }}>Projected Completion</div>
                      <div style={{ fontWeight: 600, color: '#172b4d' }}>{new Date(report.forecast.projectedCompletion).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <div style={{ color: '#5e6c84', marginBottom: '4px' }}>Burn Rate</div>
                      <div style={{ fontWeight: 600, color: '#172b4d' }}>{report.trends.burnRate}h/day</div>
                    </div>
                    <div>
                      <div style={{ color: '#5e6c84', marginBottom: '4px' }}>Remaining Hours</div>
                      <div style={{ fontWeight: 600, color: '#172b4d' }}>{report.forecast.remainingHours}h</div>
                    </div>
                    <div>
                      <div style={{ color: '#5e6c84', marginBottom: '4px' }}>Velocity</div>
                      <div style={{ fontWeight: 600, color: '#172b4d' }}>{report.trends.velocity} issues/day</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Export Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
                <button
                  onClick={exportCSV}
                  style={{
                    padding: '8px 16px',
                    background: '#f4f5f7',
                    border: '1px solid #dfe1e6',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    color: '#172b4d'
                  }}
                >
                  📥 Export CSV
                </button>
              </div>

              {/* Issues Tree */}
              <div>
                <h4 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: '#172b4d' }}>
                  Work Breakdown ({report.issues.length} top-level items)
                </h4>
                <div style={{ border: '1px solid #dfe1e6', borderRadius: 8, overflow: 'hidden' }}>
                  {report.issues.map(issue => (
                    <IssueTreeNode key={issue.key} issue={issue} baseUrl={baseUrl} level={0} />
                  ))}
                </div>
              </div>
            </>
          )}

          {!isLoading && !report && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666', fontStyle: 'italic' }}>
              Select a date range and click "Generate Report" to view insights
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: 8, border: '1px solid #dfe1e6' }}>
      <div style={{ fontSize: '0.75rem', color: '#5e6c84', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: '1.8rem', fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function IssueTreeNode({ issue, baseUrl, level }: { issue: ReportIssue; baseUrl: string; level: number }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = issue.children && issue.children.length > 0;

  const statusColor = issue.statusCategory === 'done' ? '#36b37e' : issue.statusCategory === 'indeterminate' ? '#0052cc' : '#6b778c';
  const indent = level * 24;

  return (
    <div>
      <div 
        style={{ 
          padding: '12px 16px',
          borderBottom: '1px solid #f4f5f7',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          paddingLeft: `${16 + indent}px`,
          background: level % 2 === 0 ? 'white' : '#fafbfc'
        }}
      >
        {hasChildren && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', fontSize: '0.8rem' }}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        )}
        {!hasChildren && <span style={{ width: '20px' }} />}
        
        <a
          href={baseUrl ? `${baseUrl}/browse/${issue.key}` : '#'}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#0052cc', fontWeight: 600, textDecoration: 'none', fontSize: '0.9rem' }}
        >
          {issue.key}
        </a>

        <div style={{ flex: 1, fontSize: '0.9rem', color: '#172b4d' }}>{issue.summary}</div>

        <div style={{ 
          padding: '2px 8px', 
          borderRadius: 4, 
          fontSize: '0.75rem', 
          background: statusColor + '20',
          color: statusColor,
          fontWeight: 600
        }}>
          {issue.status}
        </div>

        <div style={{ fontWeight: 700, color: '#0052cc', fontSize: '0.95rem', minWidth: '60px', textAlign: 'right' }}>
          {issue.totalHours}h
        </div>
      </div>

      {hasChildren && isExpanded && issue.children!.map(child => (
        <IssueTreeNode key={child.key} issue={child} baseUrl={baseUrl} level={level + 1} />
      ))}
    </div>
  );
}
