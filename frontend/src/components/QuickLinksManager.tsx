'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { searchIssues, SearchResult } from '@/actions/search';
import { getLinks, saveLinks as apiSaveLinks } from '@/lib/api';

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

  // Search Modal State
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [pendingLink, setPendingLink] = useState<QuickLink | null>(null);
  const [jiraBaseUrl, setJiraBaseUrl] = useState('');
  const [hasCheckedAutoOpen, setHasCheckedAutoOpen] = useState(false);

  useEffect(() => {
    async function load() {
        try {
            const saved = await getLinks(projectKey);
            if (saved && saved.length > 0) {
                setLinks(saved);
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
        } catch (e) {
            console.error("Failed to load links", e);
        }
    }
    load();
  }, [projectKey]);

  const saveLinks = async (newList: QuickLink[]) => {
    setLinks(newList);
    try {
        await apiSaveLinks(projectKey, newList);
    } catch (e) {
        console.error("Failed to save links", e);
    }
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

  const handleLinkClick = (e: React.MouseEvent, link: QuickLink) => {
      if (isEditing) return;

      const isPMI = link.name.trim().toLowerCase() === 'pmi';
      const isEmpty = !link.url || link.url === '#' || link.url.trim() === '';

      if (isPMI && isEmpty) {
          e.preventDefault();
          setPendingLink(link);
          setShowSearchModal(true);
          // Initial search, forcing Epic type and PMI project since state update is async
          performSearch('', 'Epic', 'PMI 2.0');
      }
  };

  const performSearch = async (q: string, explicitType?: string, explicitProject?: string) => {
      setLoadingSearch(true);
      
      let type = explicitType;
      let targetProject = explicitProject || projectKey;

      // If relying on state (subsequent searches)
      if (!explicitProject && pendingLink?.name.trim().toLowerCase() === 'pmi') {
          targetProject = 'PMI 2.0';
          if (!type) type = 'Epic';
      }

      const res = await searchIssues(q, targetProject, type);
      setSearchResults(res.issues);
      if (res.baseUrl) setJiraBaseUrl(res.baseUrl);
      setLoadingSearch(false);
  };

  // Auto-open if PMI is missing
  useEffect(() => {
    if (links.length > 0 && !hasCheckedAutoOpen) {
        const pmi = links.find(l => l.name.trim().toLowerCase() === 'pmi');
        // If PMI exists and is empty
        if (pmi && (!pmi.url || pmi.url === '#' || pmi.url.trim() === '')) {
             setPendingLink(pmi);
             setShowSearchModal(true);
             performSearch('', 'Epic', 'PMI 2.0');
        }
        setHasCheckedAutoOpen(true);
    }
  }, [links, hasCheckedAutoOpen]);

  const handleIssueSelect = (issue: SearchResult) => {
      if (!pendingLink) return;
      
      const newUrl = jiraBaseUrl ? `${jiraBaseUrl}/browse/${issue.key}` : `https://jira.example.com/browse/${issue.key}`; // Fallback if no base url found (unlikely if credentials work)
      
      const newList = links.map(l => l.id === pendingLink.id ? { ...l, url: newUrl } : l);
      saveLinks(newList);
      
      setShowSearchModal(false);
      setPendingLink(null);
      setSearchQuery('');
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
                                        onClick={(e) => handleLinkClick(e, link)}
                                        style={{ 
                                            textDecoration: isConfigured ? 'underline' : 'none', 
                                            color: isConfigured ? '#0052cc' : '#172b4d', 
                                            fontSize: '0.9rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            flex: 1,
                                            cursor: 'pointer'
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

        {/* Search Modal */}
        {showSearchModal && (
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.5)', zIndex: 1000,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                <div style={{ background: 'white', padding: 20, borderRadius: 8, width: 400, maxWidth: '90%', maxHeight: '80vh', overflowY: 'auto' }}>
                    <h3 style={{ marginTop: 0 }}>Select PMI Ticket</h3>
                    <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: 15 }}>
                        Search for the Jira issue corresponding to PMI for this project.
                    </p>
                    
                    <div style={{ display: 'flex', gap: 10, marginBottom: 15 }}>
                        <input 
                            type="text" 
                            placeholder="Search by text..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && performSearch(searchQuery)}
                            style={{ flex: 1, padding: '8px', borderRadius: 4, border: '1px solid #dfe1e6' }}
                        />
                        <button 
                            onClick={() => performSearch(searchQuery)}
                            disabled={loadingSearch}
                            style={{ padding: '8px 16px', background: '#0052cc', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                        >
                            {loadingSearch ? '...' : 'Search'}
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                        {searchResults.map(issue => (
                            <div 
                                key={issue.key}
                                onClick={() => handleIssueSelect(issue)}
                                style={{ 
                                    padding: '8px', 
                                    border: '1px solid #eee', 
                                    borderRadius: 4, 
                                    cursor: 'pointer',
                                    background: '#fafbfc',
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = '#ebecf0'}
                                onMouseOut={(e) => e.currentTarget.style.background = '#fafbfc'}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontWeight: 600, color: '#0052cc' }}>{issue.key}</span>
                                    <span style={{ fontSize: '0.8rem', background: '#dfe1e6', padding: '2px 4px', borderRadius: 3 }}>{issue.status}</span>
                                </div>
                                <div style={{ fontSize: '0.9rem', color: '#172b4d', marginTop: 4 }}>
                                    {issue.summary}
                                </div>
                            </div>
                        ))}
                        {!loadingSearch && searchResults.length === 0 && (
                            <div style={{ textAlign: 'center', color: '#666', fontStyle: 'italic', padding: 10 }}>
                                No issues found.
                            </div>
                        )}
                    </div>

                    <div style={{ marginTop: 20, textAlign: 'right' }}>
                        <button onClick={() => setShowSearchModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5e6c84' }}>Cancel</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}
