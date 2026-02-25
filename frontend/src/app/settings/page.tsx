'use client';

import { useState, useEffect, useTransition } from 'react';
import { getAllDomainConfigs, updateDomainTimezone, DomainConfig } from '@/actions/timezone';
import { logout } from '@/actions/login';

const COMMON_TIMEZONES = [
  { value: 'Asia/Bangkok', label: 'Bangkok (UTC+7)' },
  { value: 'Asia/Singapore', label: 'Singapore (UTC+8)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (UTC+9)' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (UTC+8)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (UTC+8)' },
  { value: 'Asia/Seoul', label: 'Seoul (UTC+9)' },
  { value: 'Australia/Sydney', label: 'Sydney (UTC+10/+11)' },
  { value: 'Europe/London', label: 'London (UTC+0/+1)' },
  { value: 'Europe/Paris', label: 'Paris (UTC+1/+2)' },
  { value: 'America/New_York', label: 'New York (UTC-5/-4)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (UTC-8/-7)' },
  { value: 'America/Chicago', label: 'Chicago (UTC-6/-5)' },
  { value: 'UTC', label: 'UTC (UTC+0)' },
];

export default function GlobalSettings() {
  const [configs, setConfigs] = useState<DomainConfig[]>([]);
  const [editingDomain, setEditingDomain] = useState<string | null>(null);
  const [selectedTimezone, setSelectedTimezone] = useState('Asia/Bangkok');
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = () => {
    startTransition(async () => {
      const data = await getAllDomainConfigs();
      setConfigs(data);
    });
  };

  const handleEdit = (domain: string, currentTimezone: string) => {
    setEditingDomain(domain);
    setSelectedTimezone(currentTimezone);
  };

  const handleSave = (domain: string) => {
    startTransition(async () => {
      const result = await updateDomainTimezone(domain, selectedTimezone);
      if (result) {
        setEditingDomain(null);
        setMessage({ type: 'success', text: `Timezone updated for ${domain}` });
        setTimeout(() => setMessage(null), 3000);
        loadConfigs();
      } else {
        setMessage({ type: 'error', text: 'Failed to update timezone' });
        setTimeout(() => setMessage(null), 3000);
      }
    });
  };

  const handleCancel = () => {
    setEditingDomain(null);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <a href="/" style={{ 
            color: '#3B82F6', 
            textDecoration: 'none', 
            fontSize: '0.85rem',
            fontWeight: 500,
            marginBottom: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 200ms ease',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to Dashboard
          </a>
          <h1 style={{ 
            margin: '12px 0 0 0', 
            fontSize: '1.5rem', 
            fontWeight: 700, 
            color: '#0F172A',
            letterSpacing: '-0.02em',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(30, 64, 175, 0.25)',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </div>
            Global Settings
          </h1>
          <p style={{ margin: '8px 0 0 0', fontSize: '0.9rem', color: '#64748B' }}>
            Configure timezone settings for your Jira domains
          </p>
        </div>
        <form action={logout}>
          <button 
            type="submit" 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              background: 'white',
              color: '#DC2626',
              border: '1.5px solid #FECACA',
              borderRadius: '10px',
              fontSize: '0.85rem',
              cursor: 'pointer',
              fontWeight: 600,
              fontFamily: 'inherit',
              transition: 'all 200ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#FEF2F2';
              e.currentTarget.style.borderColor = '#EF4444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.borderColor = '#FECACA';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
          </button>
        </form>
      </div>

      {/* Status Message */}
      {message && (
        <div style={{
          padding: '14px 18px',
          borderRadius: '12px',
          marginBottom: '20px',
          background: message.type === 'success' ? 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)' : 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)',
          color: message.type === 'success' ? '#15803D' : '#B91C1C',
          border: `1.5px solid ${message.type === 'success' ? '#86EFAC' : '#FECACA'}`,
          fontSize: '0.85rem',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          animation: 'fadeIn 0.2s ease-out',
        }}>
          {message.type === 'success' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          )}
          {message.text}
        </div>
      )}

      {/* Timezone Configuration Card */}
      <div style={{
        background: 'white',
        borderRadius: '14px',
        border: '1px solid #E2E8F0',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <div style={{
          padding: '18px 24px',
          background: '#F8FAFC',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '8px',
            background: 'rgba(59, 130, 246, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#0F172A' }}>
              Timezone Configuration
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748B' }}>
              Configure timezone per Jira domain. Changes affect all users on the same domain.
            </p>
          </div>
        </div>

        {configs.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 500, color: '#475569' }}>
              No domain configurations yet
            </p>
            <p style={{ margin: '8px 0 0 0', fontSize: '0.82rem', color: '#94A3B8' }}>
              Timezone will be set when you first access a project. Default: Asia/Bangkok (UTC+7)
            </p>
          </div>
        ) : (
          <div style={{ padding: '20px' }}>
            {/* Header Row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr auto',
              gap: '12px',
              padding: '12px 16px',
              background: '#F8FAFC',
              borderRadius: '10px',
              marginBottom: '12px',
              fontSize: '0.72rem',
              fontWeight: 600,
              color: '#64748B',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.06em',
            }}>
              <div>Domain</div>
              <div>Timezone</div>
              <div>Actions</div>
            </div>

            {configs.map((config) => (
              <div
                key={config.domain}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr auto',
                  gap: '12px',
                  padding: '16px',
                  borderBottom: '1px solid #F1F5F9',
                  alignItems: 'center',
                  transition: 'background 150ms ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#FAFBFC'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ fontSize: '0.88rem', color: '#0F172A', fontWeight: 500, fontFamily: 'var(--font-geist-mono, monospace)' }}>
                  {config.domain}
                </div>

                <div>
                  {editingDomain === config.domain ? (
                    <select
                      value={selectedTimezone}
                      onChange={(e) => setSelectedTimezone(e.target.value)}
                      disabled={isPending}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        border: '1.5px solid #3B82F6',
                        borderRadius: '10px',
                        fontSize: '0.85rem',
                        background: 'white',
                        cursor: 'pointer',
                        outline: 'none',
                        fontFamily: 'inherit',
                        color: '#0F172A',
                      }}
                    >
                      {COMMON_TIMEZONES.map(tz => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ fontSize: '0.85rem', color: '#0F172A' }}>
                      {COMMON_TIMEZONES.find(tz => tz.value === config.timezone)?.label || config.timezone}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {editingDomain === config.domain ? (
                    <>
                      <button
                        onClick={handleCancel}
                        disabled={isPending}
                        style={{
                          padding: '8px 16px',
                          background: 'white',
                          color: '#475569',
                          border: '1.5px solid #E2E8F0',
                          borderRadius: '8px',
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          fontWeight: 500,
                          fontFamily: 'inherit',
                          transition: 'all 150ms ease',
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSave(config.domain)}
                        disabled={isPending}
                        style={{
                          padding: '8px 16px',
                          background: isPending ? '#CBD5E1' : 'linear-gradient(135deg, #1E40AF, #3B82F6)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '0.82rem',
                          cursor: isPending ? 'not-allowed' : 'pointer',
                          fontWeight: 600,
                          fontFamily: 'inherit',
                          transition: 'all 150ms ease',
                          opacity: isPending ? 0.6 : 1,
                        }}
                      >
                        {isPending ? 'Saving...' : 'Save'}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleEdit(config.domain, config.timezone)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        background: 'linear-gradient(135deg, #1E40AF, #3B82F6)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontFamily: 'inherit',
                        transition: 'all 200ms ease',
                        boxShadow: '0 2px 6px rgba(30, 64, 175, 0.2)',
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      Edit
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Card */}
      <div style={{
        marginTop: '24px',
        padding: '20px',
        background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
        borderRadius: '14px',
        border: '1.5px solid #BFDBFE',
      }}>
        <h3 style={{ 
          margin: '0 0 12px 0', 
          fontSize: '0.88rem', 
          fontWeight: 600, 
          color: '#1D4ED8',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          How Timezone Configuration Works
        </h3>
        <ul style={{ margin: 0, paddingLeft: '24px', fontSize: '0.82rem', color: '#1E40AF', lineHeight: 1.8 }}>
          <li>Each Jira domain has one timezone setting</li>
          <li>All users accessing the same domain share the same timezone</li>
          <li>Timezone affects worklog date calculations and report generation</li>
          <li>Changes take effect immediately for all users</li>
          <li>Default timezone is Asia/Bangkok (UTC+7)</li>
        </ul>
      </div>
    </div>
  );
}
