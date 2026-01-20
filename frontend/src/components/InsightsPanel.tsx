'use client';

import { Alert } from '@/lib/insights';

interface InsightsPanelProps {
  alerts: Alert[];
}

export default function InsightsPanel({ alerts }: InsightsPanelProps) {
  if (alerts.length === 0) {
    return (
      <div style={{
        background: '#E3FCEF',
        border: '2px solid #00875A',
        borderRadius: 8,
        padding: '16px',
        textAlign: 'center',
        color: '#006644'
      }}>
        ✅ No alerts - Everything looks good!
      </div>
    );
  }

  const critical = alerts.filter(a => a.type === 'critical');
  const warnings = alerts.filter(a => a.type === 'warning');
  const positive = alerts.filter(a => a.type === 'positive');

  return (
    <div style={{
      background: 'white',
      border: '1px solid #dfe1e6',
      borderRadius: 8,
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        background: '#f4f5f7',
        padding: '12px 16px',
        borderBottom: '1px solid #dfe1e6',
        fontWeight: 600,
        fontSize: '0.9rem',
        color: '#172b4d'
      }}>
        📊 Project Insights & Alerts
      </div>

      {/* Alerts */}
      <div style={{ padding: '16px' }}>
        {/* Critical Alerts */}
        {critical.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#BF2600',
              marginBottom: '8px',
              textTransform: 'uppercase'
            }}>
              🚨 Critical ({critical.length})
            </div>
            {critical.map((alert, idx) => (
              <div
                key={idx}
                style={{
                  background: '#FFEBE6',
                  border: '1px solid #DE350B',
                  borderRadius: 4,
                  padding: '8px 12px',
                  marginBottom: '6px',
                  fontSize: '0.85rem',
                  color: '#BF2600'
                }}
              >
                {alert.message}
              </div>
            ))}
          </div>
        )}

        {/* Warning Alerts */}
        {warnings.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#FF8B00',
              marginBottom: '8px',
              textTransform: 'uppercase'
            }}>
              ⚠️ Warnings ({warnings.length})
            </div>
            {warnings.map((alert, idx) => (
              <div
                key={idx}
                style={{
                  background: '#FFFAE6',
                  border: '1px solid #FF991F',
                  borderRadius: 4,
                  padding: '8px 12px',
                  marginBottom: '6px',
                  fontSize: '0.85rem',
                  color: '#FF8B00'
                }}
              >
                {alert.message}
              </div>
            ))}
          </div>
        )}

        {/* Positive Alerts */}
        {positive.length > 0 && (
          <div>
            <div style={{
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#006644',
              marginBottom: '8px',
              textTransform: 'uppercase'
            }}>
              ✅ Positive ({positive.length})
            </div>
            {positive.map((alert, idx) => (
              <div
                key={idx}
                style={{
                  background: '#E3FCEF',
                  border: '1px solid #00875A',
                  borderRadius: 4,
                  padding: '8px 12px',
                  marginBottom: '6px',
                  fontSize: '0.85rem',
                  color: '#006644'
                }}
              >
                {alert.message}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
