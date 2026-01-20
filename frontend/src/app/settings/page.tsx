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
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <a href="/" style={{ 
            color: '#0052cc', 
            textDecoration: 'none', 
            fontSize: '0.9rem',
            marginBottom: '8px',
            display: 'inline-block'
          }}>
            ← Back to Dashboard
          </a>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600, color: '#172b4d' }}>
            ⚙️ Global Settings
          </h1>
          <p style={{ margin: '8px 0 0 0', fontSize: '0.9rem', color: '#5e6c84' }}>
            Configure timezone settings for your Jira domains
          </p>
        </div>
        <form action={logout}>
          <button 
            type="submit" 
            style={{
              padding: '8px 16px',
              background: '#de350b',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              fontSize: '0.9rem',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Logout
          </button>
        </form>
      </div>

      {message && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 4,
          marginBottom: '16px',
          background: message.type === 'success' ? '#e3fcef' : '#ffebe6',
          color: message.type === 'success' ? '#006644' : '#bf2600',
          fontSize: '0.9rem',
          fontWeight: 500
        }}>
          {message.text}
        </div>
      )}

      <div style={{
        background: 'white',
        borderRadius: 8,
        border: '1px solid #dfe1e6',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '16px 20px',
          background: '#f4f5f7',
          borderBottom: '1px solid #dfe1e6'
        }}>
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#172b4d' }}>
            🌍 Timezone Configuration
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#5e6c84' }}>
            Configure timezone per Jira domain. Changes affect all users on the same domain.
          </p>
        </div>

        {configs.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#5e6c84' }}>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              No domain configurations yet. Timezone will be set when you first access a project.
            </p>
            <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem' }}>
              Default timezone: Asia/Bangkok (UTC+7)
            </p>
          </div>
        ) : (
          <div style={{ padding: '20px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr auto',
              gap: '12px',
              padding: '12px 16px',
              background: '#f4f5f7',
              borderRadius: 4,
              marginBottom: '12px',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#5e6c84',
              textTransform: 'uppercase'
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
                  borderBottom: '1px solid #f4f5f7',
                  alignItems: 'center'
                }}
              >
                <div style={{ fontSize: '0.9rem', color: '#172b4d', fontWeight: 500 }}>
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
                        padding: '8px 12px',
                        border: '1px solid #dfe1e6',
                        borderRadius: 4,
                        fontSize: '0.85rem',
                        background: 'white',
                        cursor: 'pointer'
                      }}
                    >
                      {COMMON_TIMEZONES.map(tz => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ fontSize: '0.85rem', color: '#172b4d' }}>
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
                          padding: '6px 12px',
                          background: 'white',
                          color: '#172b4d',
                          border: '1px solid #dfe1e6',
                          borderRadius: 4,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          fontWeight: 500
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSave(config.domain)}
                        disabled={isPending}
                        style={{
                          padding: '6px 12px',
                          background: '#0052cc',
                          color: 'white',
                          border: 'none',
                          borderRadius: 4,
                          fontSize: '0.85rem',
                          cursor: isPending ? 'not-allowed' : 'pointer',
                          fontWeight: 500,
                          opacity: isPending ? 0.6 : 1
                        }}
                      >
                        {isPending ? 'Saving...' : 'Save'}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleEdit(config.domain, config.timezone)}
                      style={{
                        padding: '6px 12px',
                        background: '#0052cc',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        fontWeight: 500
                      }}
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{
        marginTop: '24px',
        padding: '16px',
        background: '#e3fcef',
        borderRadius: 4,
        border: '1px solid #00875a'
      }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', fontWeight: 600, color: '#006644' }}>
          ℹ️ How Timezone Configuration Works
        </h3>
        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: '#006644', lineHeight: 1.6 }}>
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
