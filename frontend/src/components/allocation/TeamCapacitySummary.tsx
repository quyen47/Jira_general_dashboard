'use client';

interface TeamCapacitySummaryProps {
  totalCapacity: number;
  totalActual: number;
  avgUtilization: number;
  overloadedCount: number;
  underloadedCount: number;
}

/**
 * Summary cards showing aggregate team capacity metrics
 */
export default function TeamCapacitySummary({
  totalCapacity,
  totalActual,
  avgUtilization,
  overloadedCount,
  underloadedCount
}: TeamCapacitySummaryProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '12px',
        padding: '16px',
        background: '#F4F5F7',
        borderRadius: '6px',
        marginTop: '16px',
      }}
    >
      {/* Total Capacity */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '12px', color: '#6B778C', marginBottom: '4px' }}>
          Total Capacity
        </div>
        <div style={{ fontSize: '20px', fontWeight: 700, color: '#172B4D' }}>
          {totalCapacity.toFixed(0)}h
        </div>
      </div>

      {/* Total Actual */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '12px', color: '#6B778C', marginBottom: '4px' }}>
          Total Actual
        </div>
        <div style={{ fontSize: '20px', fontWeight: 700, color: '#172B4D' }}>
          {totalActual.toFixed(0)}h
        </div>
      </div>

      {/* Average Utilization */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '12px', color: '#6B778C', marginBottom: '4px' }}>
          Avg Utilization
        </div>
        <div
          style={{
            fontSize: '20px',
            fontWeight: 700,
            color: avgUtilization >= 80 && avgUtilization <= 100 ? '#36B37E' : 
                   avgUtilization > 100 ? '#FF5630' : '#FFAB00'
          }}
        >
          {avgUtilization.toFixed(0)}%
        </div>
      </div>

      {/* Overloaded Count */}
      {overloadedCount > 0 && (
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '12px', color: '#6B778C', marginBottom: '4px' }}>
            Overloaded
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#FF5630' }}>
            ⚠️ {overloadedCount}
          </div>
        </div>
      )}

      {/* Underutilized Count */}
      {underloadedCount > 0 && (
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '12px', color: '#6B778C', marginBottom: '4px' }}>
            Underutilized
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#FFAB00' }}>
            ⚠️ {underloadedCount}
          </div>
        </div>
      )}
    </div>
  );
}
