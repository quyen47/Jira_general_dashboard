'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Filter {
  id: string;
  name: string;
  jql: string;
}

export default function FilterManager({ projectKey }: { projectKey: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentFilterJql = searchParams.get('filterJql') || '';

  const [filters, setFilters] = useState<Filter[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newFilterName, setNewFilterName] = useState('');
  const [newFilterJql, setNewFilterJql] = useState('');

  const STORAGE_KEY = `jira_dashboard_filters_${projectKey}`;

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setFilters(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load filters", e);
      }
    }
  }, [STORAGE_KEY]);

  const saveFilters = (newFilters: Filter[]) => {
    setFilters(newFilters);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newFilters));
  };

  const handleAdd = () => {
    if (!newFilterName || !newFilterJql) return;
    const newFilter: Filter = {
      id: Date.now().toString(),
      name: newFilterName,
      jql: newFilterJql
    };
    saveFilters([...filters, newFilter]);
    setNewFilterName('');
    setNewFilterJql('');
    setIsAdding(false);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this filter?')) {
        const newFilters = filters.filter(f => f.id !== id);
        saveFilters(newFilters);
        // If deleted filter was active, clear it? Maybe not necessary strictly.
    }
  };

  const applyFilter = (jql: string) => {
    if (jql === currentFilterJql) {
        // Toggle off if clicking same
        router.push(`/project/${projectKey}`);
    } else {
        const params = new URLSearchParams();
        params.set('filterJql', jql);
        router.push(`/project/${projectKey}?${params.toString()}`);
    }
  };

  const clearFilter = () => {
      router.push(`/project/${projectKey}`);
  };

  return (
    <div style={{ marginBottom: '1.5rem', background: 'white', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ 
            padding: '1rem', 
            cursor: 'pointer', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            background: isExpanded ? '#f4f5f7' : 'white',
            borderBottom: isExpanded ? '1px solid #dfe1e6' : 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontWeight: 600, color: '#172b4d' }}>Filters</span>
            {currentFilterJql && (
                <span style={{ 
                    fontSize: '0.75rem', 
                    background: '#e3fcef', 
                    color: '#006644', 
                    padding: '2px 8px', 
                    borderRadius: 4 
                }}>
                    Active
                </span>
            )}
        </div>
        <span style={{ color: '#5e6c84', fontSize: '0.9rem' }}>{isExpanded ? 'Hide' : 'Show'}</span>
      </div>

      {isExpanded && (
        <div style={{ padding: '1rem' }}>
            
            {/* Filter List */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                <div 
                    onClick={clearFilter}
                    style={{
                        padding: '6px 12px',
                        borderRadius: 20,
                        border: '1px solid #dfe1e6',
                        background: currentFilterJql === '' ? '#42526e' : 'white',
                        color: currentFilterJql === '' ? 'white' : '#42526e',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        userSelect: 'none'
                    }}
                >
                    All Issues
                </div>

                {filters.map(filter => (
                    <div 
                        key={filter.id}
                        onClick={() => applyFilter(filter.jql)}
                        style={{
                            padding: '6px 12px',
                            borderRadius: 20,
                            border: `1px solid ${currentFilterJql === filter.jql ? '#0052cc' : '#dfe1e6'}`,
                            background: currentFilterJql === filter.jql ? '#0052cc' : 'white',
                            color: currentFilterJql === filter.jql ? 'white' : '#172b4d',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            userSelect: 'none'
                        }}
                    >
                        {filter.name}
                        <span 
                            onClick={(e) => handleDelete(filter.id, e)}
                            style={{ 
                                opacity: 0.6, 
                                fontSize: '1.2em', 
                                lineHeight: 0.5,
                                padding: '0 2px'
                            }}
                            title="Delete"
                        >
                            ×
                        </span>
                    </div>
                ))}

                <button 
                    onClick={() => setIsAdding(true)}
                    style={{
                        padding: '6px 12px',
                        borderRadius: 20,
                        border: '1px dashed #dfe1e6',
                        background: 'transparent',
                        color: '#0052cc',
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                    }}
                >
                    + Add Filter
                </button>
            </div>

            {/* Add Form */}
            {isAdding && (
                <div style={{ 
                    marginTop: '1rem', 
                    padding: '1rem', 
                    background: '#f4f5f7', 
                    borderRadius: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                }}>
                    <h4 style={{ margin: 0 }}>New Filter</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>Name</label>
                            <input 
                                value={newFilterName}
                                onChange={e => setNewFilterName(e.target.value)}
                                placeholder="e.g. My High Priority"
                                style={{ width: '100%', padding: '8px', borderRadius: 4, border: '1px solid #dfe1e6' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>JQL</label>
                            <input 
                                value={newFilterJql}
                                onChange={e => setNewFilterJql(e.target.value)}
                                placeholder="e.g. priority = High AND assignee = currentUser()"
                                style={{ width: '100%', padding: '8px', borderRadius: 4, border: '1px solid #dfe1e6' }}
                            />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button 
                            onClick={() => setIsAdding(false)}
                            style={{ padding: '6px 12px', borderRadius: 4, border: 'none', background: 'transparent', color: '#42526e', cursor: 'pointer' }}
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleAdd}
                            disabled={!newFilterName || !newFilterJql}
                            style={{ padding: '6px 12px', borderRadius: 4, border: 'none', background: '#0052cc', color: 'white', cursor: 'pointer', opacity: (!newFilterName || !newFilterJql) ? 0.5 : 1 }}
                        >
                            Save Filter
                        </button>
                    </div>
                </div>
            )}
        </div>
      )}
    </div>
  );
}
