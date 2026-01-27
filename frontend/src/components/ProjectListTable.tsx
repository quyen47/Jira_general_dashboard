'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

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

      <div style={{ overflowX: 'auto' }}>
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
              <th style={{ padding: '12px', borderBottom: '2px solid #DFE1E6', textAlign: 'left', fontSize: '0.85rem', fontWeight: 600, color: '#172B4D' }}>
                Lead
              </th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#5E6C84' }}>
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
                  <td style={{ textAlign: 'center', borderBottom: '1px solid #EEE', padding: '12px' }}>
                    {/* Status from schdHealth */}
                    <div style={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      background: project.schdHealth === 'green' ? '#36B37E' :
                                 project.schdHealth === 'red' ? '#FF5630' : '#FFAB00',
                      margin: '0 auto',
                    }} />
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
                  <td style={{ borderBottom: '1px solid #EEE', padding: '12px', fontSize: '0.85rem', color: '#172B4D' }}>
                    {project.lead || <span style={{ color: '#5E6C84' }}>-</span>}
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
