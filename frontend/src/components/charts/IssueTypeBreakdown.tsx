'use client';

import { ReportIssue } from '@/actions/reports';

interface IssueTypeBreakdownProps {
  issues: ReportIssue[];
  onTypeClick?: (issueType: string) => void;
}

export default function IssueTypeBreakdown({ issues, onTypeClick }: IssueTypeBreakdownProps) {
  // Aggregate hours by issue type
  const typeHours = new Map<string, number>();

  function aggregateIssue(issue: ReportIssue) {
    const existing = typeHours.get(issue.issueType) || 0;
    // Only count direct hours, not children (to avoid double counting)
    const directHours = issue.totalHours - (issue.children?.reduce((sum, child) => sum + child.totalHours, 0) || 0);
    typeHours.set(issue.issueType, existing + directHours);

    if (issue.children) {
      issue.children.forEach(child => aggregateIssue(child));
    }
  }

  issues.forEach(issue => aggregateIssue(issue));

  const types = Array.from(typeHours.entries())
    .map(([type, hours]) => ({ type, hours }))
    .sort((a, b) => b.hours - a.hours);

  if (types.length === 0) {
    return null;
  }

  const totalHours = types.reduce((sum, t) => sum + t.hours, 0);

  const colors: Record<string, string> = {
    'Epic': '#6554c0',
    'Story': '#0052cc',
    'Task': '#00875a',
    'Bug': '#ff5630',
    'Subtask': '#00b8d9',
    'default': '#8993a4'
  };

  return (
    <div style={{ padding: '20px', background: 'white', borderRadius: 8, border: '1px solid #dfe1e6' }}>
      <h4 style={{ margin: '0 0 20px 0', fontSize: '0.95rem', color: '#172b4d' }}>
        📋 Work by Issue Type
      </h4>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        {/* Pie chart */}
        <div style={{ position: 'relative', width: '150px', height: '150px' }}>
          <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
            {(() => {
              let currentAngle = 0;
              return types.map((typeData, index) => {
                const percentage = (typeData.hours / totalHours) * 100;
                const angle = (percentage / 100) * 360;
                const largeArcFlag = angle > 180 ? 1 : 0;
                
                const startX = 50 + 45 * Math.cos((currentAngle * Math.PI) / 180);
                const startY = 50 + 45 * Math.sin((currentAngle * Math.PI) / 180);
                const endX = 50 + 45 * Math.cos(((currentAngle + angle) * Math.PI) / 180);
                const endY = 50 + 45 * Math.sin(((currentAngle + angle) * Math.PI) / 180);
                
                const pathData = `M 50 50 L ${startX} ${startY} A 45 45 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
                
                const color = colors[typeData.type] || colors['default'];
                currentAngle += angle;
                
                return (
                  <path
                    key={typeData.type}
                    d={pathData}
                    fill={color}
                    stroke="white"
                    strokeWidth="1"
                    style={{ cursor: onTypeClick ? 'pointer' : 'default', transition: 'opacity 0.2s' }}
                    onClick={() => onTypeClick?.(typeData.type)}
                    onMouseEnter={(e) => {
                      if (onTypeClick) {
                        e.currentTarget.style.opacity = '0.8';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '1';
                    }}
                  />
                );
              });
            })()}
          </svg>
        </div>

        {/* Legend */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {types.map(typeData => {
            const percentage = ((typeData.hours / totalHours) * 100).toFixed(1);
            const color = colors[typeData.type] || colors['default'];
            
            return (
              <div
                key={typeData.type}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '6px',
                  borderRadius: 4,
                  cursor: onTypeClick ? 'pointer' : 'default',
                  transition: 'background 0.2s'
                }}
                onClick={() => onTypeClick?.(typeData.type)}
                onMouseEnter={(e) => {
                  if (onTypeClick) {
                    e.currentTarget.style.background = '#f4f5f7';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <div style={{ width: 16, height: 16, background: color, borderRadius: 3 }} />
                <div style={{ flex: 1, fontSize: '0.85rem', color: '#172b4d', fontWeight: 500 }}>
                  {typeData.type}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#5e6c84' }}>
                  {typeData.hours.toFixed(1)}h ({percentage}%)
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
