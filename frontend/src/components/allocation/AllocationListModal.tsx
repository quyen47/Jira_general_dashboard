'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  ResourceAllocation, 
  getAllocations, 
  createAllocation, 
  updateAllocation, 
  deleteAllocation 
} from '../../lib/allocation-api';

interface AllocationListModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  projectKey: string; // Needed for API calls
  displayName: string;
  onAllocationChange: () => void;
}

export default function AllocationListModal({
  isOpen,
  onClose,
  accountId,
  projectKey,
  displayName,
  onAllocationChange
}: AllocationListModalProps) {
  const [allocations, setAllocations] = useState<ResourceAllocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state for new/editing allocation
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    allocationPercent: 100,
    notes: ''
  });

  // Calculate default dates (start of next week / end of next week) rather than generic defaults?
  // Or just empty. Let's use current date + 1 week.

  const fetchAllocations = async () => {
    setLoading(true);
    try {
      // Fetch all allocations for this project (API filters by project)
      // We'll filter by accountId on client side for now, or request backend update later if performance is issue.
      // Ideally we'd have a specific endpoint for user allocations but we can reuse getAllocations
      // and filter:
      const allAllocations = await getAllocations(projectKey);
      const userAllocations = allAllocations.filter(a => a.accountId === accountId);
      
      // Sort by start date desc
      userAllocations.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
      
      setAllocations(userAllocations);
      setError(null);
    } catch (err) {
      setError('Failed to load allocations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAllocations();
      // Reset form
      const today = new Date();
      const nextMonth = new Date();
      nextMonth.setDate(today.getDate() + 30);
      
      setFormData({
        startDate: today.toISOString().split('T')[0],
        endDate: nextMonth.toISOString().split('T')[0],
        allocationPercent: 100,
        notes: ''
      });
      setIsAdding(false);
      setEditingId(null);
    }
  }, [isOpen, accountId, projectKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        await updateAllocation(projectKey, editingId, {
          startDate: formData.startDate,
          endDate: formData.endDate,
          allocationPercent: Number(formData.allocationPercent),
          notes: formData.notes
        });
      } else {
        await createAllocation(projectKey, {
          accountId,
          displayName,
          startDate: formData.startDate,
          endDate: formData.endDate,
          allocationPercent: Number(formData.allocationPercent),
          notes: formData.notes
        });
      }
      
      await fetchAllocations();
      onAllocationChange();
      setIsAdding(false);
      setEditingId(null);
      
      // Reset form for next add
      const today = new Date();
      const nextMonth = new Date();
      nextMonth.setDate(today.getDate() + 30);
      setFormData({
        startDate: today.toISOString().split('T')[0],
        endDate: nextMonth.toISOString().split('T')[0],
        allocationPercent: 100,
        notes: ''
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save allocation');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this allocation?')) return;
    
    setLoading(true);
    try {
      await deleteAllocation(projectKey, id);
      await fetchAllocations();
      onAllocationChange();
    } catch (err) {
      setError('Failed to delete allocation');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (alloc: ResourceAllocation) => {
    setFormData({
      startDate: alloc.startDate.split('T')[0],
      endDate: alloc.endDate.split('T')[0],
      allocationPercent: alloc.allocationPercent,
      notes: alloc.notes || ''
    });
    setEditingId(alloc.id);
    setIsAdding(true);
  };

  if (!isOpen) return null;

  return createPortal(
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(9, 30, 66, 0.54)',
      zIndex: 1000,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '3px',
        boxShadow: '0 8px 16px -4px rgba(9, 30, 66, 0.25), 0 0 0 1px rgba(9, 30, 66, 0.08)',
        width: '600px',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #DFE1E6',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#172B4D' }}>
            Allocations for {displayName}
          </h2>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#42526E'
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          
          {error && (
            <div style={{
              margin: '24px 24px 0',
              backgroundColor: '#FFEBE6',
              color: '#DE350B',
              padding: '8px 12px',
              borderRadius: '3px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          {/* List of allocations */}
          {!isAdding && (
            <>
              <div style={{ padding: '24px 24px 16px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setIsAdding(true)}
                  style={{
                    backgroundColor: '#0052CC',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    padding: '8px 12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Add Allocation
                </button>
              </div>

              {loading && allocations.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#6B778C', padding: '20px' }}>Loading...</div>
              ) : allocations.length === 0 ? (
                <div style={{ margin: '0 24px', textAlign: 'center', color: '#6B778C', padding: '20px', background: '#FAFBFC', borderRadius: '3px' }}>
                  No allocations found.
                </div>
              ) : (
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>
                   <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                    <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '8px 8px 8px 0', color: '#6B778C', fontSize: '12px', borderBottom: '2px solid #DFE1E6', width: '50%' }}>Period</th>
                        <th style={{ textAlign: 'center', padding: '8px', color: '#6B778C', fontSize: '12px', borderBottom: '2px solid #DFE1E6', width: '20%' }}>Percent</th>
                        <th style={{ textAlign: 'right', padding: '8px 0 8px 8px', color: '#6B778C', fontSize: '12px', borderBottom: '2px solid #DFE1E6', width: '30%' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allocations.map(alloc => (
                        <tr key={alloc.id}>
                          <td style={{ padding: '12px 8px 12px 0', fontSize: '14px', color: '#172B4D', borderBottom: '1px solid #DFE1E6' }}>
                            {new Date(alloc.startDate).toLocaleDateString()} - {new Date(alloc.endDate).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '12px 8px', fontSize: '14px', fontWeight: 500, borderBottom: '1px solid #DFE1E6', textAlign: 'center' }}>
                            <span style={{ 
                              background: '#EAE6FF', 
                              color: '#403294', 
                              padding: '2px 6px', 
                              borderRadius: '3px',
                              display: 'inline-block',
                              minWidth: '40px',
                              textAlign: 'center'
                            }}>
                              {alloc.allocationPercent}%
                            </span>
                          </td>
                          <td style={{ padding: '12px 0 12px 8px', textAlign: 'right', borderBottom: '1px solid #DFE1E6' }}>
                            <button
                              onClick={() => startEdit(alloc)}
                              style={{ 
                                background: 'none', 
                                border: 'none', 
                                color: '#0052CC', 
                                cursor: 'pointer',
                                marginRight: '12px',
                                fontSize: '14px',
                                padding: '4px'
                              }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(alloc.id)}
                              style={{ 
                                background: 'none', 
                                border: 'none', 
                                color: '#DE350B', 
                                cursor: 'pointer',
                                fontSize: '14px',
                                padding: '4px'
                              }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* Add/Edit Form */}
          {isAdding && (
            <div style={{ padding: '24px', overflowY: 'auto' }}>
              <div style={{ background: '#F4F5F7', padding: '20px', borderRadius: '3px' }}>
                <h3 style={{ marginTop: 0, fontSize: '16px', color: '#172B4D', marginBottom: '20px' }}>
                  {editingId ? 'Edit Allocation' : 'New Allocation'}
                </h3>
                <form onSubmit={handleSubmit}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6B778C', marginBottom: '6px' }}>
                        Start Date
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.startDate}
                        onChange={e => setFormData({...formData, startDate: e.target.value})}
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #DFE1E6',
                          borderRadius: '3px',
                          fontSize: '14px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6B778C', marginBottom: '6px' }}>
                        End Date
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.endDate}
                        onChange={e => setFormData({...formData, endDate: e.target.value})}
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #DFE1E6',
                          borderRadius: '3px',
                          fontSize: '14px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6B778C', marginBottom: '6px' }}>
                      Allocation Percentage (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="200"
                      required
                      value={formData.allocationPercent}
                      onChange={e => setFormData({...formData, allocationPercent: Number(e.target.value)})}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #DFE1E6',
                        borderRadius: '3px',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6B778C', marginBottom: '6px' }}>
                      Notes (Optional)
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={e => setFormData({...formData, notes: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #DFE1E6',
                        borderRadius: '3px',
                        fontSize: '14px',
                        minHeight: '80px',
                        boxSizing: 'border-box',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAdding(false);
                        setEditingId(null);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#42526E',
                        cursor: 'pointer',
                        padding: '8px 12px',
                        fontSize: '14px',
                        fontWeight: 500
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        backgroundColor: '#0052CC',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        padding: '8px 16px',
                        fontWeight: 500,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        opacity: loading ? 0.7 : 1
                      }}
                    >
                      {loading ? 'Saving...' : 'Save Allocation'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
