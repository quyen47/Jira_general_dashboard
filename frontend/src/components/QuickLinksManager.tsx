'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface QuickLink {
  id: string;
  name: string;
  url: string;
}

export default function QuickLinksManager({ projectKey }: { projectKey: string }) {
  const [links, setLinks] = useState<QuickLink[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form State for Adding/Editing
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');

  const STORAGE_KEY = `jira_dashboard_links_${projectKey}`;

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setLinks(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load links", e);
      }
    } else {
        // Default Links
        const defaults: QuickLink[] = [
            { id: 'l1', name: 'Jira', url: '#' },
            { id: 'l2', name: 'Confluence', url: '#' },
            { id: 'l3', name: 'TimeSheet', url: '#' },
            { id: 'l4', name: 'Offshore WO', url: '#' },
            { id: 'l5', name: 'Project Overview', url: '#' },
            { id: 'l6', name: 'PMI', url: '#' },
            { id: 'l7', name: 'Quotation', url: '#' },
        ];
        setLinks(defaults);
    }
  }, [projectKey]);

  const saveLinks = (newList: QuickLink[]) => {
    setLinks(newList);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
  };

  const startEdit = (link?: QuickLink) => {
      setEditId(link ? link.id : 'new');
      setName(link ? link.name : '');
      setUrl(link ? link.url : '');
      setIsEditing(true);
  };

  const handleSave = () => {
      if (!name) return;
      
      let newList = [...links];
      if (editId === 'new') {
          newList.push({
              id: Date.now().toString(),
              name,
              url: url || '#'
          });
      } else {
          newList = newList.map(l => l.id === editId ? { ...l, name, url: url || '#' } : l);
      }

      saveLinks(newList);
      setEditId(null);
      setName('');
      setUrl('');
  };

  const handleDelete = (id: string) => {
      if (confirm('Remove this link?')) {
          saveLinks(links.filter(l => l.id !== id));
      }
  };

  return (
    <div style={{ 
        background: 'white', 
        borderRadius: 8, 
        padding: '1rem', 
        border: '1px solid #dfe1e6',
        maxWidth: '300px',
        minWidth: '200px'
    }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#5e6c84', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quick Links</h3>
            <button 
                onClick={() => setIsEditing(!isEditing)}
                style={{ fontSize: '0.8rem', color: '#0052cc', background: 'none', border: 'none', cursor: 'pointer' }}
            >
                {isEditing ? 'Done' : 'Edit'}
            </button>
        </div>

        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {links.map(link => (
                <li key={link.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {editId === link.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                            <input 
                                value={name} 
                                onChange={e => setName(e.target.value)} 
                                placeholder="Name"
                                style={{ padding: '4px', fontSize: '0.85rem', width: '100%' }}
                            />
                            <input 
                                value={url} 
                                onChange={e => setUrl(e.target.value)} 
                                placeholder="URL"
                                style={{ padding: '4px', fontSize: '0.85rem', width: '100%' }}
                            />
                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', marginTop: 4 }}>
                                <button onClick={() => setEditId(null)} style={{ fontSize: '0.75rem' }}>Cancel</button>
                                <button onClick={handleSave} style={{ fontSize: '0.75rem', color: '#0052cc' }}>Save</button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {(() => {
                                const isConfigured = link.url && link.url !== '#';
                                return (
                                    <a 
                                        href={link.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        style={{ 
                                            textDecoration: isConfigured ? 'underline' : 'none', 
                                            color: isConfigured ? '#0052cc' : '#172b4d', 
                                            fontSize: '0.9rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            flex: 1
                                        }}
                                    >
                                        <span style={{ color: '#0052cc', fontSize: '1rem' }}>↗</span>
                                        {link.name}
                                    </a>
                                );
                            })()}
                            {isEditing && (
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <button onClick={() => startEdit(link)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.8rem', color: '#42526e' }}>✏️</button>
                                    <button onClick={() => handleDelete(link.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.8rem', color: '#de350b' }}>×</button>
                                </div>
                            )}
                        </>
                    )}
                </li>
            ))}
        </ul>

        {isEditing && !editId && (
            <button 
                onClick={() => startEdit()}
                style={{ 
                    marginTop: '10px', width: '100%', padding: '6px', 
                    background: '#f4f5f7', border: '1px dashed #dfe1e6', borderRadius: 4,
                    color: '#0052cc', fontSize: '0.85rem', cursor: 'pointer'
                }}
            >
                + Add Link
            </button>
        )}
        
        {/* New Item Form */}
        {editId === 'new' && (
             <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <input 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder="Name"
                    style={{ padding: '4px', fontSize: '0.85rem', width: '100%' }}
                />
                <input 
                    value={url} 
                    onChange={e => setUrl(e.target.value)} 
                    placeholder="URL"
                    style={{ padding: '4px', fontSize: '0.85rem', width: '100%' }}
                />
                <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', marginTop: 4 }}>
                    <button onClick={() => setEditId(null)} style={{ fontSize: '0.75rem' }}>Cancel</button>
                    <button onClick={handleSave} style={{ fontSize: '0.75rem', color: '#0052cc' }}>Add</button>
                </div>
            </div>
        )}
    </div>
  );
}
