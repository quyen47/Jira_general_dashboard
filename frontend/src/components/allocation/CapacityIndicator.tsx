'use client';

interface CapacityIndicatorProps {
  availableHours: number;
  actualHours: number;
  utilizationPercent: number;
  status: 'optimal' | 'overloaded' | 'underloaded' | 'at-risk';
}

const STATUS_CONFIG = {
  optimal: {
    color: '#36B37E',
    bgColor: '#E3FCEF',
    label: '✅ Optimal',
    icon: '✅'
  },
  overloaded: {
    color: '#FF5630',
    bgColor: '#FFEBE6',
    label: '⚠️ Overloaded',
    icon: '⚠️'
  },
  underloaded: {
    color: '#FFAB00',
    bgColor: '#FFF0B3',
    label: '⚠️ Underload',
    icon: '⚠️'
  },
  'at-risk': {
    color: '#FF991F',
    bgColor: '#FFF4E5',
    label: '⚡ At Risk',
    icon: '⚡'
  }
};

/**
 * Visual indicator showing capacity status with progress bar and tooltip
 */
export default function CapacityIndicator({
  availableHours,
  actualHours,
  utilizationPercent,
  status
}: CapacityIndicatorProps) {
  const config = STATUS_CONFIG[status];
  const progressWidth = Math.min(utilizationPercent, 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '120px' }}>
      {/* Progress Bar */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '8px',
          background: '#F4F5F7',
          borderRadius: '4px',
          overflow: 'hidden',
        }}
        title={`${actualHours.toFixed(1)}h / ${availableHours.toFixed(1)}h (${utilizationPercent.toFixed(0)}%)`}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${progressWidth}%`,
            background: config.color,
            transition: 'width 0.3s ease',
          }}
        />
        {utilizationPercent > 100 && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: '100%',
              background: `repeating-linear-gradient(
                45deg,
                ${config.color},
                ${config.color} 4px,
                transparent 4px,
                transparent 8px
              )`,
            }}
          />
        )}
      </div>

      {/* Hours Display */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: '#6B778C' }}>
          <strong>{actualHours.toFixed(1)}h</strong> / {availableHours.toFixed(1)}h
        </span>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: config.color,
            padding: '2px 6px',
            background: config.bgColor,
            borderRadius: '3px',
          }}
        >
          {utilizationPercent.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}
