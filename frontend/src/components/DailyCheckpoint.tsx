'use client';

import { useState, useEffect, useMemo } from 'react';
import { getProjectRecentActivity, ActivityItem } from '@/actions/activity';

interface DailyCheckpointProps {
    projectKey: string;
    baseUrl?: string;
}

interface ScheduleRisk {
    issueKey: string;
    summary: string;
    type: 'overdue' | 'delayed-start';
    days: number;
}

interface UserWork {
    name: string;
    avatarUrl?: string;
    tickets: Set<string>;
    needsHelp: boolean;
}

interface CheckpointSummary {
    totalActivities: number;
    commentsCount: number;
    updatesCount: number;
    creationsCount: number;
    actionItems: {
        issueKey: string;
        summary: string;
        reason: string;
        type: 'blocker' | 'update' | 'new';
        assignee?: string;
    }[];
    scheduleRisks: ScheduleRisk[];
    teamWork: Record<string, UserWork>;
}

export default function DailyCheckpoint({ projectKey, baseUrl = '' }: DailyCheckpointProps) {
    const [isOpen, setIsOpen] = useState(true);
    const [summary, setSummary] = useState<CheckpointSummary | null>(null);
    const [loading, setLoading] = useState(true);
    
    const todayStr = useMemo(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }, []);

    const [selectedDate, setSelectedDate] = useState(todayStr);

    useEffect(() => {
        const loadCheckpoint = async () => {
            setLoading(true);
            try {
                const dayActivities = await getProjectRecentActivity(projectKey, undefined, undefined, selectedDate);
                
                const checkpoint: CheckpointSummary = {
                    totalActivities: dayActivities.length,
                    commentsCount: dayActivities.filter(a => a.type === 'comment').length,
                    updatesCount: dayActivities.filter(a => a.type === 'history').length,
                    creationsCount: dayActivities.filter(a => a.type === 'create').length,
                    actionItems: [],
                    scheduleRisks: [],
                    teamWork: {}
                };

                const seenIssues = new Set<string>();
                const riskIssues = new Set<string>();
                const targetTimestamp = new Date(selectedDate).getTime();

                dayActivities.forEach(activity => {
                    const issueKey = activity.issue.key;
                    const details = activity.details;

                    // 1. Team Work Summary
                    const userName = activity.user.name;
                    if (!checkpoint.teamWork[userName]) {
                        checkpoint.teamWork[userName] = {
                            name: userName,
                            avatarUrl: activity.user.avatarUrl,
                            tickets: new Set(),
                            needsHelp: false
                        };
                    }
                    checkpoint.teamWork[userName].tickets.add(issueKey);

                    // 2. Action Items & Needs Help Detection
                    if (!seenIssues.has(issueKey)) {
                        if (activity.type === 'comment') {
                            const body = details?.commentBody?.toLowerCase() || '';
                            if (body.includes('block') || body.includes('help') || body.includes('need') || body.includes('urgent')) {
                                checkpoint.actionItems.push({
                                    issueKey,
                                    summary: activity.issue.summary,
                                    reason: `Needs assistance: "${body.includes('block') ? 'blocker' : 'help/need'}" in comment`,
                                    type: 'blocker',
                                    assignee: details?.assignee
                                });
                                checkpoint.teamWork[userName].needsHelp = true;
                                seenIssues.add(issueKey);
                            }
                        }

                        if (activity.type === 'history' && details?.field === 'status') {
                            const toValue = details.toValue?.toLowerCase() || '';
                            if (toValue.includes('blocked') || toValue.includes('impediment')) {
                                checkpoint.actionItems.push({
                                    issueKey,
                                    summary: activity.issue.summary,
                                    reason: `Status changed to ${details.toValue}`,
                                    type: 'blocker',
                                    assignee: details?.assignee
                                });
                                seenIssues.add(issueKey);
                            }
                        }

                        if (activity.type === 'create') {
                            checkpoint.actionItems.push({
                                issueKey,
                                summary: activity.issue.summary,
                                reason: 'Created on this day',
                                type: 'new',
                                assignee: details?.assignee
                            });
                            seenIssues.add(issueKey);
                        }
                    }

                    // 3. Schedule Risks (Overdue / Delayed Start)
                    if (!riskIssues.has(issueKey)) {
                        const dueDate = details?.dueDate ? new Date(details.dueDate).getTime() : null;
                        const startDate = details?.startDate ? new Date(details.startDate).getTime() : null;
                        const status = details?.status?.toLowerCase() || '';
                        const isDone = status.includes('done') || status.includes('complete') || status.includes('closed');

                        if (!isDone) {
                            // Overdue Check
                            if (dueDate && dueDate < targetTimestamp) {
                                const days = Math.floor((targetTimestamp - dueDate) / (1000 * 60 * 60 * 24));
                                checkpoint.scheduleRisks.push({
                                    issueKey,
                                    summary: activity.issue.summary,
                                    type: 'overdue',
                                    days
                                });
                                riskIssues.add(issueKey);
                            }
                            // Delayed Start Check (If still "To Do" but start date has passed)
                            else if (startDate && startDate < targetTimestamp && (status.includes('to do') || status.includes('backlog') || status.includes('new'))) {
                                const days = Math.floor((targetTimestamp - startDate) / (1000 * 60 * 60 * 24));
                                checkpoint.scheduleRisks.push({
                                    issueKey,
                                    summary: activity.issue.summary,
                                    type: 'delayed-start',
                                    days
                                });
                                riskIssues.add(issueKey);
                            }
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

    return (
        <div style={{ background: 'white', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.1)', overflow: 'hidden', marginBottom: '12px', borderLeft: '4px solid #FFAB00' }}>
            {/* Header */}
            <div style={{ background: '#FFF0B3', color: '#172B4D', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600 }}>
                <div onClick={() => setIsOpen(!isOpen)} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <span style={{ textTransform: 'uppercase', fontSize: '0.85rem' }}>Daily Checkpoint</span>
                    {!loading && (summary?.actionItems.length! > 0 || summary?.scheduleRisks.length! > 0) && (
                        <span style={{ background: '#DE350B', color: 'white', fontSize: '0.7rem', padding: '1px 8px', borderRadius: '10px', marginLeft: '4px' }}>
                            {(summary?.actionItems.length || 0) + (summary?.scheduleRisks.length || 0)} ISSUES
                        </span>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.5)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(0,0,0,0.1)' }}>
                        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} max={todayStr} 
                            style={{ border: 'none', background: 'transparent', fontSize: '0.8rem', fontWeight: 700, outline: 'none', cursor: 'pointer' }} 
                        />
                    </div>
                    <span onClick={() => setIsOpen(!isOpen)} style={{ fontSize: '0.8rem', cursor: 'pointer' }}>{isOpen ? '▼' : '▶'}</span>
                </div>
            </div>

            {isOpen && (
                <div style={{ padding: '16px' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>Analyzing project health...</div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            
                            {/* Left Column: Action Items & Schedule Risks */}
                            <div>
                                {/* Action Items */}
                                <CheckpointSection title="Needs Attention" icon="⚠️">
                                    {summary?.actionItems.length === 0 ? (
                                        <EmptyMsg msg="No urgent items from activity." />
                                    ) : (
                                        summary?.actionItems.map((item, i) => (
                                            <ActionItemRow key={i} item={item} baseUrl={baseUrl} />
                                        ))
                                    )}
                                </CheckpointSection>

                                {/* Schedule Risks */}
                                <CheckpointSection title="Schedule Risks" icon="⏰" style={{ marginTop: '24px' }}>
                                    {summary?.scheduleRisks.length === 0 ? (
                                        <EmptyMsg msg="No overdue or delayed starts." />
                                    ) : (
                                        summary?.scheduleRisks.map((risk, i) => (
                                            <RiskRow key={i} risk={risk} baseUrl={baseUrl} />
                                        ))
                                    )}
                                </CheckpointSection>
                            </div>

                            {/* Right Column: Team Work */}
                            <div>
                                <CheckpointSection title="Team Output" icon="👥">
                                    {Object.keys(summary?.teamWork || {}).length === 0 ? (
                                        <EmptyMsg msg="No team activity recorded." />
                                    ) : (
                                        Object.values(summary!.teamWork).map((user, i) => (
                                            <UserWorkRow key={i} user={user} baseUrl={baseUrl} />
                                        ))
                                    )}
                                </CheckpointSection>
                            </div>

                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// UI Components
function CheckpointSection({ title, icon, children, style }: any) {
    return (
        <div style={style}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ fontSize: '1rem' }}>{icon}</span>
                <h4 style={{ fontSize: '0.8rem', color: '#6B778C', textTransform: 'uppercase', fontWeight: 700, margin: 0 }}>{title}</h4>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>{children}</div>
        </div>
    );
}

function EmptyMsg({ msg }: { msg: string }) {
    return <p style={{ color: '#00875A', fontSize: '0.85rem', fontStyle: 'italic', margin: 0 }}>{msg}</p>;
}

function ActionItemRow({ item, baseUrl }: any) {
    return (
        <div style={{ padding: '8px 12px', background: item.type === 'blocker' ? '#FFEBE6' : '#FAFBFC', border: '1px solid #DFE1E6', borderRadius: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <a href={`${baseUrl}/browse/${item.issueKey}`} target="_blank" style={{ color: '#0052CC', fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none' }}>{item.issueKey}</a>
                {item.assignee && <span style={{ fontSize: '0.7rem', background: '#DFE1E6', padding: '2px 6px', borderRadius: '4px' }}>PIC: {item.assignee}</span>}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#172B4D', fontWeight: 500 }}>{item.summary}</div>
            <div style={{ fontSize: '0.7rem', color: '#DE350B', marginTop: '4px', fontStyle: 'italic' }}>{item.reason}</div>
        </div>
    );
}

function RiskRow({ risk, baseUrl }: any) {
    const isOverdue = risk.type === 'overdue';
    return (
        <div style={{ padding: '8px 12px', background: '#FFF7E6', border: '1px solid #FFD591', borderRadius: '6px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <a href={`${baseUrl}/browse/${risk.issueKey}`} target="_blank" style={{ color: '#0052CC', fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none' }}>{risk.issueKey}</a>
                <span style={{ fontSize: '0.7rem', color: '#BF2600', fontWeight: 700 }}>{isOverdue ? 'OVERDUE' : 'DELAYED START'}</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#172B4D', fontWeight: 500 }}>{risk.summary}</div>
            <div style={{ fontSize: '0.7rem', color: '#822600', marginTop: '4px' }}>
                {isOverdue ? `Expired ${risk.days} days ago` : `Start date delayed by ${risk.days} days`}
            </div>
        </div>
    );
}

function UserWorkRow({ user, baseUrl }: any) {
    return (
        <div style={{ display: 'flex', gap: '12px', padding: '10px', background: '#FAFBFC', border: '1px solid #DFE1E6', borderRadius: '8px', alignItems: 'flex-start' }}>
            {user.avatarUrl ? (
                <img src={user.avatarUrl} style={{ width: 32, height: 32, borderRadius: '50%' }} />
            ) : (
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#0052CC', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>
                    {user.name.substring(0, 2).toUpperCase()}
                </div>
            )}
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{user.name}</span>
                    {user.needsHelp && <span style={{ color: '#DE350B', fontSize: '0.7rem', fontWeight: 800 }}>⚠️ NEEDS HELP</span>}
                </div>
                <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {Array.from(user.tickets).map((key: any) => (
                        <a key={key} href={`${baseUrl}/browse/${key}`} target="_blank" style={{ fontSize: '0.7rem', background: '#EBECF0', color: '#42526E', padding: '2px 6px', borderRadius: '4px', textDecoration: 'none', border: '1px solid #DFE1E6' }}>{key}</a>
                    ))}
                </div>
            </div>
        </div>
    );
}
