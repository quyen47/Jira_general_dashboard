'use client';

import { useState } from 'react';

interface MetricCardProps {
  title: string;
  status: 'success' | 'warning' | 'danger' | 'info';
  mainValue: string;
  subValue?: string;
  icon?: string;
  trend?: 'up' | 'down' | 'stable';
  onClick?: () => void;
  description?: string; // Tooltip description
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
  description,
}: MetricCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const colors = STATUS_COLORS[status];
  const displayIcon = icon || colors.icon;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      style={{
        background: colors.bg,
        border: `2px solid ${colors.border}`,
        borderRadius: 8,
        padding: '16px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s, box-shadow 0.2s',
        position: 'relative',
        ...(onClick && {
          ':hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
          },
        }),
      }}
    >
      {/* Tooltip */}
      {description && showTooltip && (
        <div
          style={{
            position: 'absolute',
            top: '-10px',
            left: '50%',
            transform: 'translateX(-50%) translateY(-100%)',
            background: '#172b4d',
            color: 'white',
            padding: '12px 16px',
            borderRadius: 6,
            fontSize: '0.8rem',
            lineHeight: 1.5,
            maxWidth: '320px',
            minWidth: '250px',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            whiteSpace: 'normal',
            wordWrap: 'break-word',
            animation: 'fadeIn 0.2s ease-in',
          }}
        >
          {description}
          {/* Arrow */}
          <div
            style={{
              position: 'absolute',
              bottom: '-6px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid #172b4d',
            }}
          />
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#5e6c84', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {title}
          {description && (
            <span style={{ fontSize: '0.75rem', opacity: 0.6 }} title="Hover for details">
              ℹ️
            </span>
          )}
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

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-100%) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(-100%) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
