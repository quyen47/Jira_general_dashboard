'use client';

import { useState } from 'react';

interface AllocationInputProps {
  accountId: string;
  displayName: string;
  currentAllocation?: number;
  onSave: (percent: number) => Promise<void>;
  disabled?: boolean;
}

/**
 * Editable allocation percentage input
 * Click to edit, blur/enter to save
 */
export default function AllocationInput({
  accountId,
  displayName,
  currentAllocation = 0,
  onSave,
  disabled = false
}: AllocationInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(currentAllocation.toString());
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <button
      onClick={() => !disabled && setIsEditing(true)}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 8px',
        background: disabled ? '#F4F5F7' : '#FAFBFC',
        border: '1px solid #DFE1E6',
        borderRadius: '3px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '14px',
        fontWeight: 600,
        color: disabled ? '#A5ADBA' : '#172B4D',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = '#EBECF0';
          e.currentTarget.style.borderColor = '#B3BAC5';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = '#FAFBFC';
          e.currentTarget.style.borderColor = '#DFE1E6';
        }
      }}
    >
      <span>{currentAllocation}%</span>
      {!disabled && (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M10.586 1.586a2 2 0 112.828 2.828l-8 8a2 2 0 01-.828.586l-2.828.828.828-2.828a2 2 0 01.586-.828l8-8z"
            fill="#6B778C"
          />
        </svg>
      )}
    </button>
  );
}
