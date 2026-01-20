'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAllProjectsOverview } from '@/actions/portfolio';
import { calculateScheduleInsights, calculateBudgetInsights } from '@/lib/insights';

interface Project {
  key: string;
  name: string;
  avatarUrls?: { [key: string]: string };
  projectTypeKey: string;
  lead?: { displayName: string };
}

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

export default function ProjectTable({ projects }: { projects: Project[] }) {
  const [projectsWithData, setProjectsWithData] = useState<ProjectWithData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProjectData() {
      setIsLoading(true);
      try {
        const projectsData = await getAllProjectsOverview();
        
        const enrichedProjects = projects.map(project => {
          const data = projectsData.find(p => p.key === project.key);
          
          if (!data) {
            return {
              key: project.key,
              name: project.name,
              avatarUrl: project.avatarUrls?.['48x48'],
              scheduleHealth: 'unknown' as const,
              budgetHealth: 'unknown' as const,
              percentComplete: 0,
              percentSpent: 0,
              offshoreSpentHours: 0,
              offshoreBudgetHours: 0,
              projectStatus: '',
              schdHealth: 'yellow' as const,
              timelineProgress: 0,
              lead: project.lead?.displayName,
            };
          }

          // Calculate completion
          let percentComplete = parseFloat(data.overview?.percentComplete || '0');
          if (data.epics && data.epics.length > 0) {
            let totalIssues = 0;
            let doneIssues = 0;
            data.epics.forEach((e: any) => {
              totalIssues += e.totalIssues || 0;
              doneIssues += e.done || 0;
            });
            percentComplete = totalIssues > 0 ? (doneIssues / totalIssues) * 100 : 0;
          }

          // Calculate budget
          const onshoreBudget = parseFloat(data.budget?.onshoreBudgetHours || '0');
          const offshoreBudget = parseFloat(data.budget?.offshoreBudgetHours || '0');
          const totalBudget = onshoreBudget + offshoreBudget;
          const onshoreSpent = parseFloat(data.budget?.onshoreSpentHours || '0');
          const totalSpent = onshoreSpent + data.offshoreSpentHours;

          // Calculate timeline progress (same as project page)
          let timelineProgress = 0;
          if (data.overview?.planStartDate && data.overview?.planEndDate) {
            const startDate = new Date(data.overview.planStartDate).getTime();
            const endDate = new Date(data.overview.planEndDate).getTime();
            const now = new Date().getTime();
            if (!isNaN(startDate) && !isNaN(endDate)) {
              const totalDuration = endDate - startDate;
              const elapsed = now - startDate;
              timelineProgress = totalDuration > 0 ? Math.min(Math.max(elapsed / totalDuration, 0), 1) * 100 : 0;
            }
          }

          // Determine schedule health from timeline vs completion
          let scheduleHealth: 'ahead' | 'on-track' | 'behind' | 'overtime' | 'unknown' = 'unknown';
          if (data.overview?.planStartDate && data.overview?.planEndDate) {
            const now = new Date().getTime();
            const endDate = new Date(data.overview.planEndDate).getTime();
            const isOvertime = now > endDate && data.overview?.projectStatus === 'On Going';
            
            if (isOvertime) {
              scheduleHealth = 'overtime';
            } else if (percentComplete > timelineProgress + 10) {
              scheduleHealth = 'ahead';
            } else if (percentComplete < timelineProgress - 10) {
              scheduleHealth = 'behind';
            } else {
              scheduleHealth = 'on-track';
            }
          }

          // Calculate offshore budget health (burn down status)
          const offshorePercentSpent = offshoreBudget > 0 ? (data.offshoreSpentHours / offshoreBudget) * 100 : 0;
          
          let budgetHealth: 'healthy' | 'at-risk' | 'over-budget' | 'unknown' = 'unknown';
          if (offshoreBudget > 0) {
            if (offshorePercentSpent > 100) {
              budgetHealth = 'over-budget';
            } else if (offshorePercentSpent > timelineProgress + 15) {
              budgetHealth = 'at-risk';
            } else {
              budgetHealth = 'healthy';
            }
          }

          return {
            key: project.key,
            name: project.name,
            avatarUrl: project.avatarUrls?.['48x48'],
            scheduleHealth,
            budgetHealth,
            percentComplete,
            percentSpent: offshorePercentSpent,
            offshoreSpentHours: data.offshoreSpentHours,
            offshoreBudgetHours: offshoreBudget,
            projectStatus: data.overview?.projectStatus || '',
            schdHealth: data.overview?.schdHealth || 'yellow',
            timelineProgress,
            lead: project.lead?.displayName,
          };
        });

        setProjectsWithData(enrichedProjects);
      } catch (error) {
        console.error('Error loading project data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (projects.length > 0) {
      loadProjectData();
    }
  }, [projects]);

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

    const colors = colorMap[status];

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

  if (isLoading) {
    return (
      <div style={{
        background: 'white',
        borderRadius: 8,
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        padding: '40px',
        textAlign: 'center',
        color: '#5E6C84',
      }}>
        Loading project data...
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto', background: 'white', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
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
          {projectsWithData.map((project, i) => (
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
                {/* Schedule from Timeline Progress */}
                {renderProgressBar(project.timelineProgress, '#0052CC')}
              </td>
              <td style={{ textAlign: 'center', borderBottom: '1px solid #EEE', padding: '12px' }}>
                {/* Budget from Offshore Burn Down Status */}
                {renderStatusBadge(project.budgetHealth, project.budgetHealth === 'at-risk' ? 'At Risk' : project.budgetHealth === 'over-budget' ? 'Over' : project.budgetHealth)}
              </td>
              <td style={{ textAlign: 'center', borderBottom: '1px solid #EEE', padding: '12px' }}>
                {/* Completion */}
                {renderProgressBar(project.percentComplete, '#0052CC')}
              </td>
              <td style={{ textAlign: 'center', borderBottom: '1px solid #EEE', padding: '12px' }}>
                {/* Budget Spent from Offshore Hours */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  {renderProgressBar(project.percentSpent, project.percentSpent > 100 ? '#DE350B' : project.percentSpent > 80 ? '#FF991F' : '#00875A')}
                  <div style={{ fontSize: '0.7rem', color: '#5E6C84' }}>
                    {project.offshoreSpentHours.toFixed(0)}h / {project.offshoreBudgetHours.toFixed(0)}h
                  </div>
                </div>
              </td>
              <td style={{ borderBottom: '1px solid #EEE', padding: '12px', fontSize: '0.85rem', color: '#172B4D' }}>
                {/* DHA Project Manager (using lead for now) */}
                {project.lead || <span style={{ color: '#5E6C84' }}>-</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
