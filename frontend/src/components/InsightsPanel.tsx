'use client';

import { Recommendation } from '@/lib/insights';
import React from 'react';

interface InsightsPanelProps {
  recommendations?: Recommendation[];
  headerAction?: React.ReactNode;
}

function ActionIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function OptimizationIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function OpportunityIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

export default function InsightsPanel({ recommendations = [], headerAction }: InsightsPanelProps) {
  const actionRecs = recommendations.filter(r => r.type === 'action');
  const optimizationRecs = recommendations.filter(r => r.type === 'optimization');
  const opportunityRecs = recommendations.filter(r => r.type === 'opportunity');

  const isEmpty = recommendations.length === 0;

  return (
    <div style={{
      background: 'white',
      border: '1px solid #E2E8F0',
      borderRadius: '14px',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        background: '#F8FAFC',
        padding: '10px 14px',
        borderBottom: '1px solid #E2E8F0',
        fontWeight: 600,
        fontSize: '0.85rem',
        color: '#0F172A',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: '8px',
            background: 'rgba(245, 158, 11, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="9" y1="18" x2="15" y2="18" />
              <line x1="10" y1="22" x2="14" y2="22" />
              <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
            </svg>
          </div>
          Recommendations ({recommendations.length})
        </span>
        {headerAction && <div>{headerAction}</div>}
      </div>

      {/* Content */}
      <div style={{ padding: '12px' }}>
        
        {isEmpty && (
          <div style={{
            background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
            border: '1.5px solid #86EFAC',
            borderRadius: '12px',
            padding: '12px',
            textAlign: 'center',
            color: '#15803D',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            fontWeight: 500,
            fontSize: '0.85rem',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            No algorithmic recommendations — Everything looks good!
          </div>
        )}

        {!isEmpty && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {/* Action Recommendations */}
            {actionRecs.map((rec, idx) => (
              <div
                key={`action-${idx}`}
                style={{
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderLeft: '4px solid #EF4444',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  animation: `fadeIn 0.3s ease-out ${idx * 0.05}s both`,
                }}
              >
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#B91C1C', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ActionIcon /> {rec.message}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748B', lineHeight: 1.5 }}>
                  {rec.action}
                </div>
              </div>
            ))}

            {/* Optimization Recommendations */}
            {optimizationRecs.map((rec, idx) => (
              <div
                key={`opt-${idx}`}
                style={{
                  background: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  borderLeft: '4px solid #F59E0B',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  animation: `fadeIn 0.3s ease-out ${(actionRecs.length + idx) * 0.05}s both`,
                }}
              >
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#A16207', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <OptimizationIcon /> {rec.message}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748B', lineHeight: 1.5 }}>
                  {rec.action}
                </div>
              </div>
            ))}

            {/* Opportunity Recommendations */}
            {opportunityRecs.map((rec, idx) => (
              <div
                key={`opp-${idx}`}
                style={{
                  background: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderLeft: '4px solid #3B82F6',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  animation: `fadeIn 0.3s ease-out ${(actionRecs.length + optimizationRecs.length + idx) * 0.05}s both`,
                }}
              >
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1D4ED8', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <OpportunityIcon /> {rec.message}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748B', lineHeight: 1.5 }}>
                  {rec.action}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
