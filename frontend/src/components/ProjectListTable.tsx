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
  
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [editingCell, setEditingCell] = useState<{ key: string, field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState<any[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const currentSearch = searchParams.get('search') || '';
      if (searchTerm !== currentSearch) {
        handleSearch(searchTerm);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, searchParams]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        // handled by ref
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updateUrl = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') params.delete(key);
      else params.set(key, value);
    });
    const query = params.toString();
    router.push(query ? `/?${query}` : '/');
  };

  const handleSearch = (term: string) => updateUrl({ search: term, page: '1' });
  const handleStatusChange = (status: string) => updateUrl({ status: status === 'All' ? null : status, page: '1' });
  const handlePageChange = (page: number) => {
    if (page < 1 || page > pagination.totalPages) return;
    updateUrl({ page: page.toString() });
  };

  const startEdit = async (project: ProjectWithData, field: string) => {
    setEditingCell({ key: project.key, field });
    if (field === 'projectStatus') setEditValue(project.projectStatus || '');
    else if (field === 'schdHealth') setEditValue(project.schdHealth || 'yellow');
    else if (field === 'lead') {
      setEditValue('');
      setUserQuery('');
      setUserResults([]);
    }
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
    setUserResults([]);
  };

  const saveProjectStatus = async (project: ProjectWithData, newStatus: string) => {
    if (newStatus === project.projectStatus) { cancelEdit(); return; }
    setIsLoading(true);
    try {
      await saveOverview(project.key, { ...project.overview, projectStatus: newStatus });
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
    if (newHealth === project.schdHealth) { cancelEdit(); return; }
    setIsLoading(true);
    try {
      await saveOverview(project.key, { ...project.overview, schdHealth: newHealth });
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
    if (q.length < 2) { setUserResults([]); return; }
    try {
      const results = await searchJiraUsers(q);
      setUserResults(results);
    } catch (e) { console.error(e); }
  };

  const selectLead = async (project: ProjectWithData, user: any) => {
    setIsLoading(true);
    try {
      const currentStakeholders = await getStakeholders(project.key);
      let stakeholders = currentStakeholders || [];
      const dhaRole = 'DHA Project Manager';
      const existingIndex = stakeholders.findIndex((s: any) => s.role === dhaRole);

      if (existingIndex >= 0) {
        stakeholders[existingIndex].user = { accountId: user.accountId, displayName: user.displayName, avatarUrl: user.avatarUrl };
        stakeholders[existingIndex].accountId = user.accountId;
        stakeholders[existingIndex].displayName = user.displayName;
        stakeholders[existingIndex].avatarUrl = user.avatarUrl;
      } else {
        stakeholders.push({
          id: Date.now().toString(), role: dhaRole,
          user: { accountId: user.accountId, displayName: user.displayName, avatarUrl: user.avatarUrl },
          accountId: user.accountId, displayName: user.displayName, avatarUrl: user.avatarUrl
        });
      }
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
      ahead: { bg: '#F0FDF4', text: '#15803D', border: '#86EFAC' },
      'on-track': { bg: '#FFFBEB', text: '#A16207', border: '#FDE68A' },
      behind: { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA' },
      overtime: { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA' },
      healthy: { bg: '#F0FDF4', text: '#15803D', border: '#86EFAC' },
      'at-risk': { bg: '#FFFBEB', text: '#A16207', border: '#FDE68A' },
      'over-budget': { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA' },
      unknown: { bg: '#F8FAFC', text: '#64748B', border: '#E2E8F0' },
    };
    const colors = colorMap[status] || colorMap.unknown;
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 10px',
        borderRadius: '6px',
        background: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
        fontSize: '0.72rem',
        fontWeight: 600,
        textTransform: 'capitalize',
        letterSpacing: '0.02em',
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: colors.text, opacity: 0.6,
        }} />
        {label}
      </div>
    );
  };

  const renderProgressBar = (percent: number, color: string) => {
    return (
      <div style={{ width: '100%', maxWidth: 120 }}>
        <div style={{
          width: '100%', height: 6,
          background: '#F1F5F9',
          borderRadius: '6px',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${Math.min(percent, 100)}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${color}, ${color}CC)`,
            borderRadius: '6px',
            transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          }} />
        </div>
        <div style={{
          fontSize: '0.7rem',
          color: '#64748B',
          marginTop: 3,
          textAlign: 'center',
          fontWeight: 500,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {percent.toFixed(0)}%
        </div>
      </div>
    );
  };

  // --- Styles ---
  const thStyle = (extra?: React.CSSProperties): React.CSSProperties => ({
    padding: '14px 16px',
    borderBottom: '2px solid #E2E8F0',
    textAlign: 'center' as const,
    fontSize: '0.72rem',
    fontWeight: 600,
    color: '#64748B',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    ...(extra || {}),
  });

  const tdStyle = (extra?: React.CSSProperties): React.CSSProperties => ({
    textAlign: 'center' as const,
    borderBottom: '1px solid #F1F5F9',
    padding: '14px 16px',
    ...(extra || {}),
  });

  return (
    <div style={{ 
      background: 'white', 
      borderRadius: '14px', 
      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02)', 
      padding: '24px',
      border: '1px solid #E2E8F0',
    }}>
      
      {/* Controls Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px', 
        flexWrap: 'wrap', 
        gap: '12px' 
      }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Search Input */}
          <div style={{ position: 'relative' }}>
            <svg 
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" 
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '10px 12px 10px 36px',
                border: '1.5px solid #E2E8F0',
                borderRadius: '10px',
                fontSize: '0.85rem',
                width: '280px',
                fontFamily: 'inherit',
                color: '#0F172A',
                background: '#F8FAFC',
                transition: 'all 200ms ease',
                outline: 'none',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#3B82F6';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                e.currentTarget.style.background = 'white';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#E2E8F0';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.background = '#F8FAFC';
              }}
            />
          </div>
          
          {/* Status Filter */}
          <select 
            value={searchParams.get('status') || 'All'} 
            onChange={(e) => handleStatusChange(e.target.value)}
            style={{
              padding: '10px 14px',
              border: '1.5px solid #E2E8F0',
              borderRadius: '10px',
              fontSize: '0.85rem',
              background: '#F8FAFC',
              fontFamily: 'inherit',
              color: '#0F172A',
              cursor: 'pointer',
              outline: 'none',
              appearance: 'none' as const,
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%2394A3B8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
              paddingRight: '32px',
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
        <div style={{ 
          fontSize: '0.8rem', 
          color: '#64748B', 
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          {projects.length === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
        </div>
      </div>

      <div style={{ overflowX: 'auto', minHeight: '400px' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: '1000px' }}>
          <thead>
            <tr>
              <th style={{
                ...thStyle(),
                position: 'sticky', left: 0, zIndex: 2,
                background: '#F8FAFC',
                borderRight: '2px solid #E2E8F0',
                textAlign: 'left' as const,
                width: '280px', minWidth: '280px',
              }}>
                Project
              </th>
              <th style={thStyle()}>Status</th>
              <th style={thStyle()}>Health</th>
              <th style={thStyle()}>Schedule</th>
              <th style={thStyle()}>Budget</th>
              <th style={thStyle()}>Completion</th>
              <th style={thStyle()}>Budget Spent</th>
              <th style={thStyle({ minWidth: '200px' })}>Lead</th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '60px 40px', color: '#94A3B8' }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#64748B', marginBottom: 4 }}>No projects found</div>
                  <div style={{ fontSize: '0.8rem' }}>Try adjusting your search or filters</div>
                </td>
              </tr>
            ) : (
              projects.map((project, i) => (
                <tr key={project.key} style={{
                  background: i % 2 === 0 ? 'white' : '#FAFBFC',
                  transition: 'background 150ms ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#F8FAFC'}
                onMouseLeave={(e) => e.currentTarget.style.background = i % 2 === 0 ? 'white' : '#FAFBFC'}
                >
                  {/* Project Name */}
                  <td style={{
                    position: 'sticky', left: 0, zIndex: 1,
                    background: 'inherit',
                    padding: '14px 16px',
                    borderBottom: '1px solid #F1F5F9',
                    borderRight: '2px solid #E2E8F0',
                    width: '300px',
                  }}>
                    <Link href={`/project/${project.key}`} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      textDecoration: 'none', color: '#0F172A',
                    }}>
                      {project.avatarUrl && (
                        <img src={project.avatarUrl} alt="" style={{ 
                          width: 28, height: 28, borderRadius: 6, 
                          border: '1px solid #E2E8F0',
                        }} />
                      )}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', lineHeight: 1.3 }}>{project.name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 500, fontFamily: 'var(--font-geist-mono, monospace)' }}>{project.key}</div>
                      </div>
                    </Link>
                  </td>

                  {/* Editable Project Status */}
                  <td 
                    style={{ ...tdStyle(), fontSize: '0.82rem', color: '#0F172A', cursor: 'pointer' }}
                    onClick={() => !editingCell && startEdit(project, 'projectStatus')}
                  >
                    {editingCell?.key === project.key && editingCell?.field === 'projectStatus' ? (
                      <select 
                        autoFocus
                        value={editValue}
                        onChange={(e) => { setEditValue(e.target.value); saveProjectStatus(project, e.target.value); }}
                        onBlur={() => !isLoading && cancelEdit()}
                        style={{ 
                          padding: '6px 10px', borderRadius: 8, width: '100%',
                          border: '1.5px solid #3B82F6', fontSize: '0.82rem',
                          outline: 'none', fontFamily: 'inherit', color: '#0F172A',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="To Do">To Do</option>
                        <option value="On Going">On Going</option>
                        <option value="On Hold">On Hold</option>
                        <option value="Closed">Closed</option>
                        <option value="">Unknown</option>
                      </select>
                    ) : (
                      <span style={{ 
                        padding: '4px 10px', borderRadius: 6,
                        background: '#F8FAFC', border: '1px solid #E2E8F0',
                        fontSize: '0.78rem', fontWeight: 500,
                        transition: 'all 150ms ease',
                      }}>
                        {project.projectStatus || 'Unknown'}
                      </span>
                    )}
                  </td>

                  {/* Editable Health */}
                  <td 
                    style={{ ...tdStyle(), cursor: 'pointer' }}
                    onClick={() => !editingCell && startEdit(project, 'schdHealth')}
                  >
                    {editingCell?.key === project.key && editingCell?.field === 'schdHealth' ? (
                      <select 
                        autoFocus
                        value={editValue}
                        onChange={(e) => { setEditValue(e.target.value); saveHealth(project, e.target.value); }}
                        onBlur={() => !isLoading && cancelEdit()}
                        style={{ 
                          padding: '6px 10px', borderRadius: 8,
                          border: '1.5px solid #3B82F6', fontSize: '0.82rem',
                          outline: 'none', fontFamily: 'inherit', color: '#0F172A',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="green">Green</option>
                        <option value="yellow">Yellow</option>
                        <option value="red">Red</option>
                      </select>
                    ) : (
                      <div style={{
                        width: 20, height: 20,
                        borderRadius: '50%',
                        background: project.schdHealth === 'green' 
                          ? 'linear-gradient(135deg, #22C55E, #16A34A)' 
                          : project.schdHealth === 'red' 
                            ? 'linear-gradient(135deg, #EF4444, #DC2626)' 
                            : 'linear-gradient(135deg, #F59E0B, #D97706)',
                        margin: '0 auto',
                        boxShadow: project.schdHealth === 'green' 
                          ? '0 2px 6px rgba(34,197,94,0.3)' 
                          : project.schdHealth === 'red' 
                            ? '0 2px 6px rgba(239,68,68,0.3)' 
                            : '0 2px 6px rgba(245,158,11,0.3)',
                        transition: 'all 200ms ease',
                      }} />
                    )}
                  </td>

                  <td style={tdStyle()}>
                    {renderProgressBar(project.timelineProgress, '#3B82F6')}
                  </td>
                  <td style={tdStyle()}>
                    {renderStatusBadge(project.budgetHealth, project.budgetHealth === 'at-risk' ? 'At Risk' : project.budgetHealth === 'over-budget' ? 'Over' : project.budgetHealth)}
                  </td>
                  <td style={tdStyle()}>
                    {renderProgressBar(project.percentComplete, '#3B82F6')}
                  </td>
                  <td style={tdStyle()}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      {renderProgressBar(project.percentSpent, project.percentSpent > 100 ? '#DC2626' : project.percentSpent > 80 ? '#F59E0B' : '#22C55E')}
                      <div style={{ fontSize: '0.68rem', color: '#94A3B8', fontVariantNumeric: 'tabular-nums' }}>
                        {project.offshoreSpentHours.toFixed(0)}h / {project.offshoreBudgetHours.toFixed(0)}h
                      </div>
                    </div>
                  </td>

                  {/* Editable Lead */}
                  <td 
                    style={{ ...tdStyle({ position: 'relative', cursor: 'pointer', textAlign: 'left' as const }) }}
                    onClick={() => !editingCell && startEdit(project, 'lead')}
                  >
                    {editingCell?.key === project.key && editingCell?.field === 'lead' ? (
                      <div style={{ position: 'relative' }} ref={searchRef} onClick={(e) => e.stopPropagation()}>
                        <input 
                          autoFocus
                          value={userQuery}
                          onChange={(e) => handleUserSearch(e.target.value)}
                          placeholder="Search user..."
                          style={{ 
                            width: '100%', padding: '8px 12px', fontSize: '0.82rem',
                            border: '1.5px solid #3B82F6', borderRadius: 8,
                            outline: 'none', fontFamily: 'inherit', color: '#0F172A',
                          }}
                        />
                        {userResults.length > 0 && (
                          <div style={{ 
                            position: 'absolute', top: '100%', left: 0, minWidth: '220px',
                            background: 'white', border: '1px solid #E2E8F0', borderRadius: 10, 
                            maxHeight: '180px', overflowY: 'auto', zIndex: 100, 
                            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                            marginTop: 4,
                          }}>
                            {userResults.map(u => (
                              <div 
                                key={u.accountId}
                                onClick={(e) => { e.stopPropagation(); selectLead(project, u); }}
                                style={{ 
                                  padding: '10px 12px', cursor: 'pointer', 
                                  display: 'flex', alignItems: 'center', gap: '10px', 
                                  borderBottom: '1px solid #F1F5F9',
                                  transition: 'background 100ms ease',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#F8FAFC'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                              >
                                <img src={u.avatarUrl} alt="" style={{ width: 24, height: 24, borderRadius: '50%', border: '1px solid #E2E8F0' }} />
                                <span style={{ fontSize: '0.82rem', fontWeight: 500 }}>{u.displayName}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <button 
                          onClick={(e) => { e.stopPropagation(); cancelEdit(); }}
                          style={{ 
                            position: 'absolute', right: 4, top: -24, 
                            fontSize: '0.72rem', border: 'none', background: 'none', 
                            cursor: 'pointer', color: '#94A3B8', fontWeight: 500,
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem' }}>
                        {project.lead || <span style={{ color: '#94A3B8' }}>Unassigned</span>}
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
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
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px', gap: '6px', alignItems: 'center' }}>
          <button
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              padding: '8px 14px',
              border: '1.5px solid #E2E8F0',
              background: pagination.page <= 1 ? '#F8FAFC' : 'white',
              cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer',
              borderRadius: '8px',
              color: pagination.page <= 1 ? '#CBD5E1' : '#475569',
              fontSize: '0.82rem',
              fontWeight: 500,
              fontFamily: 'inherit',
              transition: 'all 150ms ease',
              gap: '4px',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Prev
          </button>
          
          <div style={{ display: 'flex', gap: '4px' }}>
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => {
              if (p === 1 || p === pagination.totalPages || (p >= pagination.page - 1 && p <= pagination.page + 1)) {
                return (
                  <button
                    key={p}
                    onClick={() => handlePageChange(p)}
                    style={{
                      padding: '8px 14px',
                      border: p === pagination.page ? '1.5px solid #3B82F6' : '1.5px solid #E2E8F0',
                      background: p === pagination.page ? 'linear-gradient(135deg, #1E40AF, #3B82F6)' : 'white',
                      color: p === pagination.page ? 'white' : '#475569',
                      cursor: 'pointer',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: p === pagination.page ? 600 : 500,
                      fontFamily: 'inherit',
                      transition: 'all 150ms ease',
                      minWidth: '40px',
                    }}
                  >
                    {p}
                  </button>
                );
              } else if (p === pagination.page - 2 || p === pagination.page + 2) {
                return <span key={p} style={{ padding: '8px 4px', color: '#94A3B8', fontSize: '0.8rem' }}>...</span>;
              }
              return null;
            })}
          </div>

          <button
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              padding: '8px 14px',
              border: '1.5px solid #E2E8F0',
              background: pagination.page >= pagination.totalPages ? '#F8FAFC' : 'white',
              cursor: pagination.page >= pagination.totalPages ? 'not-allowed' : 'pointer',
              borderRadius: '8px',
              color: pagination.page >= pagination.totalPages ? '#CBD5E1' : '#475569',
              fontSize: '0.82rem',
              fontWeight: 500,
              fontFamily: 'inherit',
              transition: 'all 150ms ease',
              gap: '4px',
            }}
          >
            Next
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
