'use client';

import { ReportIssue } from '@/actions/reports';

interface TeamContributionChartProps {
  issues: ReportIssue[];
  onMemberClick?: (accountId: string, name: string) => void;
}

export default function TeamContributionChart({ issues, onMemberClick }: TeamContributionChartProps) {
  // Aggregate hours by team member
  const memberHours = new Map<string, { name: string; hours: number; accountId: string }>();

  function aggregateIssue(issue: ReportIssue) {
    issue.assignees.forEach(assignee => {
      const existing = memberHours.get(assignee.accountId);
      if (existing) {
        existing.hours += assignee.hours;
      } else {
        memberHours.set(assignee.accountId, {
          name: assignee.name,
          hours: assignee.hours,
          accountId: assignee.accountId
        });
      }
    });

    if (issue.children) {
      issue.children.forEach(child => aggregateIssue(child));
    }
  }

  issues.forEach(issue => aggregateIssue(issue));

  const members = Array.from(memberHours.values())
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 10); // Top 10 contributors

  if (members.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
        No contributor data available
      </div>
    );
  }

  const maxHours = Math.max(...members.map(m => m.hours), 1);

  return (
    <div style={{ padding: '20px', background: 'white', borderRadius: 8, border: '1px solid #dfe1e6' }}>
      <h4 style={{ margin: '0 0 20px 0', fontSize: '0.95rem', color: '#172b4d' }}>
        👥 Team Contribution (Top 10)
      </h4>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {members.map((member, index) => {
          const barWidth = (member.hours / maxHours) * 100;
          const colors = [
            '#0052cc', '#00875a', '#6554c0', '#ff5630', '#00b8d9',
            '#ff8b00', '#36b37e', '#403294', '#de350b', '#0065ff'
          ];
          const color = colors[index % colors.length];

          return (
            <div key={member.accountId} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '150px', fontSize: '0.85rem', color: '#172b4d', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {member.name}
              </div>
              
              <div style={{ flex: 1, position: 'relative', height: '32px', background: '#f4f5f7', borderRadius: 4, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${barWidth}%`,
                    height: '100%',
                    background: color,
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: '10px',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    transition: 'all 0.3s',
                    cursor: onMemberClick ? 'pointer' : 'default'
                  }}
                  onClick={() => onMemberClick?.(member.accountId, member.name)}
                  onMouseEnter={(e) => {
                    if (onMemberClick) {
                      e.currentTarget.style.opacity = '0.8';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                >
                  {member.hours.toFixed(1)}h
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
