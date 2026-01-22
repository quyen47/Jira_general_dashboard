'use client';

import { Recommendation } from '@/lib/insights';
import React from 'react';

interface InsightsPanelProps {
  recommendations?: Recommendation[];
  headerAction?: React.ReactNode;
}

export default function InsightsPanel({ recommendations = [], headerAction }: InsightsPanelProps) {
  const actionRecs = recommendations.filter(r => r.type === 'action');
  const optimizationRecs = recommendations.filter(r => r.type === 'optimization');
  const opportunityRecs = recommendations.filter(r => r.type === 'opportunity');

  const isEmpty = recommendations.length === 0;

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
        color: '#172b4d',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>💡 Recommendations ({recommendations.length})</span>
        {headerAction && <div>{headerAction}</div>}
      </div>

      {/* Content */}
      <div style={{ padding: '16px' }}>
        
        {isEmpty && (
           <div style={{
            background: '#E3FCEF',
            border: '2px solid #00875A',
            borderRadius: 8,
            padding: '16px',
            textAlign: 'center',
            color: '#006644'
          }}>
            ✅ No algorithmic recommendations - Everything looks good!
          </div>
        )}

        {!isEmpty && (
          <>
            {/* Action Recommendations */}
            {actionRecs.map((rec, idx) => (
              <div
                key={`action-${idx}`}
                style={{
                  background: '#FFF0F0',
                  border: '1px solid #FF5630',
                  borderLeft: '4px solid #FF5630',
                  borderRadius: 4,
                  padding: '10px 12px',
                  marginBottom: '8px',
                }}
              >
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#BF2600', marginBottom: '4px' }}>
                  🎯 {rec.message}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#5e6c84', lineHeight: 1.4 }}>
                  {rec.action}
                </div>
              </div>
            ))}

            {/* Optimization Recommendations */}
            {optimizationRecs.map((rec, idx) => (
              <div
                key={`opt-${idx}`}
                style={{
                  background: '#FFFBF0',
                  border: '1px solid #FFAB00',
                  borderLeft: '4px solid #FFAB00',
                  borderRadius: 4,
                  padding: '10px 12px',
                  marginBottom: '8px',
                }}
              >
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#FF8B00', marginBottom: '4px' }}>
                  ⚙️ {rec.message}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#5e6c84', lineHeight: 1.4 }}>
                  {rec.action}
                </div>
              </div>
            ))}

            {/* Opportunity Recommendations */}
            {opportunityRecs.map((rec, idx) => (
              <div
                key={`opp-${idx}`}
                style={{
                  background: '#E6F2FF',
                  border: '1px solid #0052CC',
                  borderLeft: '4px solid #0052CC',
                  borderRadius: 4,
                  padding: '10px 12px',
                  marginBottom: '8px',
                }}
              >
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0052CC', marginBottom: '4px' }}>
                  🌟 {rec.message}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#5e6c84', lineHeight: 1.4 }}>
                  {rec.action}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
