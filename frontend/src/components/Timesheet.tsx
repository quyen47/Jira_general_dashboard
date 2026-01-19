'use client';

import { useState, useEffect, useTransition } from 'react';
import { getProjectWorklogs, TimesheetData, WorklogEntry } from '@/actions/timesheet';
import RecentActivity from './RecentActivity';
import { getAllocations, createAllocation, updateAllocation, ResourceAllocation } from '@/lib/allocation-api';
import AllocationInput from './allocation/AllocationInput';
import CapacityIndicator from './allocation/CapacityIndicator';
import TeamCapacitySummary from './allocation/TeamCapacitySummary';
import { calculateWorkDays, calculateAvailableHours, calculateUtilization, determineStatus, getWeekStart, getWeekEnd, getStatusConfig, calculateWeightedAllocation } from '@/lib/capacity-utils';

export default function Timesheet({ projectKey, initialOpen = false }: { projectKey: string, initialOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [rangeType, setRangeType] = useState('7'); // '7', '14', '30', 'current_month', 'prev_month', 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [data, setData] = useState<TimesheetData | null>(null);
  const [baseUrl, setBaseUrl] = useState<string>('');
  const [isPending, startTransition] = useTransition();
  const [selectedCell, setSelectedCell] = useState<{
    date: string;
    authorName: string;
    entries: WorklogEntry[];
  } | null>(null);
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(null);
  
  // Allocation state - supports multiple allocations per person
  const [allocations, setAllocations] = useState<Map<string, ResourceAllocation[]>>(new Map());
  const [isLoadingAllocations, setIsLoadingAllocations] = useState(false);

  // Reset drill-down when modal closes or changes
  useEffect(() => {
    setExpandedActivityId(null);
  }, [selectedCell]);
  
  // Set initial custom dates when component mounts or when switching to custom (optional)
  useEffect(() => {
      if (rangeType === 'custom' && !customStartDate) {
          const end = new Date();
          const start = new Date();
          start.setDate(end.getDate() - 7);
          setCustomStartDate(start.toISOString().split('T')[0]);
          setCustomEndDate(end.toISOString().split('T')[0]);
      }
  }, [rangeType]);

  // Export State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFields, setExportFields] = useState({
    issueKey: true,
    issueSummary: true,
    timeSpent: true,
    startDate: true,
    author: true,
    // Optional defaults
    worklogId: false,
    issueStatus: false,
    issueType: false,
    timeSpentSeconds: false,
    updateDate: false,
    comment: false,
    authorAccountId: false,
    projectKey: false,
    projectName: false,
    components: false,
    labels: false
  });

  // Calculate dates based on rangeType
  const getDateRange = () => {
    if (rangeType === 'custom') {
        return {
            startDate: customStartDate || new Date().toISOString().split('T')[0],
            endDate: customEndDate || new Date().toISOString().split('T')[0]
        };
    }

    const today = new Date();
    let startDate = new Date();
    let endDate = new Date(); // Defaults to today

    if (rangeType === 'current_month') {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else if (rangeType === 'prev_month') {
      startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      endDate = new Date(today.getFullYear(), today.getMonth(), 0);
    } else {
      const days = parseInt(rangeType);
      startDate.setDate(today.getDate() - days + 1); // +1 to include today as last day? Adjust logic as needed.
      // Usually "Last 7 days" includes today.
    }
    
    return { 
      startDate: startDate.toISOString().split('T')[0], 
      endDate: endDate.toISOString().split('T')[0] 
    };
  };

  const { startDate, endDate } = getDateRange();

  // Initial load
  useEffect(() => {
    if (isOpen && !data) {
      loadData();
    }
  }, [isOpen]);

  const loadAllocations = async () => {
    setIsLoadingAllocations(true);
    try {
      const range = getDateRange();
      // Fetch ALL allocations that overlap with the selected date range
      const allocs = await getAllocations(projectKey, range.startDate, range.endDate);
      
      // Group allocations by accountId (multiple allocations per person)
      const allocMap = new Map<string, ResourceAllocation[]>();
      allocs.forEach((alloc: ResourceAllocation) => {
        const existing = allocMap.get(alloc.accountId) || [];
        existing.push(alloc);
        allocMap.set(alloc.accountId, existing);
      });
      
      // Store as Map<accountId, ResourceAllocation[]> for multiple allocations
      setAllocations(allocMap);
    } catch (error) {
      console.error('Failed to load allocations:', error);
    } finally {
      setIsLoadingAllocations(false);
    }
  };

  const loadData = () => {
    startTransition(async () => {
      const range = getDateRange();
      const result = await getProjectWorklogs(projectKey, range);
      setData(result.data);
      setBaseUrl(result.baseUrl);
      
      // Load allocations
      await loadAllocations();
    });
  };

  // Auto-refresh when custom dates change
  useEffect(() => {
    if (rangeType === 'custom' && customStartDate && customEndDate) {
        // Debounce slightly to avoid rapid updates if user types fast (though these are date inputs)
        const timer = setTimeout(() => {
            loadData();
        }, 500);
        return () => clearTimeout(timer);
    }
  }, [customStartDate, customEndDate, rangeType]);

  // Generate date columns
  const getDates = () => {
    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Safety check loop to prevent infinite
    let current = new Date(start);
    // Limit to 60 days to prevent browser crash if user selects huge range
    let count = 0;
    while (current <= end && count < 60) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
      count++;
    }
    return dates;
  };

  const dates = getDates();

  // Get unique users
  const getUsers = () => {
    if (!data) return [];
    
    const usersMap = new Map<string, { accountId: string; displayName: string; avatarUrl?: string }>();
    
    Object.values(data).forEach(dayData => {
      Object.values(dayData).forEach(userEntry => {
        if (!usersMap.has(userEntry.author.accountId)) {
          usersMap.set(userEntry.author.accountId, userEntry.author);
        }
      });
    });
    
    return Array.from(usersMap.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
  };

  const users = getUsers();

  const handleExport = () => {
    if (!data) return;
    
    // Flatten data for export
    const rows = [];
    // Header
    const fields = Object.keys(exportFields).filter(key => exportFields[key as keyof typeof exportFields]);
    rows.push(fields.join(','));
    
    Object.values(data).forEach(dayData => {
      Object.values(dayData).forEach(userEntry => {
        userEntry.entries.forEach(entry => {
          const row = fields.map(field => {
            let val = '';
            switch(field) {
              case 'issueKey': val = entry.issueKey; break;
              case 'issueSummary': val = `"${entry.issueSummary.replace(/"/g, '""')}"`; break;
              case 'timeSpent': val = entry.timeSpent; break;
              case 'startDate': val = entry.started.split('T')[0]; break;
              case 'author': val = entry.author.displayName; break;
              case 'worklogId': val = entry.id; break;
              case 'issueStatus': val = entry.issueStatus; break;
              case 'timeSpentSeconds': val = entry.timeSpentSeconds.toString(); break;
              case 'updateDate': val = entry.updated ? entry.updated.split('T')[0] : ''; break;
              case 'comment': val = entry.comment ? `"${entry.comment.replace(/"/g, '""')}"` : ''; break;
              case 'authorAccountId': val = entry.author.accountId; break;
              case 'projectKey': val = entry.projectKey; break;
              case 'projectName': val = entry.projectName; break;
              case 'components': val = `"${entry.components.join(', ')}"`; break;
              case 'labels': val = `"${entry.labels.join(', ')}"`; break;
            }
            return val;
          });
          rows.push(row.join(','));
        });
      });
    });
    
    // Download CSV
    const csvContent = "data:text/csv;charset=utf-8," + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `worklogs_${projectKey}_${startDate}_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportModal(false);
  };

  const formatSeconds = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };
  
  const todayStr = new Date().toISOString().split('T')[0];

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>TIMESHEET</span>
        </div>
        <span>{isOpen ? '▼' : '▶'}</span>
      </div>

      {isOpen && (
        <div style={{ padding: '20px' }}>
          {/* Controls */}
          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {rangeType === 'custom' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f4f5f7', padding: '4px 8px', borderRadius: 4, border: '1px solid #dfe1e6' }}>
                    <input 
                        type="date" 
                        value={customStartDate} 
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        style={{ border: 'none', background: 'transparent', fontSize: '0.9rem', color: '#172b4d' }}
                    />
                    <span style={{ color: '#6b778c' }}>to</span>
                    <input 
                        type="date" 
                        value={customEndDate} 
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        style={{ border: 'none', background: 'transparent', fontSize: '0.9rem', color: '#172b4d' }}
                    />
                </div>
            )}
            
            <select 
              value={rangeType} 
              onChange={(e) => {
                setRangeType(e.target.value);
                // Trigger refresh cleanly
                setTimeout(() => document.getElementById('refresh-timesheet')?.click(), 100);
              }}
              style={{
                padding: '6px 12px',
                borderRadius: 4,
                border: '1px solid #dfe1e6',
                background: '#f4f5f7',
                fontSize: '0.9rem'
              }}
            >
              <option value="7">Last 7 Days</option>
              <option value="14">Last 14 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="current_month">Current Month</option>
              <option value="prev_month">Previous Month</option>
              <option value="custom">Custom Range</option>
            </select>
            
             <button 
              onClick={() => setShowExportModal(true)}
              style={{
                padding: '6px 12px',
                borderRadius: 4,
                border: '1px solid #dfe1e6',
                background: 'white',
                color: '#172b4d',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>📥</span> Export
            </button>
            
            <button 
              id="refresh-timesheet"
              onClick={loadData}
              disabled={isPending}
              style={{
                padding: '6px 12px',
                borderRadius: 4,
                border: 'none',
                background: '#0052cc',
                color: 'white',
                cursor: 'pointer',
                opacity: isPending ? 0.7 : 1
              }}
            >
              {isPending ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {/* Grid */}
          <div style={{ overflowX: 'auto', marginLeft: '-20px', marginRight: '-20px', paddingLeft: '20px', paddingRight: '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.9rem' }}>
              <thead>
                <tr>
                  <th style={{ 
                    textAlign: 'left', 
                    padding: '10px', 
                    borderBottom: '2px solid #dfe1e6', 
                    minWidth: '200px', 
                    width: '200px',
                    position: 'sticky',
                    left: 0,
                    zIndex: 20,
                    background: 'white',
                    borderRight: '1px solid #dfe1e6'
                  }}>Member</th>
                  <th style={{ 
                    textAlign: 'center', 
                    padding: '10px 20px', 
                    borderBottom: '2px solid #dfe1e6', 
                    whiteSpace: 'nowrap',
                    minWidth: '100px',
                    position: 'sticky',
                    left: '200px',
                    zIndex: 20,
                    background: 'white',
                    borderRight: '2px solid #dfe1e6'
                  }}>Total</th>
                  <th style={{ 
                    textAlign: 'center', 
                    padding: '10px', 
                    borderBottom: '2px solid #dfe1e6', 
                    whiteSpace: 'nowrap',
                    minWidth: '100px',
                    position: 'sticky',
                    left: '300px',
                    zIndex: 20,
                    background: 'white',
                    borderRight: '1px solid #dfe1e6'
                  }}>Allocation</th>
                  <th style={{ 
                    textAlign: 'center', 
                    padding: '10px', 
                    borderBottom: '2px solid #dfe1e6', 
                    whiteSpace: 'nowrap',
                    minWidth: '150px',
                    position: 'sticky',
                    left: '400px',
                    zIndex: 20,
                    background: 'white',
                    borderRight: '1px solid #dfe1e6'
                  }}>Capacity</th>
                  <th style={{ 
                    textAlign: 'center', 
                    padding: '10px', 
                    borderBottom: '2px solid #dfe1e6', 
                    whiteSpace: 'nowrap',
                    minWidth: '100px',
                    position: 'sticky',
                    left: '550px',
                    zIndex: 20,
                    background: 'white',
                    borderRight: '2px solid #dfe1e6'
                  }}>Status</th>
                  {dates.map((date, index) => {
                    const isToday = date === todayStr;
                    return (
                      <th key={date} style={{ 
                        textAlign: 'center', 
                        padding: '10px', 
                        borderBottom: '2px solid #dfe1e6', 
                        minWidth: '80px',
                        background: isToday ? '#e3fcef' : 'transparent' // Highlight today
                      }}>
                        {formatDate(date)}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={dates.length + 2} style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                      {isPending ? 'Loading worklogs...' : 'No worklogs found for this period'}
                    </td>
                  </tr>
                ) : (
                  users.map(user => {
                    let userTotal = 0;
                    // Calculate total first
                    dates.forEach(date => {
                       const entry = data?.[date]?.[user.accountId];
                       userTotal += (entry?.totalSeconds || 0);
                    });
                    
                    return (
                      <tr key={user.accountId}>
                        <td style={{ 
                          padding: '10px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px',
                          borderBottom: '1px solid #eee',
                          position: 'sticky',
                          left: 0,
                          zIndex: 10,
                          background: 'white',
                          borderRight: '1px solid #dfe1e6',
                          minWidth: '200px',
                          width: '200px'
                        }}>
                          {user.avatarUrl && (
                            <img src={user.avatarUrl} alt="" style={{ width: 24, height: 24, borderRadius: '50%' }} />
                          )}
                          <span style={{ fontWeight: 500, color: '#172b4d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' }}>{user.displayName}</span>
                        </td>
                        <td style={{ 
                          textAlign: 'center', 
                          padding: '10px 20px', 
                          fontWeight: 600, 
                          background: 'white',
                          whiteSpace: 'nowrap',
                          borderBottom: '1px solid #eee',
                          position: 'sticky',
                          left: '200px',
                          zIndex: 10,
                          borderRight: '2px solid #dfe1e6',
                          minWidth: '100px'
                        }}>
                          {formatSeconds(userTotal)}
                        </td>
                        
                        {/* Allocation Column */}
                        <td style={{ 
                          textAlign: 'center', 
                          padding: '10px', 
                          background: 'white',
                          borderBottom: '1px solid #eee',
                          position: 'sticky',
                          left: '300px',
                          zIndex: 10,
                          borderRight: '1px solid #dfe1e6',
                          minWidth: '100px'
                        }}>
                          <AllocationInput
                            accountId={user.accountId}
                            displayName={user.displayName}
                            currentAllocation={(() => {
                              const userAllocs = allocations.get(user.accountId);
                              if (!userAllocs || userAllocs.length === 0) return 0;
                              const weighted = calculateWeightedAllocation(userAllocs, startDate, endDate);
                              return Math.round(weighted.weightedAllocation);
                            })()}
                            onSave={async (percent) => {
                              // Create a new allocation for the current date range
                              await createAllocation(projectKey, {
                                accountId: user.accountId,
                                displayName: user.displayName,
                                avatarUrl: user.avatarUrl,
                                startDate: startDate,
                                endDate: endDate,
                                allocationPercent: percent
                              });
                              await loadAllocations();
                            }}
                            projectKey={projectKey}
                            onAllocationChange={loadAllocations}
                          />
                        </td>

                        {/* Capacity Column */}
                        <td style={{ 
                          textAlign: 'center', 
                          padding: '10px', 
                          background: 'white',
                          borderBottom: '1px solid #eee',
                          position: 'sticky',
                          left: '400px',
                          zIndex: 10,
                          borderRight: '1px solid #dfe1e6',
                          minWidth: '150px'
                        }}>
                          {(() => {
                            const userAllocs = allocations.get(user.accountId);
                            if (!userAllocs || userAllocs.length === 0) return <span style={{ color: '#999' }}>-</span>;
                            
                            const weighted = calculateWeightedAllocation(userAllocs, startDate, endDate);
                            const actualHours = userTotal / 3600;
                            const utilization = calculateUtilization(actualHours, weighted.totalAvailableHours);
                            const status = determineStatus(utilization, weighted.weightedAllocation);
                            
                            return (
                              <CapacityIndicator
                                availableHours={weighted.totalAvailableHours}
                                actualHours={actualHours}
                                utilizationPercent={utilization}
                                status={status}
                              />
                            );
                          })()}
                        </td>

                        {/* Status Column */}
                        <td style={{ 
                          textAlign: 'center', 
                          padding: '10px', 
                          position: 'sticky',
                          left: '550px',
                          zIndex: 10,
                          minWidth: '100px',
                          background: (() => {
                            const userAllocs = allocations.get(user.accountId);
                            if (!userAllocs || userAllocs.length === 0) return 'white';
                            
                            const weighted = calculateWeightedAllocation(userAllocs, startDate, endDate);
                            const actualHours = userTotal / 3600;
                            const utilization = calculateUtilization(actualHours, weighted.totalAvailableHours);
                            const status = determineStatus(utilization, weighted.weightedAllocation);
                            
                            return getStatusConfig(status).bgColor;
                          })(),
                          borderBottom: '1px solid #eee',
                          borderLeft: (() => {
                            const userAllocs = allocations.get(user.accountId);
                            if (!userAllocs || userAllocs.length === 0) return 'none';
                            
                            const weighted = calculateWeightedAllocation(userAllocs, startDate, endDate);
                            const actualHours = userTotal / 3600;
                            const utilization = calculateUtilization(actualHours, weighted.totalAvailableHours);
                            const status = determineStatus(utilization, weighted.weightedAllocation);
                            
                            return `4px solid ${getStatusConfig(status).borderColor}`;
                          })(),
                          borderRight: '2px solid #dfe1e6'
                        }}>
                          {(() => {
                            const userAllocs = allocations.get(user.accountId);
                            if (!userAllocs || userAllocs.length === 0) return <span style={{ color: '#999' }}>-</span>;
                            
                            const weighted = calculateWeightedAllocation(userAllocs, startDate, endDate);
                            const actualHours = userTotal / 3600;
                            const utilization = calculateUtilization(actualHours, weighted.totalAvailableHours);
                            const status = determineStatus(utilization, weighted.weightedAllocation);
                            
                            const config = getStatusConfig(status);
                            return (
                              <span style={{
                                fontSize: '12px',
                                fontWeight: 600,
                                color: config.color,
                                padding: '4px 8px',
                                background: config.bgColor,
                                borderRadius: '4px',
                                display: 'inline-block'
                              }}>
                                {config.label}
                              </span>
                            );
                          })()}
                        </td>
                        
                        {dates.map((date, index) => {
                          const entry = data?.[date]?.[user.accountId];
                          const seconds = entry?.totalSeconds || 0;
                          const isToday = date === todayStr;
                          
                          return (
                            <td 
                              key={date} 
                              onClick={() => {
                                if (entry && entry.entries.length > 0) {
                                  setSelectedCell({
                                    date: formatDate(date),
                                    authorName: user.displayName,
                                    entries: entry.entries
                                  });
                                }
                              }}
                              style={{ 
                                textAlign: 'center', 
                                padding: '10px',
                                cursor: seconds > 0 ? 'pointer' : 'default',
                                background: seconds > 0 ? (selectedCell?.date === formatDate(date) && selectedCell?.authorName === user.displayName ? '#deebff' : isToday ? '#e3fcef' : 'transparent') : (isToday ? '#e3fcef' : 'transparent'),
                                color: seconds > 0 ? '#0052cc' : '#ccc',
                                borderBottom: '1px solid #eee'
                              }}
                            >
                              {seconds > 0 ? formatSeconds(seconds) : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Team Capacity Summary */}
          {data && allocations.size > 0 && (
            <TeamCapacitySummary
              totalCapacity={(() => {
                let total = 0;
                allocations.forEach((userAllocs) => {
                  const weighted = calculateWeightedAllocation(userAllocs, startDate, endDate);
                  total += weighted.totalAvailableHours;
                });
                return total;
              })()}
              totalActual={(() => {
                let total = 0;
                users.forEach(user => {
                  dates.forEach(date => {
                    const entry = data?.[date]?.[user.accountId];
                    total += (entry?.totalSeconds || 0) / 3600;
                  });
                });
                return total;
              })()}
              avgUtilization={(() => {
                let totalUtil = 0;
                let count = 0;
                
                users.forEach(user => {
                  const userAllocs = allocations.get(user.accountId);
                  if (userAllocs && userAllocs.length > 0) {
                    const weighted = calculateWeightedAllocation(userAllocs, startDate, endDate);
                    let actualHours = 0;
                    dates.forEach(date => {
                      const entry = data?.[date]?.[user.accountId];
                      actualHours += (entry?.totalSeconds || 0) / 3600;
                    });
                    totalUtil += calculateUtilization(actualHours, weighted.totalAvailableHours);
                    count++;
                  }
                });
                
                return count > 0 ? totalUtil / count : 0;
              })()}
              overloadedCount={(() => {
                let count = 0;
                
                users.forEach(user => {
                  const userAllocs = allocations.get(user.accountId);
                  if (userAllocs && userAllocs.length > 0) {
                    const weighted = calculateWeightedAllocation(userAllocs, startDate, endDate);
                    let actualHours = 0;
                    dates.forEach(date => {
                      const entry = data?.[date]?.[user.accountId];
                      actualHours += (entry?.totalSeconds || 0) / 3600;
                    });
                    const utilization = calculateUtilization(actualHours, weighted.totalAvailableHours);
                    const status = determineStatus(utilization, weighted.weightedAllocation);
                    if (status === 'overloaded') count++;
                  }
                });
                
                return count;
              })()}
              underloadedCount={(() => {
                let count = 0;
                
                users.forEach(user => {
                  const userAllocs = allocations.get(user.accountId);
                  if (userAllocs && userAllocs.length > 0) {
                    const weighted = calculateWeightedAllocation(userAllocs, startDate, endDate);
                    let actualHours = 0;
                    dates.forEach(date => {
                      const entry = data?.[date]?.[user.accountId];
                      actualHours += (entry?.totalSeconds || 0) / 3600;
                    });
                    const utilization = calculateUtilization(actualHours, weighted.totalAvailableHours);
                    const status = determineStatus(utilization, weighted.weightedAllocation);
                    if (status === 'underloaded') count++;
                  }
                });
                
                return count;
              })()}
            />
          )}

          {/* Details Modal */}
          {selectedCell && (
            <div style={{ 
              marginTop: '20px', 
              padding: '20px', 
              background: '#f4f5f7', 
              borderRadius: 8,
              border: '1px solid #dfe1e6',
              animation: 'fadeIn 0.2s ease-in-out'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h4 style={{ margin: 0, color: '#172b4d' }}>
                  Worklogs for {selectedCell.authorName} on {selectedCell.date}
                </h4>
                <button 
                  onClick={() => setSelectedCell(null)}
                  style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#5e6c84' }}
                >
                  ×
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selectedCell.entries.map(entry => (
                  <div key={entry.id} style={{ background: 'white', padding: '12px', borderRadius: 4, border: '1px solid #dfe1e6' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <a 
                          href={`${baseUrl}/browse/${entry.issueKey}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontWeight: 600, color: '#0052cc', textDecoration: 'none', cursor: 'pointer' }}
                          onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
                          onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}
                        >
                          {entry.issueKey}
                        </a>
                        <button
                            onClick={() => {
                                // Toggle activity view for this entry
                                // Using a new state for expanded activity
                                setExpandedActivityId(expandedActivityId === entry.id ? null : entry.id);
                            }}
                            style={{
                                fontSize: '0.75rem',
                                color: '#505f79',
                                background: '#f4f5f7',
                                border: 'none',
                                padding: '2px 6px',
                                borderRadius: 3,
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 4
                            }}
                        >
                            History {expandedActivityId === entry.id ? '▲' : '▼'}
                        </button>
                      </div>
                      <span style={{ fontWeight: 600, color: '#00875a' }}>{entry.timeSpent}</span>
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#172b4d', marginBottom: '4px' }}>
                      {entry.issueSummary}
                    </div>
                    {entry.comment && (
                      <div style={{ fontSize: '0.85rem', color: '#5e6c84', fontStyle: 'italic', borderTop: '1px solid #eee', marginTop: '6px', paddingTop: '6px' }}>
                        "{entry.comment}"
                      </div>
                    )}
                    
                    {/* Inline Activity Drill-down */}
                    {expandedActivityId === entry.id && (
                        <div style={{ marginTop: 10, border: '1px solid #ebecf0', borderRadius: 4 }}>
                            <RecentActivity 
                                projectKey={projectKey} 
                                baseUrl={baseUrl} 
                                forcedUsername={selectedCell.authorName} 
                                forcedIssueKey={entry.issueKey} 
                            />
                        </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Export Modal */}
          {showExportModal && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div style={{
                background: 'white',
                padding: '24px',
                borderRadius: '8px',
                width: '400px',
                maxWidth: '90%',
                maxHeight: '90vh',
                overflowY: 'auto'
              }}>
                <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#172b4d' }}>Export Worklogs</h3>
                
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '0.9rem', marginBottom: '10px' }}>Select Fields</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                    {Object.keys(exportFields).map(key => (
                      <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={(exportFields as any)[key]} 
                          onChange={e => setExportFields({...exportFields, [key]: e.target.checked})}
                        />
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button 
                    onClick={() => setShowExportModal(false)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 4,
                      border: 'none',
                      background: 'none',
                      color: '#42526e',
                      cursor: 'pointer',
                      fontWeight: 500
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleExport}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 4,
                      border: 'none',
                      background: '#0052cc',
                      color: 'white',
                      cursor: 'pointer',
                      fontWeight: 500
                    }}
                  >
                    Export CSV
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
