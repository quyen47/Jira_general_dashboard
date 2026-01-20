'use client';

import { useState, useEffect, useTransition } from 'react';
import { getDomainTimezone, updateDomainTimezone } from '@/actions/timezone';

interface TimezoneConfigProps {
  domain: string;
}

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

export default function TimezoneConfig({ domain }: TimezoneConfigProps) {
  const [timezone, setTimezone] = useState('Asia/Bangkok');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTimezone, setSelectedTimezone] = useState('Asia/Bangkok');
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    startTransition(async () => {
      const tz = await getDomainTimezone(domain);
      setTimezone(tz);
      setSelectedTimezone(tz);
    });
  }, [domain]);

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateDomainTimezone(domain, selectedTimezone);
      if (result) {
        setTimezone(selectedTimezone);
        setIsEditing(false);
        setMessage({ type: 'success', text: 'Timezone updated successfully!' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: 'Failed to update timezone' });
        setTimeout(() => setMessage(null), 3000);
      }
    });
  };

  const handleCancel = () => {
    setSelectedTimezone(timezone);
    setIsEditing(false);
  };

  return (
    <div style={{
      padding: '16px',
      background: 'white',
      borderRadius: 8,
      border: '1px solid #dfe1e6',
      marginBottom: '16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#172b4d' }}>
            🌍 Timezone Configuration
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#5e6c84' }}>
            Configure timezone for accurate time calculations in reports
          </p>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
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

      {message && (
        <div style={{
          padding: '8px 12px',
          borderRadius: 4,
          marginBottom: '12px',
          background: message.type === 'success' ? '#e3fcef' : '#ffebe6',
          color: message.type === 'success' ? '#006644' : '#bf2600',
          fontSize: '0.85rem'
        }}>
          {message.text}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '0.8rem', color: '#5e6c84', marginBottom: '4px', fontWeight: 500 }}>
            Domain
          </label>
          <div style={{
            padding: '8px 12px',
            background: '#f4f5f7',
            borderRadius: 4,
            fontSize: '0.85rem',
            color: '#172b4d'
          }}>
            {domain}
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '0.8rem', color: '#5e6c84', marginBottom: '4px', fontWeight: 500 }}>
            Timezone
          </label>
          {isEditing ? (
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
            <div style={{
              padding: '8px 12px',
              background: '#f4f5f7',
              borderRadius: 4,
              fontSize: '0.85rem',
              color: '#172b4d'
            }}>
              {COMMON_TIMEZONES.find(tz => tz.value === timezone)?.label || timezone}
            </div>
          )}
        </div>
      </div>

      {isEditing && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={handleCancel}
            disabled={isPending}
            style={{
              padding: '6px 16px',
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
            onClick={handleSave}
            disabled={isPending}
            style={{
              padding: '6px 16px',
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
        </div>
      )}
    </div>
  );
}
