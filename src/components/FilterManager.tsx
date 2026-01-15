'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { getJiraFilters, getFilterInsights, JiraFilter, FilterIssue } from '@/actions/filters';

interface LocalFilter {
  id: string;
  name: string;
  jql: string;
  isJira?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  'To Do': '#0052cc',
  'In Progress': '#00B8D9',
  'Done': '#36B37E',
  'default': '#8993a4'
};

const PRIORITY_COLORS: Record<string, string> = {
  'Highest': '#FF5630',
  'High': '#FF8B00',
  'Medium': '#FFAB00',
  'Low': '#36B37E',
  'Lowest': '#00B8D9',
  'default': '#8993a4'
};

export default function FilterManager({ projectKey }: { projectKey: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentFilterJql = searchParams.get('filterJql') || '';

  const [filters, setFilters] = useState<LocalFilter[]>([]);
  const [jiraFilters, setJiraFilters] = useState<JiraFilter[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newFilterName, setNewFilterName] = useState('');
  const [newFilterJql, setNewFilterJql] = useState('');
  
  // Insights state
  const [insights, setInsights] = useState<{ total: number; byStatus: any[]; byPriority: any[]; issues: FilterIssue[] } | null>(null);
  const [isLoadingInsights, startInsightsTransition] = useTransition();
  const [isLoadingFilters, startFiltersTransition] = useTransition();

  const STORAGE_KEY = `jira_dashboard_filters_${projectKey}`;

  // Load local filters and Jira filters
  useEffect(() => {
    // Load local filters
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setFilters(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load filters", e);
      }
    }

    // Fetch Jira filters
    startFiltersTransition(async () => {
      const jFilters = await getJiraFilters();
      setJiraFilters(jFilters);
    });
  }, [STORAGE_KEY]);

  // Fetch insights when filter changes or panel opens
  useEffect(() => {
    if (isOpen) {
      startInsightsTransition(async () => {
        const result = await getFilterInsights(currentFilterJql, projectKey);
        setInsights(result);
      });
    }
  }, [isOpen, currentFilterJql, projectKey]);

  const saveFilters = (newFilters: LocalFilter[]) => {
    setFilters(newFilters);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newFilters));
  };

  const handleAdd = () => {
    if (!newFilterName || !newFilterJql) return;
    const newFilter: LocalFilter = {
      id: Date.now().toString(),
      name: newFilterName,
      jql: newFilterJql
    };
    saveFilters([...filters, newFilter]);
    setNewFilterName('');
    setNewFilterJql('');
    setIsAdding(false);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this filter?')) {
      saveFilters(filters.filter(f => f.id !== id));
    }
  };

  const applyFilter = (jql: string) => {
    if (jql === currentFilterJql) {
      router.push(`/project/${projectKey}`);
    } else {
      const params = new URLSearchParams();
      params.set('filterJql', jql);
      router.push(`/project/${projectKey}?${params.toString()}`);
    }
  };

  const clearFilter = () => {
    router.push(`/project/${projectKey}`);
  };

  // Combine local and Jira filters
  const allFilters: LocalFilter[] = [
    ...jiraFilters.map(f => ({ ...f, isJira: true })),
    ...filters
  ];

  return (
    <div style={{ background: 'white', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.1)', overflow: 'hidden', marginBottom: '2rem' }}>
      {/* Header Bar - Like ProjectOverview */}
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
          <span>FILTERS</span>
          {currentFilterJql && (
            <span style={{ 
              fontSize: '0.75rem', 
              background: 'rgba(255,255,255,0.2)', 
              padding: '2px 8px', 
              borderRadius: 4,
              fontWeight: 400 
            }}>
              Active
            </span>
          )}
        </div>
        <span>{isOpen ? '▼' : '▶'}</span>
      </div>

      {isOpen && (
        <div style={{ padding: '20px' }}>
          {/* Filter Chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
            <div 
              onClick={clearFilter}
              style={{
                padding: '6px 12px',
                borderRadius: 20,
                border: '1px solid #dfe1e6',
                background: currentFilterJql === '' ? '#42526e' : 'white',
                color: currentFilterJql === '' ? 'white' : '#42526e',
                cursor: 'pointer',
                fontSize: '0.9rem',
                userSelect: 'none'
              }}
            >
              All Issues
            </div>

            {isLoadingFilters && <span style={{ color: '#666', fontSize: '0.85rem' }}>Loading Jira filters...</span>}

            {allFilters.map(filter => (
              <div 
                key={filter.id}
                onClick={() => applyFilter(filter.jql)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 20,
                  border: `1px solid ${currentFilterJql === filter.jql ? '#0052cc' : '#dfe1e6'}`,
                  background: currentFilterJql === filter.jql ? '#0052cc' : 'white',
                  color: currentFilterJql === filter.jql ? 'white' : '#172b4d',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  userSelect: 'none'
                }}
              >
                {filter.isJira && <span title="Jira Filter" style={{ opacity: 0.7 }}>⭐</span>}
                {filter.name}
                {!filter.isJira && (
                  <span 
                    onClick={(e) => handleDelete(filter.id, e)}
                    style={{ opacity: 0.6, fontSize: '1.2em', lineHeight: 0.5, padding: '0 2px' }}
                    title="Delete"
                  >
                    ×
                  </span>
                )}
              </div>
            ))}

            <button 
              onClick={() => setIsAdding(true)}
              style={{
                padding: '6px 12px',
                borderRadius: 20,
                border: '1px dashed #dfe1e6',
                background: 'transparent',
                color: '#0052cc',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              + Add Filter
            </button>
          </div>

          {/* Add Form */}
          {isAdding && (
            <div style={{ 
              marginBottom: '20px',
              padding: '15px', 
              background: '#f4f5f7', 
              borderRadius: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <h4 style={{ margin: 0 }}>New Filter</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>Name</label>
                  <input 
                    value={newFilterName}
                    onChange={e => setNewFilterName(e.target.value)}
                    placeholder="e.g. My High Priority"
                    style={{ width: '100%', padding: '8px', borderRadius: 4, border: '1px solid #dfe1e6' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>JQL</label>
                  <input 
                    value={newFilterJql}
                    onChange={e => setNewFilterJql(e.target.value)}
                    placeholder="e.g. priority = High AND assignee = currentUser()"
                    style={{ width: '100%', padding: '8px', borderRadius: 4, border: '1px solid #dfe1e6' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => setIsAdding(false)}
                  style={{ padding: '6px 12px', borderRadius: 4, border: 'none', background: 'transparent', color: '#42526e', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAdd}
                  disabled={!newFilterName || !newFilterJql}
                  style={{ padding: '6px 12px', borderRadius: 4, border: 'none', background: '#0052cc', color: 'white', cursor: 'pointer', opacity: (!newFilterName || !newFilterJql) ? 0.5 : 1 }}
                >
                  Save Filter
                </button>
              </div>
            </div>
          )}

          {/* Filter Insights */}
          <div style={{ borderTop: '1px solid #dfe1e6', paddingTop: '20px' }}>
            <h4 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: '#172b4d' }}>
              Filter Insights 
              {insights && <span style={{ fontWeight: 400, color: '#5e6c84', marginLeft: '8px' }}>({insights.total} issues)</span>}
            </h4>
            
            {isLoadingInsights ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>Loading insights...</div>
            ) : insights && (insights.byStatus.length > 0 || insights.byPriority.length > 0) ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Status Chart */}
                <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: 8 }}>
                  <h5 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#5e6c84' }}>By Status</h5>
                  <div style={{ height: 150 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={insights.byStatus} layout="vertical">
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {insights.byStatus.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || STATUS_COLORS['default']} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Priority Chart */}
                <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: 8 }}>
                  <h5 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#5e6c84' }}>By Priority</h5>
                  <div style={{ height: 150 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={insights.byPriority}
                          cx="50%"
                          cy="50%"
                          outerRadius={50}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {insights.byPriority.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.name] || PRIORITY_COLORS['default']} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>No data to display</div>
            )}

            {/* Issue List Table */}
            {insights && insights.issues && insights.issues.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <h5 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#5e6c84' }}>
                  Issues ({insights.issues.length} of {insights.total})
                </h5>
                <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #dfe1e6', borderRadius: 8 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead style={{ background: '#f4f5f7', position: 'sticky', top: 0 }}>
                      <tr>
                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #dfe1e6' }}>Key</th>
                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #dfe1e6' }}>Summary</th>
                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #dfe1e6' }}>Status</th>
                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #dfe1e6' }}>Priority</th>
                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #dfe1e6' }}>Assignee</th>
                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #dfe1e6' }}>Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {insights.issues.map((issue) => (
                        <tr key={issue.key} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '10px' }}>
                            <span style={{ color: '#0052cc', fontWeight: 500 }}>{issue.key}</span>
                          </td>
                          <td style={{ padding: '10px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {issue.summary}
                          </td>
                          <td style={{ padding: '10px' }}>
                            <span style={{ 
                              padding: '2px 8px', 
                              borderRadius: 4, 
                              fontSize: '0.8rem',
                              background: issue.statusColor === 'green' ? '#e3fcef' : issue.statusColor === 'blue-gray' ? '#deebff' : '#f4f5f7',
                              color: issue.statusColor === 'green' ? '#006644' : issue.statusColor === 'blue-gray' ? '#0052cc' : '#42526e'
                            }}>
                              {issue.status}
                            </span>
                          </td>
                          <td style={{ padding: '10px' }}>
                            {issue.priorityIcon && <img src={issue.priorityIcon} alt="" style={{ width: 16, height: 16, marginRight: 4, verticalAlign: 'middle' }} />}
                            {issue.priority}
                          </td>
                          <td style={{ padding: '10px' }}>
                            {issue.assignee ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {issue.assigneeAvatar && <img src={issue.assigneeAvatar} alt="" style={{ width: 20, height: 20, borderRadius: '50%' }} />}
                                <span>{issue.assignee}</span>
                              </div>
                            ) : (
                              <span style={{ color: '#999' }}>Unassigned</span>
                            )}
                          </td>
                          <td style={{ padding: '10px', color: '#666' }}>
                            {new Date(issue.updated).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
