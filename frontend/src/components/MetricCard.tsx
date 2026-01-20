'use client';

interface MetricCardProps {
  title: string;
  status: 'success' | 'warning' | 'danger' | 'info';
  mainValue: string;
  subValue?: string;
  icon?: string;
  trend?: 'up' | 'down' | 'stable';
  onClick?: () => void;
}

const STATUS_COLORS = {
  success: {
    bg: '#E3FCEF',
    border: '#00875A',
    text: '#006644',
    icon: '✅',
  },
  warning: {
    bg: '#FFFAE6',
    border: '#FF991F',
    text: '#FF8B00',
    icon: '⚠️',
  },
  danger: {
    bg: '#FFEBE6',
    border: '#DE350B',
    text: '#BF2600',
    icon: '🔴',
  },
  info: {
    bg: '#DEEBFF',
    border: '#0052CC',
    text: '#0747A6',
    icon: '📊',
  },
};

export default function MetricCard({
  title,
  status,
  mainValue,
  subValue,
  icon,
  trend,
  onClick,
}: MetricCardProps) {
  const colors = STATUS_COLORS[status];
  const displayIcon = icon || colors.icon;

  return (
    <div
      onClick={onClick}
      style={{
        background: colors.bg,
        border: `2px solid ${colors.border}`,
        borderRadius: 8,
        padding: '16px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s, box-shadow 0.2s',
        ...(onClick && {
          ':hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
          },
        }),
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#5e6c84', textTransform: 'uppercase' }}>
          {title}
        </div>
        <div style={{ fontSize: '1.5rem' }}>{displayIcon}</div>
      </div>

      {/* Main Value */}
      <div style={{ fontSize: '1.8rem', fontWeight: 700, color: colors.text, marginBottom: '4px' }}>
        {mainValue}
      </div>

      {/* Sub Value */}
      {subValue && (
        <div style={{ fontSize: '0.85rem', color: '#5e6c84', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {trend && (
            <span style={{ fontSize: '1rem' }}>
              {trend === 'up' && '↗️'}
              {trend === 'down' && '↘️'}
              {trend === 'stable' && '→'}
            </span>
          )}
          {subValue}
        </div>
      )}
    </div>
  );
}
