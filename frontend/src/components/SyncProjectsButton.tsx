'use client';

import { useState } from 'react';
import { syncProjectsAction } from '@/actions/sync';

export default function SyncProjectsButton() {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    if (confirm('This will fetch all projects from Jira and update the local database. It may take a few seconds. Continue?')) {
      setIsSyncing(true);
      try {
        const result = await syncProjectsAction();
        if (result.success) {
           // Success — page revalidates via server action
        } else {
           alert('Sync failed: ' + result.error);
        }
      } catch (e) {
        console.error(e);
        alert('Sync failed');
      } finally {
        setIsSyncing(false);
      }
    }
  };

  return (
    <button
      onClick={handleSync}
      disabled={isSyncing}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 20px',
        background: isSyncing 
          ? '#F1F5F9' 
          : 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
        color: isSyncing ? '#64748B' : 'white',
        border: isSyncing ? '1px solid #E2E8F0' : 'none',
        borderRadius: '10px',
        fontWeight: 600,
        fontSize: '0.85rem',
        fontFamily: 'inherit',
        cursor: isSyncing ? 'not-allowed' : 'pointer',
        transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: isSyncing ? 'none' : '0 2px 8px rgba(30, 64, 175, 0.25)',
        letterSpacing: '0.01em',
      }}
      onMouseEnter={(e) => {
        if (!isSyncing) {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(30, 64, 175, 0.35)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = isSyncing ? 'none' : '0 2px 8px rgba(30, 64, 175, 0.25)';
      }}
    >
      {isSyncing ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
      )}
      {isSyncing ? 'Syncing...' : 'Sync Projects'}
    </button>
  );
}
