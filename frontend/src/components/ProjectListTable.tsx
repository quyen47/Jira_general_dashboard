'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { saveOverview, getStakeholders, saveStakeholders } from '@/lib/api';
import { searchJiraUsers } from '@/actions/users';

interface ProjectWithData {
  key: string;
  name: string;
  avatarUrl?: string;
  scheduleHealth: 'ahead' | 'on-track' | 'behind' | 'overtime' | 'unknown';
  budgetHealth: 'healthy' | 'at-risk' | 'over-budget' | 'unknown';
  percentComplete: number;
  percentSpent: number;
  offshoreSpentHours: number;
  offshoreBudgetHours: number;
  projectStatus: string;
  schdHealth: 'green' | 'yellow' | 'red';
  timelineProgress: number;
  lead?: string;
  overview: any;
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ProjectTableProps {
  projects: ProjectWithData[];
  pagination: PaginationMeta;
}

export default function ProjectTable({ projects, pagination }: ProjectTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Local state for search input to handle debouncing
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');

  // Edit State
  const [editingCell, setEditingCell] = useState<{ key: string, field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Lead Search State
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState<any[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  // Debounce search update
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentSearch = searchParams.get('search') || '';
      if (searchTerm !== currentSearch) {
        handleSearch(searchTerm);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, searchParams]);

  // Click outside to close edit
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        // If searching for user, don't close immediately if clicking in results (handled by ref)
      }
      // Simple way: if clicking outside the table or active cell logic could be complex
      // For now, we rely on onBlur or explicit actions
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updateUrl = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    const query = params.toString();
    router.push(query ? `/?${query}` : '/');
  };

  const handleSearch = (term: string) => {
    updateUrl({ search: term, page: '1' }); // Reset to page 1
  };

  const handleStatusChange = (status: string) => {
    updateUrl({ status: status === 'All' ? null : status, page: '1' });
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > pagination.totalPages) return;
    updateUrl({ page: page.toString() });
  };

  // --- Edit Handlers ---

  const startEdit = async (project: ProjectWithData, field: string) => {
    setEditingCell({ key: project.key, field });
    
    if (field === 'projectStatus') {
        setEditValue(project.projectStatus || '');
    } else if (field === 'schdHealth') {
        setEditValue(project.schdHealth || 'yellow');
    } else if (field === 'lead') {
        setEditValue(''); 
        setUserQuery('');
        setUserResults([]);
        // Optionally fetch current stakeholders to preload? 
        // Not strictly necessary if we just search and replace.
    }
  };

  const cancelEdit = () => {
      setEditingCell(null);
      setEditValue('');
      setUserResults([]);
  };

  const saveProjectStatus = async (project: ProjectWithData, newStatus: string) => {
      if (newStatus === project.projectStatus) {
          cancelEdit();
          return;
      }
      setIsLoading(true);
      try {
          const updatedOverview = {
              ...project.overview,
              projectStatus: newStatus
          };
          await saveOverview(project.key, updatedOverview);
          router.refresh();
      } catch (error) {
          console.error("Failed to update status", error);
          alert("Failed to update status");
      } finally {
          setIsLoading(false);
          cancelEdit();
      }
  };

  const saveHealth = async (project: ProjectWithData, newHealth: string) => {
      if (newHealth === project.schdHealth) {
          cancelEdit();
          return;
      }
      setIsLoading(true);
      try {
          const updatedOverview = {
              ...project.overview,
              schdHealth: newHealth
          };
          await saveOverview(project.key, updatedOverview);
          router.refresh();
      } catch (error) {
          console.error("Failed to update health", error);
          alert("Failed to update health");
      } finally {
          setIsLoading(false);
          cancelEdit();
      }
  };

  const handleUserSearch = async (q: string) => {
      setUserQuery(q);
      if (q.length < 2) {
          setUserResults([]);
          return;
      }
      try {
          const results = await searchJiraUsers(q);
          setUserResults(results);
      } catch (e) {
          console.error(e);
      }
  };

  const selectLead = async (project: ProjectWithData, user: any) => {
      setIsLoading(true);
      try {
          // 1. Fetch current stakeholders
          const currentStakeholders = await getStakeholders(project.key);
          let stakeholders = currentStakeholders || [];

          // 2. Find DHA Project Manager or create
          const dhaRole = 'DHA Project Manager';
          const existingIndex = stakeholders.findIndex((s: any) => s.role === dhaRole);

          if (existingIndex >= 0) {
              stakeholders[existingIndex].user = {
                  accountId: user.accountId,
                  displayName: user.displayName,
                  avatarUrl: user.avatarUrl
              };
              stakeholders[existingIndex].accountId = user.accountId; // Ensure flattened compatibility if backend needs it
              stakeholders[existingIndex].displayName = user.displayName;
              stakeholders[existingIndex].avatarUrl = user.avatarUrl;
          } else {
              stakeholders.push({
                  id: Date.now().toString(),
                  role: dhaRole,
                  user: {
                      accountId: user.accountId,
                      displayName: user.displayName,
                      avatarUrl: user.avatarUrl
                  },
                  accountId: user.accountId,
                  displayName: user.displayName,
                  avatarUrl: user.avatarUrl
              });
          }

          // 3. Save
          await saveStakeholders(project.key, stakeholders);
          router.refresh();
      } catch (error) {
          console.error("Failed to update lead", error);
          alert("Failed to update lead");
      } finally {
          setIsLoading(false);
          cancelEdit();
      }
  };

  // --- Render Helpers ---

  const renderStatusBadge = (
    status: 'ahead' | 'on-track' | 'behind' | 'overtime' | 'healthy' | 'at-risk' | 'over-budget' | 'unknown',
    label: string
  ) => {
    const colorMap = {
      ahead: { bg: '#E3FCEF', text: '#006644', border: '#00875A' },
      'on-track': { bg: '#FFFAE6', text: '#FF8B00', border: '#FF991F' },
      behind: { bg: '#FFEBE6', text: '#BF2600', border: '#DE350B' },
      overtime: { bg: '#FFEBE6', text: '#BF2600', border: '#DE350B' },
      healthy: { bg: '#E3FCEF', text: '#006644', border: '#00875A' },
      'at-risk': { bg: '#FFFAE6', text: '#FF8B00', border: '#FF991F' },
      'over-budget': { bg: '#FFEBE6', text: '#BF2600', border: '#DE350B' },
      unknown: { bg: '#F4F5F7', text: '#5E6C84', border: '#DFE1E6' },
    };

    const colors = colorMap[status] || colorMap.unknown;

    return (
      <div style={{
        display: 'inline-block',
        padding: '4px 8px',
        borderRadius: 4,
        background: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
        fontSize: '0.75rem',
        fontWeight: 600,
        textTransform: 'capitalize',
      }}>
        {label}
      </div>
    );
  };

  const renderProgressBar = (percent: number, color: string) => {
    return (
      <div style={{ width: '100%', maxWidth: 100 }}>
        <div style={{
          width: '100%',
          height: 6,
          background: '#DFE1E6',
          borderRadius: 3,
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${Math.min(percent, 100)}%`,
            height: '100%',
            background: color,
            transition: 'width 0.3s ease',
          }} />
        </div>
        <div style={{
          fontSize: '0.7rem',
          color: '#5E6C84',
          marginTop: 2,
          textAlign: 'center',
        }}>
          {percent.toFixed(0)}%
        </div>
      </div>
    );
  };

  return (
    <div style={{ background: 'white', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.1)', padding: '20px' }}>
      
      {/* Controls Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Search */}
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #DFE1E6',
              borderRadius: '4px',
              fontSize: '0.9rem',
              width: '250px',
            }}
          />
          
          {/* Status Filter */}
          <select 
            value={searchParams.get('status') || 'All'} 
            onChange={(e) => handleStatusChange(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #DFE1E6',
              borderRadius: '4px',
              fontSize: '0.9rem',
              background: 'white'
            }}
          >
            <option value="All">All Statuses</option>
            <option value="On Going">On Going</option>
            <option value="Pipeline">Pipeline</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Closed">Closed</option>
          </select>
        </div>

        {/* Pagination Info */}
        <div style={{ fontSize: '0.9rem', color: '#5E6C84' }}>
          Showing {projects.length === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} projects
        </div>
      </div>

      <div style={{ overflowX: 'auto', minHeight: '400px' }}> {/* Added minHeight for dropdowns */}
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: '1000px' }}>
          <thead>
            <tr style={{ background: '#F4F5F7' }}>
              <th style={{
                position: 'sticky',
                left: 0,
                zIndex: 2,
                background: '#F4F5F7',
                padding: '12px 16px',
                textAlign: 'left',
                borderBottom: '2px solid #DFE1E6',
                borderRight: '2px solid #DFE1E6',
                width: '280px',
                minWidth: '280px',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#172B4D',
              }}>
                Project
              </th>
              <th style={{ padding: '12px', borderBottom: '2px solid #DFE1E6', textAlign: 'center', fontSize: '0.85rem', fontWeight: 600, color: '#172B4D' }}>
                Status
              </th>
              <th style={{ padding: '12px', borderBottom: '2px solid #DFE1E6', textAlign: 'center', fontSize: '0.85rem', fontWeight: 600, color: '#172B4D' }}>
                Health
              </th>
              <th style={{ padding: '12px', borderBottom: '2px solid #DFE1E6', textAlign: 'center', fontSize: '0.85rem', fontWeight: 600, color: '#172B4D' }}>
                Schedule
              </th>
              <th style={{ padding: '12px', borderBottom: '2px solid #DFE1E6', textAlign: 'center', fontSize: '0.85rem', fontWeight: 600, color: '#172B4D' }}>
                Budget
              </th>
              <th style={{ padding: '12px', borderBottom: '2px solid #DFE1E6', textAlign: 'center', fontSize: '0.85rem', fontWeight: 600, color: '#172B4D' }}>
                Completion
              </th>
              <th style={{ padding: '12px', borderBottom: '2px solid #DFE1E6', textAlign: 'center', fontSize: '0.85rem', fontWeight: 600, color: '#172B4D' }}>
                Budget Spent
              </th>
              <th style={{ padding: '12px', borderBottom: '2px solid #DFE1E6', textAlign: 'center', fontSize: '0.85rem', fontWeight: 600, color: '#172B4D', minWidth: '200px' }}>
                Lead
              </th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#5E6C84' }}>
                  No projects found.
                </td>
              </tr>
            ) : (
              projects.map((project, i) => (
                <tr key={project.key} style={{
                  background: i % 2 === 0 ? 'white' : '#FAFBFC',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#F4F5F7'}
                onMouseLeave={(e) => e.currentTarget.style.background = i % 2 === 0 ? 'white' : '#FAFBFC'}
                >
                  <td style={{
                    position: 'sticky',
                    left: 0,
                    zIndex: 1,
                    background: i % 2 === 0 ? 'white' : '#FAFBFC',
                    padding: '12px 16px',
                    borderBottom: '1px solid #EEE',
                    borderRight: '2px solid #DFE1E6',
                    width: '300px',
                  }}>
                    <Link href={`/project/${project.key}`} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      textDecoration: 'none',
                      color: '#172B4D',
                    }}>
                      {project.avatarUrl && (
                        <img src={project.avatarUrl} alt="" style={{ width: 24, height: 24, borderRadius: 3 }} />
                      )}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{project.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#5E6C84' }}>{project.key}</div>
                      </div>
                    </Link>
                  </td>

                  {/* Editable Project Status */}
                  <td 
                      style={{ textAlign: 'center', borderBottom: '1px solid #EEE', padding: '12px', fontSize: '0.85rem', color: '#172B4D', cursor: 'pointer' }}
                      onClick={() => !editingCell && startEdit(project, 'projectStatus')}
                  >
                    {editingCell?.key === project.key && editingCell?.field === 'projectStatus' ? (
                         <select 
                            autoFocus
                            value={editValue}
                            onChange={(e) => {
                                setEditValue(e.target.value);
                                saveProjectStatus(project, e.target.value);
                            }}
                            onBlur={() => !isLoading && cancelEdit()}
                            style={{ padding: '4px', borderRadius: 4, width: '100%' }}
                            onClick={(e) => e.stopPropagation()}
                         >
                             <option value="To Do">To Do</option>
                             <option value="On Going">On Going</option>
                             <option value="On Hold">On Hold</option>
                             <option value="Closed">Closed</option>
                             <option value="">Unknown</option>
                         </select>
                    ) : (
                        project.projectStatus || 'Unknown'
                    )}
                  </td>

                  {/* Editable Health (schdHealth) */}
                  <td 
                      style={{ textAlign: 'center', borderBottom: '1px solid #EEE', padding: '12px', cursor: 'pointer' }}
                      onClick={() => !editingCell && startEdit(project, 'schdHealth')}
                  >
                    {editingCell?.key === project.key && editingCell?.field === 'schdHealth' ? (
                        <select 
                            autoFocus
                            value={editValue}
                            onChange={(e) => {
                                setEditValue(e.target.value);
                                saveHealth(project, e.target.value);
                            }}
                            onBlur={() => !isLoading && cancelEdit()}
                            style={{ padding: '4px', borderRadius: 4 }}
                            onClick={(e) => e.stopPropagation()}
                         >
                             <option value="green">Green</option>
                             <option value="yellow">Yellow</option>
                             <option value="red">Red</option>
                         </select>
                    ) : (
                        <div style={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          background: project.schdHealth === 'green' ? '#36B37E' :
                                     project.schdHealth === 'red' ? '#FF5630' : '#FFAB00',
                          margin: '0 auto',
                        }} />
                    )}
                  </td>

                  <td style={{ textAlign: 'center', borderBottom: '1px solid #EEE', padding: '12px' }}>
                    {renderProgressBar(project.timelineProgress, '#0052CC')}
                  </td>
                  <td style={{ textAlign: 'center', borderBottom: '1px solid #EEE', padding: '12px' }}>
                    {renderStatusBadge(project.budgetHealth, project.budgetHealth === 'at-risk' ? 'At Risk' : project.budgetHealth === 'over-budget' ? 'Over' : project.budgetHealth)}
                  </td>
                  <td style={{ textAlign: 'center', borderBottom: '1px solid #EEE', padding: '12px' }}>
                    {renderProgressBar(project.percentComplete, '#0052CC')}
                  </td>
                  <td style={{ textAlign: 'center', borderBottom: '1px solid #EEE', padding: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      {renderProgressBar(project.percentSpent, project.percentSpent > 100 ? '#DE350B' : project.percentSpent > 80 ? '#FF991F' : '#00875A')}
                      <div style={{ fontSize: '0.7rem', color: '#5E6C84' }}>
                        {project.offshoreSpentHours.toFixed(0)}h / {project.offshoreBudgetHours.toFixed(0)}h
                      </div>
                    </div>
                  </td>

                  {/* Editable Lead */}
                  <td 
                      style={{ borderBottom: '1px solid #EEE', padding: '12px', fontSize: '0.85rem', color: '#172B4D', position: 'relative', cursor: 'pointer' }}
                      onClick={() => !editingCell && startEdit(project, 'lead')}
                  >
                     {editingCell?.key === project.key && editingCell?.field === 'lead' ? (
                         <div style={{ position: 'relative' }} ref={searchRef} onClick={(e) => e.stopPropagation()}>
                             <input 
                                autoFocus
                                value={userQuery}
                                onChange={(e) => handleUserSearch(e.target.value)}
                                placeholder="Search user..."
                                style={{ width: '100%', padding: '4px', fontSize: '0.8rem' }}
                             />
                             {/* Results Dropdown */}
                             {userResults.length > 0 && (
                                <div style={{ 
                                    position: 'absolute', top: '100%', left: 0, minWidth: '200px',
                                    background: 'white', border: '1px solid #dfe1e6', borderRadius: 4, 
                                    maxHeight: '150px', overflowY: 'auto', zIndex: 100, boxShadow: '0 4px 8px rgba(0,0,0,0.1)' 
                                }}>
                                     {userResults.map(u => (
                                         <div 
                                            key={u.accountId}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                selectLead(project, u);
                                            }}
                                            style={{ padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #eee' }}
                                         >
                                             <img src={u.avatarUrl} style={{ width: 20, height: 20, borderRadius: '50%' }} />
                                             <span>{u.displayName}</span>
                                         </div>
                                     ))}
                                </div>
                             )}
                             {/* Cancel/Close Button */}
                             <button 
                                onClick={(e) => { e.stopPropagation(); cancelEdit(); }}
                                style={{ position: 'absolute', right: 0, top: -20, fontSize: '0.7rem', border: 'none', background: 'none', cursor: 'pointer' }}
                             >Cancel</button>
                         </div>
                     ) : (
                         <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                             {project.lead || <span style={{ color: '#5E6C84' }}>Unassigned</span>}
                             <span style={{ fontSize: '0.7rem', color: '#ccc' }}>✎</span>
                         </div>
                     )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px', gap: '8px' }}>
          <button
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
            style={{
              padding: '6px 12px',
              border: '1px solid #DFE1E6',
              background: pagination.page <= 1 ? '#F4F5F7' : 'white',
              cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer',
              borderRadius: '4px',
              color: pagination.page <= 1 ? '#A5ADBA' : '#172B4D',
            }}
          >
            Prev
          </button>
          
          <div style={{ display: 'flex', gap: '4px' }}>
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => {
              // Simple pagination logic: show if close to current, or first/last
              if (p === 1 || p === pagination.totalPages || (p >= pagination.page - 1 && p <= pagination.page + 1)) {
                return (
                  <button
                    key={p}
                    onClick={() => handlePageChange(p)}
                    style={{
                      padding: '6px 12px',
                      border: p === pagination.page ? '1px solid #0052CC' : '1px solid #DFE1E6',
                      background: p === pagination.page ? '#0052CC' : 'white',
                      color: p === pagination.page ? 'white' : '#172B4D',
                      cursor: 'pointer',
                      borderRadius: '4px',
                    }}
                  >
                    {p}
                  </button>
                );
              } else if (p === pagination.page - 2 || p === pagination.page + 2) {
                return <span key={p} style={{ padding: '6px' }}>...</span>;
              }
              return null;
            })}
          </div>

          <button
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
            style={{
              padding: '6px 12px',
              border: '1px solid #DFE1E6',
              background: pagination.page >= pagination.totalPages ? '#F4F5F7' : 'white',
              cursor: pagination.page >= pagination.totalPages ? 'not-allowed' : 'pointer',
              borderRadius: '4px',
              color: pagination.page >= pagination.totalPages ? '#A5ADBA' : '#172B4D',
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
