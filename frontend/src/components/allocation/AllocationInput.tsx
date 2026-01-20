'use client';

import { useState, useEffect } from 'react';
import AllocationListModal from './AllocationListModal';

interface AllocationInputProps {
  accountId: string;
  projectKey: string;
  displayName: string;
  currentAllocation?: number;
  onSave: (percent: number) => Promise<void>;
  onAllocationChange: () => void;
  disabled?: boolean;
}

/**
 * Editable allocation percentage input
 * Click to edit, blur/enter to save
 */
export default function AllocationInput({
  accountId,
  projectKey,
  displayName,
  currentAllocation = 0,
  onSave,
  onAllocationChange,
  disabled = false
}: AllocationInputProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(currentAllocation.toString());
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync value with currentAllocation when it changes (e.g., after save)
  useEffect(() => {
    if (!isEditing) {
      setValue(currentAllocation.toString());
    }
  }, [currentAllocation, isEditing]);

  const handleSave = async () => {
    const numValue = parseInt(value, 10);
    
    // Validation
    if (isNaN(numValue)) {
      setError('Please enter a valid number');
      return;
    }
    
    if (numValue < 0 || numValue > 200) {
      setError('Allocation must be between 0% and 200%');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(numValue);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setValue(currentAllocation.toString());
      setIsEditing(false);
      setError(null);
    }
  };

  const handleBlur = () => {
    if (!isSaving) {
      handleSave();
    }
  };

  if (isEditing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            autoFocus
            min="0"
            max="200"
            disabled={isSaving}
            style={{
              width: '60px',
              padding: '4px 8px',
              border: error ? '1px solid #FF5630' : '1px solid #DFE1E6',
              borderRadius: '3px',
              fontSize: '14px',
              outline: 'none',
            }}
          />
          <span style={{ fontSize: '14px', color: '#6B778C' }}>%</span>
          {isSaving && <span style={{ fontSize: '12px', color: '#6B778C' }}>Saving...</span>}
        </div>
        {error && (
          <span style={{ fontSize: '12px', color: '#FF5630' }}>{error}</span>
        )}
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            background: 'transparent',
            borderRadius: '3px',
            fontSize: '14px',
            fontWeight: 600,
            color: '#172B4D',
          }}
        >
          <span>{currentAllocation}%</span>
        </div>
        
        {!disabled && (
          <button
            onClick={() => setIsModalOpen(true)}
            title="Manage Allocations"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              color: '#6B778C',
              opacity: 0.7
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
        )}
      </div>

      <AllocationListModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        accountId={accountId}
        projectKey={projectKey}
        displayName={displayName}
        onAllocationChange={onAllocationChange}
      />
    </>
  );
}
