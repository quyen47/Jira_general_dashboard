'use client';

import { useState, useEffect } from 'react';
import { searchJiraUsers } from '@/actions/users';
import { getStakeholders, saveStakeholders as apiSaveStakeholders } from '@/lib/api';

interface Stakeholder {
  id: string;
  role: string;
  user: {
    accountId: string;
    displayName: string;
    avatarUrl: string;
  } | null; // User might be optional or "N/A" effectively
}

export default function StakeholderManager({ projectKey }: { projectKey: string }) {
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  
  // Form State
  const [role, setRole] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuery, setEditQuery] = useState('');
  const [editResults, setEditResults] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
        try {
            const saved = await getStakeholders(projectKey);
            if (saved && saved.length > 0) {
                // Map backend structure if needed, currently it matches mostly but user object is flattened in backend
                // Backend: role, accountId, displayName, avatarUrl
                // Frontend: role, user: { accountId, ... }
                const mapped = saved.map((s: any) => ({
                    id: s.id,
                    role: s.role,
                    user: s.accountId ? {
                        accountId: s.accountId,
                        displayName: s.displayName,
                        avatarUrl: s.avatarUrl
                    } : null
                }));
                setStakeholders(mapped);
            } else {
                // Default roles as requested
                const defaults: Stakeholder[] = [
                    { id: 'default-1', role: 'Account Executive', user: null },
                    { id: 'default-2', role: 'DH Project Manager', user: null },
                    { id: 'default-3', role: 'DHA Project Manager', user: null },
                    { id: 'default-4', role: 'Solution Lead', user: null },
                ];
                setStakeholders(defaults);
            }
        } catch (e) {
            console.error("Failed to load stakeholders", e);
        }
    }
    load();
  }, [projectKey]);

  const saveStakeholders = async (newList: Stakeholder[]) => {
    setStakeholders(newList);
    try {
        await apiSaveStakeholders(projectKey, newList);
    } catch (e) {
        console.error("Failed to save stakeholders", e);
    }
  };

  const handleSearch = async (q: string) => {
    setUserQuery(q);
    if (q.length < 2) {
        setUserResults([]);
        return;
    }
    setIsSearching(true);
    try {
        const results = await searchJiraUsers(q);
        setUserResults(results);
    } catch (err) {
        console.error(err);
    } finally {
        setIsSearching(false);
    }
  };

  const selectUser = (u: any) => {
      setSelectedUser(u);
      setUserQuery(u.displayName);
      setUserResults([]); // Hide dropdown
  };

  const handleEditSearch = async (q: string) => {
    setEditQuery(q);
    if (q.length < 2) {
        setEditResults([]);
        return;
    }
    try {
        const results = await searchJiraUsers(q);
        setEditResults(results);
    } catch (err) {
        console.error(err);
    }
  };

  const updateUser = (id: string, user: any) => {
      const updated = stakeholders.map(s => s.id === id ? { ...s, user } : s);
      saveStakeholders(updated);
      setEditingId(null);
      setEditQuery('');
      setEditResults([]);
  };
  
  const startEditing = (s: Stakeholder) => {
      setEditingId(s.id);
      setEditQuery(''); // Start clean? Or prepopulate? Clean is probably better for search.
      setEditResults([]);
  };

  const handleAdd = () => {
      if (!role) return;

      const newStakeholder: Stakeholder = {
          id: Date.now().toString(),
          role,
          user: selectedUser
      };

      saveStakeholders([...stakeholders, newStakeholder]);
      
      // Reset form
      setRole('');
      setUserQuery('');
      setSelectedUser(null);
      setIsAdding(false);
  };

  const handleDelete = (id: string) => {
      if (confirm('Remove this stakeholder?')) {
          saveStakeholders(stakeholders.filter(s => s.id !== id));
      }
  };

  return (
    <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, color: '#172b4d', fontSize: '1.1rem' }}>Stakeholders</h3>
            {!isAdding && (
                <button 
                    onClick={() => setIsAdding(true)}
                    style={{ fontSize: '0.85rem', color: '#0052cc', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
                >
                    + Add
                </button>
            )}
        </div>

        {/* List of Stakeholders */}
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {stakeholders.map(s => (
                <div key={s.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '120px', position: 'relative' }}>
                     <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#172b4d' }}>
                        {s.role}
                        <span 
                            onClick={() => handleDelete(s.id)}
                            style={{ marginLeft: 8, cursor: 'pointer', color: '#de350b', opacity: 0.5, fontSize: '0.8em' }}
                            title="Remove"
                        >
                            ×
                        </span>
                     </div>
                     
                     {/* User Display or Edit Input */}
                     {editingId === s.id ? (
                        <div style={{ position: 'relative' }}>
                             <input 
                                autoFocus
                                value={editQuery}
                                onChange={e => handleEditSearch(e.target.value)}
                                onBlur={() => setTimeout(() => { if(editingId === s.id) setEditingId(null) }, 200)} // Delay to allow click
                                placeholder="Search user..."
                                style={{ width: '100%', padding: '4px', fontSize: '0.85rem', borderRadius: 4, border: '1px solid #0052cc' }}
                             />
                             {editResults.length > 0 && (
                                <div style={{ 
                                    position: 'absolute', top: '100%', left: 0, minWidth: '200px',
                                    background: 'white', border: '1px solid #dfe1e6', borderRadius: 4, 
                                    maxHeight: '150px', overflowY: 'auto', zIndex: 20, boxShadow: '0 4px 8px rgba(0,0,0,0.1)' 
                                }}>
                                     {editResults.map(u => (
                                         <div 
                                            key={u.accountId}
                                            onMouseDown={(e) => { e.preventDefault(); updateUser(s.id, u); }} // use onMouseDown to fire before blur
                                            style={{ padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #eee' }}
                                         >
                                             <img src={u.avatarUrl} style={{ width: 20, height: 20, borderRadius: '50%' }} />
                                             <span style={{ fontSize: '0.85rem' }}>{u.displayName}</span>
                                         </div>
                                     ))}
                                </div>
                             )}
                        </div>
                     ) : (
                         <div 
                            onClick={() => startEditing(s)}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '4px 0', borderBottom: '1px solid transparent', transition: 'border-color 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = '#dfe1e6'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
                            title="Click to assign user"
                         >
                            {s.user ? (
                                <>
                                    {s.user.avatarUrl ? (
                                        <img src={s.user.avatarUrl} alt="" style={{ width: 24, height: 24, borderRadius: '50%' }} />
                                    ) : (
                                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#6554C0', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>
                                            {s.user.displayName.charAt(0)}
                                        </div>
                                    )}
                                    <span style={{ fontSize: '0.9rem', color: '#42526e' }}>{s.user.displayName}</span>
                                </>
                            ) : (
                                <span style={{ fontSize: '0.9rem', color: '#6b778c', fontStyle: 'italic', borderBottom: '1px dashed #ccc' }}>
                                    Select User...
                                </span>
                            )}
                         </div>
                     )}
                </div>
            ))}
        </div>

        {/* Add Form */}
        {isAdding && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: '#f4f5f7', borderRadius: 8, maxWidth: '400px' }}>
                <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>Role</label>
                    <input 
                        value={role}
                        onChange={e => setRole(e.target.value)}
                        placeholder="e.g. Solution Lead"
                        style={{ width: '100%', padding: '8px', borderRadius: 4, border: '1px solid #dfe1e6' }}
                    />
                </div>
                <div style={{ marginBottom: '10px', position: 'relative' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>User (Optional)</label>
                    <input 
                        value={userQuery}
                        onChange={e => handleSearch(e.target.value)}
                        placeholder="Search Jira User..."
                        style={{ width: '100%', padding: '8px', borderRadius: 4, border: '1px solid #dfe1e6' }}
                    />
                    {/* Results Dropdown */}
                    {userResults.length > 0 && (
                        <div style={{ 
                            position: 'absolute', top: '100%', left: 0, right: 0, 
                            background: 'white', border: '1px solid #dfe1e6', borderRadius: 4, 
                            maxHeight: '200px', overflowY: 'auto', zIndex: 10, boxShadow: '0 4px 8px rgba(0,0,0,0.1)' 
                        }}>
                             {userResults.map(u => (
                                 <div 
                                    key={u.accountId}
                                    onClick={() => selectUser(u)}
                                    style={{ padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #eee' }}
                                 >
                                     <img src={u.avatarUrl} style={{ width: 20, height: 20, borderRadius: '50%' }} />
                                     <span>{u.displayName}</span>
                                 </div>
                             ))}
                        </div>
                    )}
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
                        disabled={!role}
                        style={{ padding: '6px 12px', borderRadius: 4, border: 'none', background: '#0052cc', color: 'white', cursor: 'pointer', opacity: !role ? 0.5 : 1 }}
                    >
                        Add
                    </button>
                </div>
            </div>
        )}
    </div>
  );
}
