'use client';

import { useState, useEffect, useMemo } from 'react';
import { getProjectRecentActivity, ActivityItem } from '@/actions/activity';

interface DailyCheckpointProps {
    projectKey: string;
    baseUrl?: string;
}

interface PriorityIssue {
    issueKey: string;
    summary: string;
    status?: string;
    assignee?: string;
    updated?: string;
    isStale?: boolean;
    driftCount?: number;
    streakDays?: number;
    blockedBy?: { key: string; summary?: string }[];
    blocks?: { key: string; summary?: string }[];
    flags: {
        type: 'blocker' | 'overdue' | 'delayed-start' | 'new' | 'help' | 'stale';
        label: string;
        color: string;
        bgColor: string;
        detail?: string;
    }[];
}

interface UserWork {
    name: string;
    avatarUrl?: string;
    statusGroups: Record<string, Set<string>>;
    hasRisk: boolean;
    activeCount: number;
}

interface CheckpointSummary {
    totalActivities: number;
    priorityIssues: PriorityIssue[];
    teamWork: Record<string, UserWork>;
    handledHistory: { date: string; count: number; items: string[] }[];
}

export default function DailyCheckpoint({ projectKey, baseUrl = '' }: DailyCheckpointProps) {
    const [isOpen, setIsOpen] = useState(true);
    const [summary, setSummary] = useState<CheckpointSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [handledItems, setHandledItems] = useState<Set<string>>(new Set());
    
    const todayStr = useMemo(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }, []);

    const [selectedDate, setSelectedDate] = useState(todayStr);

    const storageKey = `checkpoint-handled-${projectKey}-${selectedDate}`;

    useEffect(() => {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            try {
                setHandledItems(new Set(JSON.parse(stored)));
            } catch (e) {
                setHandledItems(new Set());
            }
        } else {
            setHandledItems(new Set());
        }
    }, [storageKey]);

    const toggleHandled = (issueKey: string) => {
        const next = new Set(handledItems);
        if (next.has(issueKey)) {
            next.delete(issueKey);
        } else {
            next.add(issueKey);
        }
        setHandledItems(next);
        localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
    };

    useEffect(() => {
        const loadCheckpoint = async () => {
            setLoading(true);
            try {
                const dayActivities = await getProjectRecentActivity(projectKey, undefined, undefined, selectedDate);
                
                const checkpoint: CheckpointSummary = {
                    totalActivities: dayActivities.length,
                    priorityIssues: [],
                    teamWork: {},
                    handledHistory: [] // Will populate from localStorage summary
                };

                const issueMap = new Map<string, PriorityIssue>();
                const targetTimestamp = new Date(selectedDate).getTime();
                const twoDaysAgo = targetTimestamp - (2 * 24 * 60 * 60 * 1000);

                dayActivities.forEach(activity => {
                    const issueKey = activity.issue.key;
                    const details = activity.details;
                    const userName = activity.user.name;

                    if (!issueMap.has(issueKey)) {
                        // Advanced metrics analysis
                        const updated = activity.issue.updated ? new Date(activity.issue.updated).getTime() : 0;
                        const isStale = updated > 0 && updated < twoDaysAgo;
                        
                        // Drift & Streak from history
                        let driftCount = 0;
                        let earliestHistory = Date.now();
                        const fullHistory = details?.fullHistory || [];
                        fullHistory.forEach((h: any) => {
                            const hTime = new Date(h.created).getTime();
                            if (hTime < earliestHistory) earliestHistory = hTime;
                            
                            h.items.forEach((item: any) => {
                                if (item.field === 'duedate' || item.field === 'customfield_10015') {
                                    driftCount++;
                                }
                            });
                        });

                        // Blockers from issueLinks
                        const issueLinks = activity.issue.issueLinks || [];
                        const blockedBy = issueLinks
                            .filter((l: any) => l.inwardIssue)
                            .map((l: any) => ({ key: l.inwardIssue.key, summary: l.inwardIssue.fields?.summary }));
                        const blocks = issueLinks
                            .filter((l: any) => l.outwardIssue)
                            .map((l: any) => ({ key: l.outwardIssue.key, summary: l.outwardIssue.fields?.summary }));

                        issueMap.set(issueKey, {
                            issueKey,
                            summary: activity.issue.summary,
                            status: details?.status,
                            assignee: details?.assignee,
                            updated: activity.issue.updated,
                            isStale,
                            driftCount,
                            streakDays: Math.floor((targetTimestamp - earliestHistory) / (1000 * 60 * 60 * 24)),
                            blockedBy,
                            blocks,
                            flags: []
                        });
                    }
                    const pIssue = issueMap.get(issueKey)!;

                    if (pIssue.isStale && !pIssue.flags.some(f => f.type === 'stale')) {
                         pIssue.flags.push({ type: 'stale', label: 'STALE', color: '#42526E', bgColor: '#F4F5F7', detail: 'No activity for >48h' });
                    }

                    if (activity.type === 'comment') {
                        const body = details?.commentBody?.toLowerCase() || '';
                        if (body.includes('block') || body.includes('help') || body.includes('need') || body.includes('urgent')) {
                            const requesterPrefix = body.includes('block') ? 'Mentioned blocker' : 'Requested help';
                            const detail = `${requesterPrefix} by ${userName}`;
                            const existing = pIssue.flags.find(f => f.type === 'help');
                            if (!existing) {
                                pIssue.flags.push({ 
                                    type: 'help', label: 'NEEDS HELP', color: '#DE350B', bgColor: '#FFEBE6',
                                    detail: detail
                                });
                            } else {
                                if (!existing.detail?.includes(userName)) {
                                    existing.detail += `, ${userName}`;
                                }
                            }
                        }
                    }

                    if (activity.type === 'history' && details?.field === 'status') {
                        const toValue = details.toValue?.toLowerCase() || '';
                        if (toValue.includes('blocked') || toValue.includes('impediment')) {
                            if (!pIssue.flags.some(f => f.type === 'blocker')) {
                                pIssue.flags.push({ type: 'blocker', label: 'BLOCKED', color: '#DE350B', bgColor: '#FFEBE6', detail: `Status: ${details.toValue}` });
                            }
                        }
                    }

                    if ((pIssue.blockedBy?.length || 0) > 0 && !pIssue.flags.some(f => f.label === 'BLOCKED BY')) {
                         pIssue.flags.push({ type: 'blocker', label: 'BLOCKED BY', color: '#DE350B', bgColor: '#FFEBE6', detail: `Waiting on ${pIssue.blockedBy!.map(b => b.key).join(', ')}` });
                    }
                    if ((pIssue.blocks?.length || 0) > 0 && !pIssue.flags.some(f => f.label === 'BLOCKS OTHERS')) {
                         pIssue.flags.push({ type: 'blocker', label: 'BLOCKS OTHERS', color: '#DE350B', bgColor: '#FFEBE6', detail: `Blocking ${pIssue.blocks!.map(b => b.key).join(', ')}` });
                    }

                    if (activity.type === 'create') {
                        if (!pIssue.flags.some(f => f.type === 'new')) {
                            pIssue.flags.push({ type: 'new', label: 'NEW', color: '#0052CC', bgColor: '#DEEBFF', detail: 'Created today' });
                        }
                    }

                    if (!checkpoint.teamWork[userName]) {
                        checkpoint.teamWork[userName] = {
                            name: userName,
                            avatarUrl: activity.user.avatarUrl,
                            statusGroups: {},
                            hasRisk: false,
                            activeCount: 0
                        };
                    }
                    
                    const status = (details?.status || 'Unknown').toUpperCase();
                    if (!checkpoint.teamWork[userName].statusGroups[status]) {
                        checkpoint.teamWork[userName].statusGroups[status] = new Set();
                    }
                    if (!checkpoint.teamWork[userName].statusGroups[status].has(issueKey)) {
                        checkpoint.teamWork[userName].statusGroups[status].add(issueKey);
                        if (!status.includes('DONE') && !status.includes('CLOSED')) {
                            checkpoint.teamWork[userName].activeCount++;
                        }
                    }
                });

                // Load Handled History from localStorage (past 7 days)
                const history: CheckpointSummary['handledHistory'] = [];
                for (let i = 1; i <= 7; i++) {
                    const d = new Date(targetTimestamp);
                    d.setDate(d.getDate() - i);
                    const ds = d.toISOString().split('T')[0];
                    const stored = localStorage.getItem(`checkpoint-handled-${projectKey}-${ds}`);
                    if (stored) {
                        const items = JSON.parse(stored);
                        if (items.length > 0) {
                            history.push({ date: ds, count: items.length, items });
                        }
                    }
                }
                checkpoint.handledHistory = history;

                issueMap.forEach((pIssue, key) => {
                    const latestActivity = dayActivities.find(a => a.issue.key === key);
                    const details = latestActivity?.details;
                    
                    if (details) {
                        const dueDate = details.dueDate ? new Date(details.dueDate).getTime() : null;
                        const startDate = details.startDate ? new Date(details.startDate).getTime() : null;
                        const status = details.status?.toLowerCase() || '';
                        const isDone = status.includes('done') || status.includes('complete') || status.includes('closed');

                        if (!isDone) {
                            if (dueDate && dueDate < targetTimestamp) {
                                const days = Math.floor((targetTimestamp - dueDate) / (1000 * 60 * 60 * 24));
                                pIssue.flags.push({ type: 'overdue', label: 'OVERDUE', color: '#BF2600', bgColor: '#FFF7E6', detail: `by ${days}d` });
                            } else if (startDate && startDate < targetTimestamp && (status.includes('to do') || status.includes('backlog') || status.includes('new'))) {
                                const days = Math.floor((targetTimestamp - startDate) / (1000 * 60 * 60 * 24));
                                pIssue.flags.push({ type: 'delayed-start', label: 'DELAYED', color: '#822600', bgColor: '#FFF7E6', detail: `${days}d late to start` });
                            }
                        }
                    }

                    if (pIssue.flags.length > 0) {
                        checkpoint.priorityIssues.push(pIssue);
                        const assignedName = pIssue.assignee;
                        if (assignedName && checkpoint.teamWork[assignedName]) {
                            checkpoint.teamWork[assignedName].hasRisk = true;
                        }
                    }
                });

                setSummary(checkpoint);
            } catch (error) {
                console.error('Failed to load daily checkpoint:', error);
            } finally {
                setLoading(false);
            }
        };

        loadCheckpoint();
    }, [projectKey, selectedDate]);

    const hideComponent = !loading && summary?.totalActivities === 0 && selectedDate === todayStr && !isOpen;
    if (hideComponent) return null;

    const riskIssuesKeys = new Set(summary?.priorityIssues.map(i => i.issueKey) || []);
    const handledCount = summary?.priorityIssues.filter(i => handledItems.has(i.issueKey)).length || 0;

    // Group Priority Issues by PIC
    const groupedPriority = useMemo(() => {
        if (!summary) return {};
        const groups: Record<string, PriorityIssue[]> = {};
        summary.priorityIssues.forEach(issue => {
            const pic = issue.assignee || 'Unassigned';
            if (!groups[pic]) groups[pic] = [];
            groups[pic].push(issue);
        });

        // Sort items within each group: Needs Help first, then by key
        Object.keys(groups).forEach(pic => {
            groups[pic].sort((a, b) => {
                const aHasHelp = a.flags.some(f => f.type === 'help') ? 1 : 0;
                const bHasHelp = b.flags.some(f => f.type === 'help') ? 1 : 0;
                if (aHasHelp !== bHasHelp) return bHasHelp - aHasHelp;
                return a.issueKey.localeCompare(b.issueKey);
            });
        });

        return groups;
    }, [summary]);

    const sortedPics = Object.keys(groupedPriority).sort((a, b) => {
        if (a === 'Unassigned') return 1;
        if (b === 'Unassigned') return -1;
        return a.localeCompare(b);
    });

    return (
        <div style={{ background: 'white', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.1)', marginBottom: '12px', borderLeft: '4px solid #FFAB00' }}>
            <div style={{ background: '#FFF0B3', color: '#172B4D', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600 }}>
                <div onClick={() => setIsOpen(!isOpen)} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <span style={{ textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '0.5px' }}>Daily Checkpoint</span>
                    {!loading && summary && summary.priorityIssues.length > 0 && (
                        <span style={{ background: handledCount === summary.priorityIssues.length ? '#36B37E' : '#DE350B', color: 'white', fontSize: '0.75rem', padding: '2px 10px', borderRadius: '12px', fontWeight: 800 }}>
                            {handledCount}/{summary.priorityIssues.length} HANDLED
                        </span>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.6)', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} max={todayStr} 
                            style={{ border: 'none', background: 'transparent', fontSize: '0.85rem', fontWeight: 700, outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }} 
                        />
                    </div>
                    <span onClick={() => setIsOpen(!isOpen)} style={{ fontSize: '1rem', cursor: 'pointer', color: '#6B778C' }}>{isOpen ? '▼' : '▶'}</span>
                </div>
            </div>

            {isOpen && (
                <div style={{ padding: '20px' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', color: '#666', padding: '30px' }}>Analyzing project activity...</div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 1fr) 350px', gap: '30px' }}>
                            
                            <div>
                                <SectionHeader title="Priority Items" desc="Grouped by PIC • Needs help items first" icon="🌟" />
                                {summary?.priorityIssues.length === 0 ? (
                                    <EmptyMessage msg="All clear! No urgent issues or risks found for this day." />
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {sortedPics.map((pic) => (
                                            <div key={pic} style={{ marginBottom: '4px' }}>
                                                <div style={{ fontSize: '0.6rem', color: '#6B778C', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    {pic}
                                                    <div style={{ height: '1px', background: '#DFE1E6', flex: 1 }}></div>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {groupedPriority[pic].map((issue, i) => (
                                                        <PriorityCard 
                                                            key={i} 
                                                            issue={issue} 
                                                            baseUrl={baseUrl} 
                                                            isHandled={handledItems.has(issue.issueKey)}
                                                            onToggle={() => toggleHandled(issue.issueKey)}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div>
                                <SectionHeader title="Team Activity" desc="Who was active on which tickets (Grouped by status)" icon="👥" />
                                {Object.keys(summary?.teamWork || {}).length === 0 ? (
                                    <EmptyMessage msg="No member activity recorded on this day." />
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        {Object.values(summary!.teamWork).map((user, i) => (
                                            <UserWorkItem key={i} user={user} baseUrl={baseUrl} riskKeys={riskIssuesKeys} handledItems={handledItems} />
                                        ))}
                                    </div>
                                )}
                            </div>

                        </div>
                    )}

                    {!loading && summary && summary.handledHistory.length > 0 && (
                        <HandledHistorySection history={summary.handledHistory} baseUrl={baseUrl} />
                    )}
                </div>
            )}
        </div>
    );
}

function HandledHistorySection({ history, baseUrl }: { history: CheckpointSummary['handledHistory'], baseUrl: string }) {
    const [isExpanded, setIsExpanded] = useState(false);
    return (
        <div style={{ marginTop: '24px', borderTop: '1px solid #DFE1E6', paddingTop: '16px' }}>
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                style={{ background: 'none', border: 'none', color: '#0052CC', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '6px' }}
            >
                {isExpanded ? '▼' : '▶'} SHOW RECENTLY HANDLED ({history.length} DAYS)
            </button>
            {isExpanded && (
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {history.map((h, i) => (
                        <div key={i} style={{ fontSize: '0.75rem', color: '#6B778C', display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, width: '80px' }}>{h.date}</span>
                            <span style={{ background: '#E3FCEF', color: '#006644', padding: '1px 6px', borderRadius: '10px', fontSize: '10px' }}>{h.count} FIXED</span>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {h.items.map(key => (
                                    <a key={key} href={`${baseUrl}/browse/${key}`} target="_blank" style={{ color: '#0052CC', textDecoration: 'none' }}>{key}</a>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function SectionHeader({ title, desc, icon }: { title: string, desc: string, icon: string }) {
    return (
        <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.1rem' }}>{icon}</span>
                <h4 style={{ fontSize: '0.85rem', color: '#172B4D', textTransform: 'uppercase', fontWeight: 800, margin: 0 }}>{title}</h4>
            </div>
            <p style={{ margin: '2px 0 0 28px', fontSize: '0.75rem', color: '#6B778C' }}>{desc}</p>
        </div>
    );
}

function EmptyMessage({ msg }: { msg: string }) {
    return (
        <div style={{ padding: '16px', textAlign: 'center', background: '#F4F5F7', borderRadius: '8px', border: '1px dashed #DFE1E6' }}>
            <p style={{ color: '#00875A', fontSize: '0.8rem', fontWeight: 500, margin: 0 }}>{msg}</p>
        </div>
    );
}

const tooltipStyles = `
    .instant-tooltip {
        position: relative;
        cursor: help;
    }
    .instant-tooltip::after {
        content: attr(data-tooltip);
        position: absolute;
        bottom: 120%;
        left: 50%;
        transform: translateX(-50%);
        background: #172B4D;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.7rem;
        white-space: nowrap;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.1s;
        z-index: 100;
        pointer-events: none;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }
    .instant-tooltip:hover::after {
        opacity: 1;
        visibility: visible;
    }
`;

function PriorityCard({ issue, baseUrl, isHandled, onToggle }: { issue: PriorityIssue, baseUrl: string, isHandled: boolean, onToggle: () => void }) {
    return (
        <>
        <style>{tooltipStyles}</style>
        <div style={{ 
            background: isHandled ? '#FAFBFC' : '#FFFFFF', 
            border: `1px solid ${isHandled ? '#DFE1E6' : '#DFE1E6'}`, 
            borderRadius: '10px', 
            padding: '8px 12px', 
            boxShadow: isHandled ? 'none' : '0 1px 3px rgba(0,0,0,0.05)', 
            opacity: isHandled ? 0.6 : 1,
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-start',
            transition: 'all 0.2s'
        }}>
            <div 
                onClick={onToggle}
                style={{ 
                    marginTop: '2px',
                    width: '18px', height: '18px', borderRadius: '4px', 
                    border: `2px solid ${isHandled ? '#36B37E' : '#DFE1E6'}`,
                    background: isHandled ? '#36B37E' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', flexShrink: 0
                }}
            >
                {isHandled && <span style={{ color: 'white', fontSize: '10px' }}>✓</span>}
            </div>
            
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {issue.flags.map((flag, idx) => (
                            <span key={idx} className="instant-tooltip" data-tooltip={flag.detail} style={{ background: flag.bgColor, color: flag.color, fontSize: '0.6rem', fontWeight: 800, padding: '1px 6px', borderRadius: '4px', border: `1px solid ${flag.color}40`, letterSpacing: '0.3px', textDecoration: isHandled ? 'line-through' : 'none' }}>
                                {flag.label} {flag.type === 'overdue' || flag.type === 'delayed-start' ? flag.detail : ''}
                            </span>
                        ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                         {!isHandled && (
                             <div style={{ display: 'flex', gap: '4px' }}>
                                 {issue.isStale && <span className="instant-tooltip" data-tooltip="Stale: No activity for >48h" style={{ fontSize: '13px' }}>🧊</span>}
                                 {(issue.driftCount || 0) > 1 && <span className="instant-tooltip" data-tooltip={`Timeline Drift: ${issue.driftCount} date changes detected`} style={{ fontSize: '13px' }}>📈</span>}
                                 {(issue.streakDays || 0) > 3 && <span className="instant-tooltip" data-tooltip={`Survival Streak: ${issue.streakDays} days in focus`} style={{ fontSize: '13px' }}>🔥</span>}
                             </div>
                         )}
                        {issue.status && (
                            <div style={{ fontSize: '0.6rem', background: '#EBECF0', color: '#42526E', padding: '1px 4px', borderRadius: '3px', fontWeight: 700, textTransform: 'uppercase' }}>
                                {issue.status}
                            </div>
                        )}
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <a href={`${baseUrl}/browse/${issue.issueKey}`} target="_blank" style={{ color: '#0052CC', fontWeight: 800, fontSize: '0.8rem', textDecoration: isHandled ? 'line-through' : 'none', borderBottom: '1px solid transparent' }}>
                        {issue.issueKey}
                    </a>
                    <span style={{ fontSize: '0.85rem', color: '#172B4D', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: isHandled ? 'line-through' : 'none' }}>
                        {issue.summary}
                    </span>
                </div>
            </div>
        </div>
        </>
    );
}

function UserWorkItem({ user, baseUrl, riskKeys, handledItems }: { user: UserWork, baseUrl: string, riskKeys: Set<string>, handledItems: Set<string> }) {
    const activeRiskKeys = Array.from(Object.values(user.statusGroups)).flatMap(set => Array.from(set)).filter(k => riskKeys.has(k) && !handledItems.has(k));
    const hasUncheckedRisk = activeRiskKeys.length > 0;

    // Heatmap color logic
    const heatmapColor = user.activeCount > 5 ? '#DE350B' : user.activeCount > 3 ? '#FFAB00' : '#36B37E';

    return (
        <div style={{ display: 'flex', gap: '10px', padding: '8px 12px', background: hasUncheckedRisk ? '#FFFAE6' : '#FAFBFC', border: `1px solid ${hasUncheckedRisk ? '#FFE380' : '#DFE1E6'}`, borderRadius: '10px', alignItems: 'flex-start' }}>
            <div style={{ position: 'relative' }}>
                {user.avatarUrl ? (
                    <img src={user.avatarUrl} style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
                ) : (
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#0052CC', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
                        {user.name.substring(0, 2).toUpperCase()}
                    </div>
                )}
                <div title={`Workload Heatmap: ${user.activeCount} active items`} style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderRadius: '50%', border: '1px solid white', background: heatmapColor }} />
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#172B4D' }}>{user.name}</span>
                    {hasUncheckedRisk && <span className="instant-tooltip" data-tooltip="Responsible for pending priority items" style={{ color: '#BF2600', fontSize: '0.9rem' }}>⚠️</span>}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {Object.entries(user.statusGroups).sort(([a], [b]) => a.localeCompare(b)).map(([status, tickets]) => (
                        <div key={status}>
                            <div style={{ fontSize: '0.6rem', color: '#6B778C', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px', letterSpacing: '0.3px' }}>
                                {status}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {Array.from(tickets).map((key) => {
                                    const isRisk = riskKeys.has(key);
                                    const isHandled = handledItems.has(key);
                                    return (
                                        <a key={key} href={`${baseUrl}/browse/${key}`} target="_blank" 
                                            style={{ 
                                                fontSize: '0.65rem', 
                                                background: isHandled ? '#F4F5F7' : (isRisk ? '#FFEBE6' : '#EBECF0'), 
                                                color: isHandled ? '#6B778C' : (isRisk ? '#BF2600' : '#42526E'), 
                                                padding: '1px 6px', 
                                                borderRadius: '6px', 
                                                textDecoration: isHandled ? 'line-through' : 'none', 
                                                fontWeight: (isRisk && !isHandled) ? 700 : 500,
                                                border: `1px solid ${isHandled ? '#EBECF0' : (isRisk ? '#FFBDAD' : '#DFE1E6')}`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                opacity: isHandled ? 0.6 : 1
                                            }}>
                                            {key} {(isRisk && !isHandled) && <span style={{ fontSize: '0.7rem', lineHeight: 1 }}>•</span>}
                                        </a>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
