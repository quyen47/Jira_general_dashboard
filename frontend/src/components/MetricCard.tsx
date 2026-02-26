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
  description?: string;
}

const STATUS_CONFIG = {
  success: {
    bg: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
    border: '#86EFAC',
    text: '#15803D',
    accent: '#22C55E',
    iconBg: 'rgba(34, 197, 94, 0.12)',
  },
  warning: {
    bg: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
    border: '#FDE68A',
    text: '#A16207',
    accent: '#F59E0B',
    iconBg: 'rgba(245, 158, 11, 0.12)',
  },
  danger: {
    bg: 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)',
    border: '#FECACA',
    text: '#B91C1C',
    accent: '#EF4444',
    iconBg: 'rgba(239, 68, 68, 0.12)',
  },
  info: {
    bg: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
    border: '#BFDBFE',
    text: '#1D4ED8',
    accent: '#3B82F6',
    iconBg: 'rgba(59, 130, 246, 0.12)',
  },
};

// SVG Icons for each status type
function StatusIcon({ status }: { status: string }) {
  const iconStyle = { width: 20, height: 20 };
  
  if (status === 'success') {
    return (
      <svg {...iconStyle} viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    );
  }
  if (status === 'warning') {
    return (
      <svg {...iconStyle} viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    );
  }
  if (status === 'danger') {
    return (
      <svg {...iconStyle} viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    );
  }
  return (
    <svg {...iconStyle} viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="7" y1="17" x2="17" y2="7" />
        <polyline points="7 7 17 7 17 17" />
      </svg>
    );
  }
  if (trend === 'down') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="7" y1="7" x2="17" y2="17" />
        <polyline points="17 7 17 17 7 17" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

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
  const [isHovered, setIsHovered] = useState(false);
  const config = STATUS_CONFIG[status];

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => { setShowTooltip(true); setIsHovered(true); }}
      onMouseLeave={() => { setShowTooltip(false); setIsHovered(false); }}
      style={{
        background: config.bg,
        border: `1.5px solid ${config.border}`,
        borderRadius: '14px',
        padding: '12px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: isHovered 
          ? `0 8px 24px -4px ${config.accent}20, 0 4px 8px -2px rgba(0,0,0,0.04)` 
          : '0 1px 3px rgba(0,0,0,0.04)',
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
            background: '#0F172A',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '10px',
            fontSize: '0.8rem',
            lineHeight: 1.5,
            maxWidth: '320px',
            minWidth: '250px',
            zIndex: 1000,
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            whiteSpace: 'normal',
            wordWrap: 'break-word',
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          {description}
          <div
            style={{
              position: 'absolute',
              bottom: '-5px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid #0F172A',
            }}
          />
        </div>
      )}

      {/* Header Row */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '8px' 
      }}>
        <div style={{ 
          fontSize: '0.75rem', 
          fontWeight: 600, 
          color: '#64748B', 
          textTransform: 'uppercase', 
          letterSpacing: '0.06em',
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px' 
        }}>
          {title}
          {description && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          )}
        </div>
        <div style={{
          width: 30,
          height: 30,
          borderRadius: '8px',
          background: config.iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <StatusIcon status={status} />
        </div>
      </div>

      {/* Main Value */}
      <div style={{ 
        fontSize: '1.6rem', 
        fontWeight: 700, 
        color: config.text, 
        marginBottom: '4px',
        letterSpacing: '-0.02em',
        lineHeight: 1.1,
      }}>
        {mainValue}
      </div>

      {/* Sub Value */}
      {subValue && (
        <div style={{ 
          fontSize: '0.8rem', 
          color: '#64748B', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '5px',
          marginTop: '3px',
        }}>
          {trend && <TrendIcon trend={trend} />}
          {subValue}
        </div>
      )}
    </div>
  );
}
