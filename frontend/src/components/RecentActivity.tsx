'use client';

import { useState, useEffect } from 'react';
import { getProjectRecentActivity, ActivityItem } from '@/actions/activity';
import { getProjectUsers } from '@/actions/users';

function formatTimeAgo(isoString: string) {
    const date = new Date(isoString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getDayLabel(isoString: string) {
    const date = new Date(isoString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (d.getTime() === today.getTime()) return 'Today';
    if (d.getTime() === yesterday.getTime()) return 'Yesterday';
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function RecentActivity({ 
    projectKey, 
    baseUrl = '', 
    forcedUsername, 
    forcedIssueKey 
}: { 
    projectKey: string, 
    baseUrl?: string,
    forcedUsername?: string,
    forcedIssueKey?: string
}) {
    const [isOpen, setIsOpen] = useState(!!(forcedUsername || forcedIssueKey)); // Auto-open if forced
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [projectUsers, setProjectUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(false);
    
    // State separation: 
    // searchQuery drives the input box and avatar list filtering.
    // activeUser drives the actual API fetch and is the "selected" state.
    const [searchQuery, setSearchQuery] = useState(forcedUsername || '');
    const [activeUser, setActiveUser] = useState(forcedUsername || '');
    const [hasLoaded, setHasLoaded] = useState(false);

    const loadData = async (userFilter?: string) => {
        setLoading(true);
        try {
            // If userFilter is passed, use it. Otherwise use activeUser (which might be empty for 'All')
            const targetUser = userFilter !== undefined ? userFilter : activeUser;
            // Pass forcedIssueKey if present
            const data = await getProjectRecentActivity(projectKey, targetUser, forcedIssueKey);
            setActivities(data);
            setHasLoaded(true);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };
    
    const loadUsers = async () => {
        if (projectUsers.length > 0) return;
        setLoadingUsers(true);
        try {
            const users = await getProjectUsers(projectKey);
            setProjectUsers(users);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingUsers(false);
        }
    };

    // Auto-load on first expand if not loaded
    useEffect(() => {
        if (isOpen && !hasLoaded && !loading) {
            loadData(activeUser);
            if (!forcedUsername) {
                loadUsers();
            }
        }
    }, [isOpen]);

    const handleFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Set active user to the input query
        setActiveUser(searchQuery);
        loadData(searchQuery);
    };
    
    const handleUserClick = (name: string) => {
        if (activeUser === name) {
            // Deselect
            setSearchQuery('');
            setActiveUser('');
            loadData('');
        } else {
            // Select
            setSearchQuery(name);
            setActiveUser(name);
            loadData(name);
        }
    };

    // Filter Users for the avatar list
    const filteredUsers = projectUsers.filter(u => 
        !searchQuery || u.displayName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Grouping Logic
    const groupedByDay: Record<string, ActivityItem[]> = {};
    const days: string[] = [];

    if (activities) {
        activities.forEach(item => {
            const day = getDayLabel(item.timestamp);
            if (!groupedByDay[day]) {
                groupedByDay[day] = [];
                days.push(day);
            }
            groupedByDay[day].push(item);
        });
    }

    const isForcedMode = !!(forcedUsername || forcedIssueKey);

    return (
        <div style={{ background: 'white', borderRadius: isForcedMode ? 0 : 8, boxShadow: isForcedMode ? 'none' : '0 1px 2px rgba(0,0,0,0.1)', overflow: 'hidden', marginBottom: isForcedMode ? 0 : '2rem' }}>
            {!isForcedMode && (
            <div 
                onClick={() => setIsOpen(!isOpen)}
                style={{ 
                    background: '#0747A6', // Match FilterManager style
                    color: 'white',
                    padding: '10px 16px', 
                    cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontWeight: 600,
                    letterSpacing: '1px'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ textTransform: 'uppercase' }}>Recent Activity</span>
                </div>
                <span style={{ fontSize: '0.8rem' }}>{isOpen ? '▼' : '▶'}</span>
            </div>
            )}

            {isOpen && (
                <div style={{ padding: '16px' }}>
                    
                    {/* User Filter Row - Hide if Forced Mode */}
                    {!isForcedMode && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 20 }}>
                            {/* Text Search */}
                            <form onSubmit={handleFilterSubmit} style={{ display: 'flex', gap: 10, flex: '0 0 250px' }}>
                                <input 
                                    type="text" 
                                    placeholder="Search user..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{ flex: 1, padding: '6px 10px', border: '1px solid #dfe1e6', borderRadius: 4, fontSize: '0.9rem' }}
                                />
                                <button 
                                    type="submit" 
                                    disabled={loading}
                                    style={{ 
                                        padding: '6px 12px', 
                                        background: '#f4f5f7', 
                                        border: '1px solid #dfe1e6', 
                                        borderRadius: 4, 
                                        cursor: loading ? 'default' : 'pointer',
                                        color: loading ? '#aaa' : '#172b4d',
                                        fontWeight: 600
                                    }}
                                >
                                    Filter
                                </button>
                            </form>

                            {/* Avatar List (Dynamic) */}
                            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, flex: 1 }}>
                                {filteredUsers.map(u => {
                                    const isSelected = activeUser === u.displayName;
                                    return (
                                        <div 
                                            key={u.accountId} 
                                            onClick={() => handleUserClick(u.displayName)}
                                            title={u.displayName}
                                            style={{ 
                                                cursor: 'pointer', 
                                                opacity: isSelected ? 1 : (activeUser ? 0.3 : 1), // Fade others if one selected
                                                border: isSelected ? '2px solid #0052cc' : '2px solid transparent',
                                                borderRadius: '50%',
                                                padding: 1,
                                                flexShrink: 0
                                            }}
                                        >
                                            <img 
                                                src={u.avatarUrl} 
                                                alt={u.displayName} 
                                                style={{ width: 32, height: 32, borderRadius: '50%', display: 'block' }} 
                                            />
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {loading && <div style={{ textAlign: 'center', color: '#666', padding: 20 }}>Loading activity...</div>}

                    {!loading && activities.length === 0 && hasLoaded && (
                        <div style={{ textAlign: 'center', color: '#666', padding: 20, fontStyle: 'italic' }}>
                            No recent activity found {activeUser ? `for user "${activeUser}"` : ''} {forcedIssueKey ? `on issue ${forcedIssueKey}` : ''} in the last 14 days.
                        </div>
                    )}

                    {!loading && activities.length > 0 && (
                        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                            {days.map(day => {
                                const dayActivities = groupedByDay[day];
                                
                                return (
                                    <div key={day} style={{ marginTop: 20 }}>
                                    <h4 style={{ 
                                        fontSize: '0.75rem', 
                                        textTransform: 'uppercase', 
                                        color: '#6b778c', 
                                        fontWeight: 700, 
                                        marginBottom: 12,
                                        borderBottom: '1px solid #eee',
                                        paddingBottom: 4
                                    }}>
                                        {day}
                                    </h4>

                                    {/* Conditional Grouping by Ticket if Active User is selected OR Forced Mode */}
                                    {activeUser || isForcedMode ? (
                                        <ActivityByTicketGroup 
                                            activities={dayActivities} 
                                            baseUrl={baseUrl} 
                                        />
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                            {dayActivities.map(item => (
                                                <ActivityItemRow key={item.id} item={item} baseUrl={baseUrl} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Sub-component for standard row
function ActivityItemRow({ item, baseUrl }: { item: ActivityItem, baseUrl: string }) {
    // Derive action text
    let actionText = '';
    let detailNode = null;

    if (item.type === 'create') {
        actionText = 'created issue';
    } else if (item.type === 'comment') {
        actionText = 'commented on';
        detailNode = (
            <div style={{ background: '#f4f5f7', padding: '6px 10px', borderRadius: 4, marginTop: 4, fontStyle: 'italic', color: '#505f79', fontSize: '0.85rem' }}>
                "{item.details?.commentBody?.substring(0, 100)}{item.details?.commentBody && item.details.commentBody.length > 100 ? '...' : ''}"
            </div>
        );
    } else if (item.type === 'history') {
        actionText = `updated ${item.details?.field}`;
        detailNode = (
            <div style={{ fontSize: '0.8rem', color: '#505f79', marginTop: 2 }}>
                <span style={{ textDecoration: 'line-through', color: '#8993a4' }}>{item.details?.fromValue}</span> 
                {' '}➝{' '}
                <span style={{ fontWeight: 500 }}>{item.details?.toValue}</span>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flexShrink: 0 }}>
                {item.user.avatarUrl ? (
                    <img src={item.user.avatarUrl} alt="" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                ) : (
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#dfe1e6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>
                        {item.user.name.substring(0,2)}
                    </div>
                )}
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>
                    <span style={{ fontWeight: 600, color: '#172b4d' }}>{item.user.name}</span>
                    {' '}{actionText}{' '}
                    <a 
                        href={baseUrl ? `${baseUrl}/browse/${item.issue.key}` : '#'} 
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#0052cc', fontWeight: 500, textDecoration: 'none' }}
                    >
                        {item.issue.key}
                    </a>
                    <span style={{ margin: '0 6px', color: '#c1c7d0' }}>•</span>
                    <span style={{ color: '#6b778c', fontSize: '0.85rem' }}>{formatTimeAgo(item.timestamp)}</span>
                </div>
                {detailNode}
            </div>
        </div>
    );
}

// Sub-component for Grouped by Ticket
function ActivityByTicketGroup({ activities, baseUrl }: { activities: ActivityItem[], baseUrl: string }) {
    // Group items by issue key
    const byTicket: Record<string, { summary: string, items: ActivityItem[] }> = {};
    
    activities.forEach(item => {
        if (!byTicket[item.issue.key]) {
            byTicket[item.issue.key] = { summary: item.issue.summary, items: [] };
        }
        byTicket[item.issue.key].items.push(item);
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {Object.entries(byTicket).map(([key, data]) => (
                <div key={key} style={{ border: '1px solid #dfe1e6', borderRadius: 8, padding: 12 }}>
                    {/* Ticket Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, borderBottom: '1px solid #f4f5f7', paddingBottom: 8 }}>
                         <div style={{ background: '#42526e', color: 'white', fontSize: '0.75rem', fontWeight: 700, padding: '2px 6px', borderRadius: 3 }}>
                             {key}
                         </div>
                         <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#172b4d' }}>
                             {data.summary}
                         </div>
                         <a 
                            href={baseUrl ? `${baseUrl}/browse/${key}` : '#'} 
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#0052cc', textDecoration: 'none' }}
                        >
                            Open ↗
                        </a>
                    </div>

                    {/* Activities List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingLeft: 8 }}>
                        {data.items.map(item => {
                            let actionText = '';
                            let detailNode = null;
                            if (item.type === 'create') {
                                actionText = 'Create Issue';
                            } else if (item.type === 'comment') {
                                actionText = 'Commented';
                                detailNode = (
                                    <div style={{ color: '#505f79', fontSize: '0.85rem', fontStyle: 'italic', marginTop: 2 }}>
                                        "{item.details?.commentBody?.substring(0, 80)}..."
                                    </div>
                                );
                            } else if (item.type === 'history') {
                                actionText = `Updated ${item.details?.field}`;
                                detailNode = (
                                    <div style={{ fontSize: '0.8rem', marginTop: 2 }}>
                                        <span style={{ textDecoration: 'line-through', color: '#8993a4' }}>{item.details?.fromValue}</span> 
                                        {' '}➝{' '}
                                        <span style={{ fontWeight: 500, color: '#0052cc' }}>{item.details?.toValue}</span>
                                    </div>
                                );
                            }

                            return (
                                <div key={item.id} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                    <div style={{ width: 60, flexShrink: 0, fontSize: '0.75rem', color: '#6b778c', textAlign: 'right' }}>
                                        {new Date(item.timestamp).toLocaleTimeString([],{hour:'2-digit', minute:'2-digit'})}
                                    </div>
                                    <div style={{ width: 1, height: 24, background: '#dfe1e6' }}></div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.9rem', color: '#172b4d' }}>
                                            <span style={{ fontWeight: 600 }}>{actionText}</span>
                                        </div>
                                        {detailNode}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
