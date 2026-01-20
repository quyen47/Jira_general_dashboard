'use client';

import { useState, useEffect, useTransition } from 'react';
import { generateWorklogReport, WorklogReport, ReportIssue } from '@/actions/reports';
import TimeDistributionChart from './charts/TimeDistributionChart';
import TeamContributionChart from './charts/TeamContributionChart';
import IssueTypeBreakdown from './charts/IssueTypeBreakdown';

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

  // Drill-down filter state
  const [filterMember, setFilterMember] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'charts'>('overview');
  const [groupingLevel, setGroupingLevel] = useState(0); // 0 = no grouping, 1+ = levels of parent grouping

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

  // Filter issues by member or type
  function getFilteredIssues(issues: ReportIssue[], memberName: string | null, issueType: string | null): ReportIssue[] {
    if (!memberName && !issueType) return issues;

    function matchesFilter(issue: ReportIssue): boolean {
      const memberMatch = !memberName || issue.assignees.some(a => a.name === memberName);
      const typeMatch = !issueType || issue.issueType === issueType;
      return memberMatch && typeMatch;
    }

    function filterRecursive(issue: ReportIssue): ReportIssue | null {
      const matches = matchesFilter(issue);
      const filteredChildren = issue.children
        ?.map(child => filterRecursive(child))
        .filter((child): child is ReportIssue => child !== null);

      if (matches || (filteredChildren && filteredChildren.length > 0)) {
        return {
          ...issue,
          children: filteredChildren
        };
      }

      return null;
    }

    return issues
      .map(issue => filterRecursive(issue))
      .filter((issue): issue is ReportIssue => issue !== null);
  }

  // Recursively group issues by parent, level by level
  function groupIssuesByParentLevel(issues: ReportIssue[], level: number): ReportIssue[] {
    if (level === 0) return issues;

    const parentMap = new Map<string, ReportIssue[]>();
    const noParentIssues: ReportIssue[] = [];
    const allIssuesMap = new Map<string, ReportIssue>();

    // Build a map of all issues for lookup (including nested children)
    function buildIssueMap(issueList: ReportIssue[]) {
      issueList.forEach(issue => {
        allIssuesMap.set(issue.key, issue);
        if (issue.children) {
          buildIssueMap(issue.children);
        }
      });
    }
    buildIssueMap(issues);
    
    // Merge parent metadata from report (fetched parents without worklogs)
    if (report?.parentMetadata) {
      Object.entries(report.parentMetadata).forEach(([key, parentIssue]) => {
        if (!allIssuesMap.has(key)) {
          allIssuesMap.set(key, parentIssue);
        }
      });
      console.log('Merged parent metadata:', Object.keys(report.parentMetadata));
    }

    // Group by immediate parent
    issues.forEach(issue => {
      if (issue.parent) {
        const parentKey = issue.parent.key;
        if (!parentMap.has(parentKey)) {
          parentMap.set(parentKey, []);
        }
        parentMap.get(parentKey)!.push(issue);
      } else {
        noParentIssues.push(issue);
      }
    });

    // Build grouped result
    const grouped: ReportIssue[] = [];

    // Add parent groups
    parentMap.forEach((children, parentKey) => {
      // Get parent from allIssuesMap (includes both regular issues and fetched parent metadata)
      const parentIssue = allIssuesMap.get(parentKey);
      
      if (parentIssue) {
        // Parent exists - use it with children
        grouped.push({
          ...parentIssue,
          children: children,
          totalHours: (parentIssue.totalHours || 0) + children.reduce((sum, c) => sum + c.totalHours, 0)
        });
      } else {
        // Create placeholder parent - try to infer type from key or use first child's parent info
        const parentInfo = children[0]?.parent;
        if (parentInfo) {
          // Try to infer issue type from the parent key or context
          let inferredType = 'Story'; // Default assumption
          
          // Check if any child is a Story, then parent is likely Epic
          const hasStoryChild = children.some(c => c.issueType === 'Story');
          if (hasStoryChild) {
            inferredType = 'Epic';
          } else if (children.some(c => c.issueType === 'Sub-task' || c.issueType === 'Subtask')) {
            // If children are subtasks, parent is likely Story
            inferredType = 'Story';
          }
          
          grouped.push({
            key: parentKey,
            summary: parentInfo.summary || 'Unknown Parent',
            issueType: inferredType,
            status: 'Unknown',
            totalHours: children.reduce((sum, c) => sum + c.totalHours, 0),
            assignees: [],
            statusCategory: 'new',
            children: children
          });
        }
      }
    });

    // Add issues without parent
    noParentIssues.forEach(issue => grouped.push(issue));

    // Recursively group the next level
    if (level > 1) {
      return groupIssuesByParentLevel(grouped, level - 1);
    }

    return grouped;
  }

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

              {/* Tab Navigation */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #dfe1e6' }}>
                <button
                  onClick={() => setActiveTab('overview')}
                  style={{
                    padding: '10px 20px',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === 'overview' ? '3px solid #0052cc' : '3px solid transparent',
                    color: activeTab === 'overview' ? '#0052cc' : '#5e6c84',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    marginBottom: '-2px'
                  }}
                >
                  📊 Overview
                </button>
                <button
                  onClick={() => setActiveTab('charts')}
                  style={{
                    padding: '10px 20px',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === 'charts' ? '3px solid #0052cc' : '3px solid transparent',
                    color: activeTab === 'charts' ? '#0052cc' : '#5e6c84',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    marginBottom: '-2px'
                  }}
                >
                  📈 Charts
                </button>
              </div>

              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <>
                  {/* Filter Section */}
                  <div style={{ marginBottom: '20px', background: '#f4f5f7', padding: '15px', borderRadius: 8 }}>
                    <h5 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#172b4d' }}>🔍 Filter Issues</h5>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#5e6c84', marginBottom: '6px' }}>Team Member</label>
                        <select
                          value={filterMember || ''}
                          onChange={(e) => setFilterMember(e.target.value || null)}
                          style={{ width: '100%', padding: '8px', border: '1px solid #dfe1e6', borderRadius: 4, fontSize: '0.9rem', background: 'white' }}
                        >
                          <option value="">All Members</option>
                          {(() => {
                            const members = new Set<string>();
                            function collectMembers(issue: ReportIssue) {
                              issue.assignees.forEach(a => members.add(a.name));
                              issue.children?.forEach(child => collectMembers(child));
                            }
                            report.issues.forEach(issue => collectMembers(issue));
                            return Array.from(members).sort().map(name => (
                              <option key={name} value={name}>{name}</option>
                            ));
                          })()}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#5e6c84', marginBottom: '6px' }}>Issue Type</label>
                        <select
                          value={filterType || ''}
                          onChange={(e) => setFilterType(e.target.value || null)}
                          style={{ width: '100%', padding: '8px', border: '1px solid #dfe1e6', borderRadius: 4, fontSize: '0.9rem', background: 'white' }}
                        >
                          <option value="">All Types</option>
                          {(() => {
                            const types = new Set<string>();
                            function collectTypes(issue: ReportIssue) {
                              types.add(issue.issueType);
                              issue.children?.forEach(child => collectTypes(child));
                            }
                            report.issues.forEach(issue => collectTypes(issue));
                            return Array.from(types).sort().map(type => (
                              <option key={type} value={type}>{type}</option>
                            ));
                          })()}
                        </select>
                      </div>
                    </div>
                  </div>

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

                  {/* Filter badges */}
                  {(filterMember || filterType) && (
                    <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', alignItems: 'center', background: '#deebff', padding: '10px', borderRadius: 6 }}>
                      <span style={{ fontSize: '0.85rem', color: '#0052cc', fontWeight: 600 }}>Active Filters:</span>
                      {filterMember && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', padding: '4px 10px', borderRadius: 16, fontSize: '0.85rem', border: '1px solid #0052cc' }}>
                          <span>👤 {filterMember}</span>
                        </div>
                      )}
                      {filterType && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', padding: '4px 10px', borderRadius: 16, fontSize: '0.85rem', border: '1px solid #0052cc' }}>
                          <span>📋 {filterType}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Issues Tree */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                      <h4 style={{ margin: 0, fontSize: '1rem', color: '#172b4d' }}>
                        Work Breakdown ({getFilteredIssues(report.issues, filterMember, filterType).length} items)
                        {groupingLevel > 0 && (
                          <span style={{ fontSize: '0.85rem', color: '#5e6c84', fontWeight: 400, marginLeft: '10px' }}>
                            (Grouped {groupingLevel} level{groupingLevel > 1 ? 's' : ''} up)
                          </span>
                        )}
                      </h4>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {groupingLevel > 0 && (
                          <button
                            onClick={() => setGroupingLevel(0)}
                            style={{
                              padding: '6px 12px',
                              background: '#f4f5f7',
                              color: '#172b4d',
                              border: '1px solid #dfe1e6',
                              borderRadius: 4,
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              fontWeight: 600
                            }}
                          >
                            Reset
                          </button>
                        )}
                        <button
                          onClick={() => setGroupingLevel(groupingLevel + 1)}
                          style={{
                            padding: '6px 12px',
                            background: groupingLevel > 0 ? '#0052cc' : '#f4f5f7',
                            color: groupingLevel > 0 ? 'white' : '#172b4d',
                            border: '1px solid #dfe1e6',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          {groupingLevel > 0 ? '↑' : ''} Group by Parent
                        </button>
                      </div>
                    </div>
                    <div style={{ border: '1px solid #dfe1e6', borderRadius: 8, overflow: 'hidden' }}>
                      {/* Header Row */}
                      <div style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        background: '#f4f5f7',
                        borderBottom: '2px solid #dfe1e6',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        color: '#5e6c84',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        <div style={{ width: '20px' }} /> {/* Expand/collapse space */}
                        <div style={{ minWidth: '60px', textAlign: 'center' }}>Type</div>
                        <div style={{ minWidth: '100px' }}>Key</div>
                        <div style={{ flex: 1 }}>Summary</div>
                        <div style={{ minWidth: '100px' }}>Contributors</div>
                        <div style={{ minWidth: '80px' }}>Status</div>
                        <div style={{ minWidth: '60px', textAlign: 'right' }}>Hours</div>
                      </div>
                      {/* Issues */}
                      {groupIssuesByParentLevel(getFilteredIssues(report.issues, filterMember, filterType), groupingLevel).map(issue => (
                        <IssueTreeNode key={issue.key} issue={issue} baseUrl={baseUrl} level={0} />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Charts Tab */}
              {activeTab === 'charts' && (
                <div style={{ display: 'grid', gap: '20px' }}>
                  <TimeDistributionChart dailyHours={report.trends.dailyHours} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <TeamContributionChart 
                      issues={report.issues} 
                      onMemberClick={(accountId, name) => {
                        setFilterMember(name);
                        setActiveTab('overview');
                      }}
                    />
                    <IssueTypeBreakdown 
                      issues={report.issues}
                      onTypeClick={(type) => {
                        setFilterType(type);
                        setActiveTab('overview');
                      }}
                    />
                  </div>
                </div>
              )}
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

  // Calculate Epic progress if this is an Epic with children
  const isEpic = issue.issueType === 'Epic';
  let epicProgress = 0;
  if (isEpic && hasChildren) {
    const totalChildren = issue.children!.length;
    const doneChildren = issue.children!.filter(child => child.statusCategory === 'done').length;
    epicProgress = totalChildren > 0 ? (doneChildren / totalChildren) * 100 : 0;
  }

  // Get type color
  const typeColors: Record<string, string> = {
    'Epic': '#6554c0',
    'Story': '#0052cc',
    'Task': '#00875a',
    'Bug': '#ff5630',
    'Subtask': '#00b8d9',
    'Sub-task': '#00b8d9'
  };
  const typeColor = typeColors[issue.issueType] || '#8993a4';

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
        
        {/* Issue Type Badge */}
        <div style={{ 
          padding: '2px 6px', 
          borderRadius: 3, 
          fontSize: '0.7rem', 
          background: typeColor + '20',
          color: typeColor,
          fontWeight: 600,
          minWidth: '60px',
          textAlign: 'center'
        }}>
          {issue.issueType}
        </div>

        <a
          href={baseUrl ? `${baseUrl}/browse/${issue.key}` : '#'}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#0052cc', fontWeight: 600, textDecoration: 'none', fontSize: '0.9rem' }}
        >
          {issue.key}
        </a>

        <div style={{ flex: 1, fontSize: '0.9rem', color: '#172b4d' }}>
          {issue.summary}
          {/* Show parent ticket if exists */}
          <div style={{ fontSize: '0.75rem', color: '#5e6c84', marginTop: '2px' }}>
            {issue.parent ? (
              <>
                <span style={{ fontWeight: 600 }}>Parent ticket:</span> {issue.parent.key} - {issue.parent.summary}
              </>
            ) : (
              <span style={{ color: '#97a0af' }}>No parent ticket</span>
            )}
          </div>
        </div>

        {/* Assignees */}
        {issue.assignees.length > 0 ? (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', minWidth: '100px' }}>
            {issue.assignees.slice(0, 3).map((assignee, idx) => {
              // Generate a color based on the name
              const getColorFromName = (name: string) => {
                const colors = ['#0052cc', '#00875a', '#6554c0', '#ff5630', '#ff8b00', '#36b37e'];
                const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                return colors[hash % colors.length];
              };
              
              return (
                <div 
                  key={idx}
                  title={`${assignee.name}: ${assignee.hours}h`}
                  style={{ 
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: getColorFromName(assignee.name),
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    cursor: 'default'
                  }}
                >
                  {assignee.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
              );
            })}
            {issue.assignees.length > 3 && (
              <div style={{ fontSize: '0.75rem', color: '#5e6c84', fontWeight: 600 }}>
                +{issue.assignees.length - 3}
              </div>
            )}
          </div>
        ) : (
          <div style={{ minWidth: '100px', fontSize: '0.75rem', color: '#97a0af' }}>-</div>
        )}

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

      {/* Epic Progress Bar */}
      {isEpic && hasChildren && (
        <div style={{ 
          paddingLeft: `${32 + indent}px`,
          paddingRight: '16px',
          paddingTop: '8px',
          paddingBottom: '8px',
          background: level % 2 === 0 ? 'white' : '#fafbfc',
          borderBottom: '1px solid #f4f5f7'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ fontSize: '0.75rem', color: '#5e6c84', minWidth: '80px' }}>
              Progress: {Math.round(epicProgress)}%
            </div>
            <div style={{ flex: 1, height: '8px', background: '#f4f5f7', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ 
                width: `${epicProgress}%`, 
                height: '100%', 
                background: epicProgress === 100 ? '#36b37e' : '#0052cc',
                transition: 'width 0.3s'
              }} />
            </div>
            <div style={{ fontSize: '0.75rem', color: '#5e6c84' }}>
              {issue.children!.filter(c => c.statusCategory === 'done').length}/{issue.children!.length} done
            </div>
          </div>
        </div>
      )}

      {hasChildren && isExpanded && issue.children!.map(child => (
        <IssueTreeNode key={child.key} issue={child} baseUrl={baseUrl} level={level + 1} />
      ))}
    </div>
  );
}
