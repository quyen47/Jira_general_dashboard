'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Project {
  key: string;
  name: string;
  avatarUrls?: { [key: string]: string };
  projectTypeKey: string;
  lead?: { displayName: string };
}

interface ProjectData {
  overview: {
    schdHealth: 'green' | 'yellow' | 'red';
    // Add other mapped fields if needed
  };
}

export default function ProjectTable({ projects }: { projects: Project[] }) {
  const [projectData, setProjectData] = useState<{ [key: string]: ProjectData }>({});

  useEffect(() => {
    const data: { [key: string]: ProjectData } = {};
    projects.forEach(p => {
      const saved = localStorage.getItem(`jira_dashboard_overview_${p.key}`);
      if (saved) {
        try {
          data[p.key] = JSON.parse(saved);
        } catch (e) {
          console.error(e);
        }
      }
    });
    setProjectData(data);
  }, [projects]);

  const renderStatusDot = (status: 'green' | 'yellow' | 'red' | undefined) => {
    const colorMap = {
      green: '#36B37E',
      yellow: '#FFAB00',
      red: '#FF5630',
      undefined: '#dfe1e6'
    };
    return (
      <div style={{ 
        width: 12, 
        height: 12, 
        borderRadius: '50%', 
        background: colorMap[status || 'undefined'],
        margin: '0 auto'
      }} />
    );
  };

  const renderTrend = () => (
    <span style={{ color: '#FFAB00', fontWeight: 'bold' }}>➜</span> // Mock trend for now
  );

  return (
    <div style={{ overflowX: 'auto', background: 'white', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: '1200px' }}>
        <thead>
          <tr style={{ background: '#f4f5f7' }}>
            <th style={{ 
              position: 'sticky', 
              left: 0, 
              zIndex: 2, 
              background: '#f4f5f7', 
              padding: '12px 16px', 
              textAlign: 'left', 
              borderBottom: '2px solid #dfe1e6',
              borderRight: '2px solid #dfe1e6',
              width: '250px',
              minWidth: '250px'
            }}>
              Project Name
            </th>
            <th style={{ padding: '12px', borderBottom: '2px solid #dfe1e6', textAlign: 'center' }}>Trend</th>
            <th style={{ padding: '12px', borderBottom: '2px solid #dfe1e6', textAlign: 'center' }}>Overall Status</th>
            <th style={{ padding: '12px', borderBottom: '2px solid #dfe1e6', textAlign: 'center' }}>Schedule Status</th>
            <th style={{ padding: '12px', borderBottom: '2px solid #dfe1e6', textAlign: 'center' }}>Scope Status</th>
            <th style={{ padding: '12px', borderBottom: '2px solid #dfe1e6', textAlign: 'center' }}>Quality Status</th>
            <th style={{ padding: '12px', borderBottom: '2px solid #dfe1e6', textAlign: 'center' }}>Resources Status</th>
            <th style={{ padding: '12px', borderBottom: '2px solid #dfe1e6', textAlign: 'center' }}>Budget Status</th>
            <th style={{ padding: '12px', borderBottom: '2px solid #dfe1e6', textAlign: 'left' }}>DH Project Manager</th>
            <th style={{ padding: '12px', borderBottom: '2px solid #dfe1e6', textAlign: 'left' }}>DHA Project Manager</th>
            <th style={{ padding: '12px', borderBottom: '2px solid #dfe1e6', textAlign: 'left' }}>DHP Project Manager</th>
            <th style={{ padding: '12px', borderBottom: '2px solid #dfe1e6', textAlign: 'left' }}>Solution</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project, i) => {
             const pData = projectData[project.key];
             // Use yellow as default if no data, to match PortfolioSummary
             const status = pData?.overview?.schdHealth || 'yellow';
             
             return (
              <tr key={project.key} style={{ background: i % 2 === 0 ? 'white' : '#fafbfc' }}>
                <td style={{ 
                  position: 'sticky', 
                  left: 0, 
                  zIndex: 2, 
                  background: i % 2 === 0 ? 'white' : '#fafbfc', 
                  padding: '12px 16px', 
                  borderBottom: '1px solid #eee',
                  borderRight: '2px solid #dfe1e6'
                }}>
                  <Link href={`/project/${project.key}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: '#172b4d' }}>
                    {project.avatarUrls?.['48x48'] && (
                      <img src={project.avatarUrls['48x48']} alt="" style={{ width: 24, height: 24, borderRadius: 3 }} />
                    )}
                    <span style={{ fontWeight: 500 }}>{project.name}</span>
                  </Link>
                </td>
                <td style={{ textAlign: 'center', borderBottom: '1px solid #eee' }}>{renderTrend()}</td>
                <td style={{ textAlign: 'center', borderBottom: '1px solid #eee' }}>{renderStatusDot(status)}</td>
                <td style={{ textAlign: 'center', borderBottom: '1px solid #eee' }}>{renderStatusDot(status)}</td>
                <td style={{ textAlign: 'center', borderBottom: '1px solid #eee' }}>{renderStatusDot(status)}</td>
                <td style={{ textAlign: 'center', borderBottom: '1px solid #eee' }}>{renderStatusDot(status)}</td>
                <td style={{ textAlign: 'center', borderBottom: '1px solid #eee' }}>{renderStatusDot(status)}</td>
                <td style={{ textAlign: 'center', borderBottom: '1px solid #eee' }}>{renderStatusDot(status)}</td>
                <td style={{ borderBottom: '1px solid #eee', paddingLeft: '12px' }}>N/A</td>
                <td style={{ borderBottom: '1px solid #eee', paddingLeft: '12px' }}>{project.lead?.displayName || 'Unknown'}</td>
                <td style={{ borderBottom: '1px solid #eee', paddingLeft: '12px' }}>N/A</td>
                <td style={{ borderBottom: '1px solid #eee', paddingLeft: '12px' }}>Truong Nguyen</td>
              </tr>
             );
          })}
        </tbody>
      </table>
    </div>
  );
}
