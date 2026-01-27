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
           // Success toast or alert
           // revalidatePath happens on server, so UI should update if showing data
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
        padding: '8px 16px',
        background: isSyncing ? '#F4F5F7' : '#0052CC',
        color: isSyncing ? '#5E6C84' : 'white',
        border: 'none',
        borderRadius: '4px',
        fontWeight: 600,
        fontSize: '0.9rem',
        cursor: isSyncing ? 'not-allowed' : 'pointer',
        transition: 'background 0.2s',
      }}
    >
      {isSyncing ? 'Syncing...' : 'Sync Projects'}
    </button>
  );
}
