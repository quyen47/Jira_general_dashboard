'use client';

import React, { useMemo, useState } from 'react';
import styles from './EpicTimeline.module.css';

interface EpicData {
  key: string;
  summary: string;
  startDate?: string;
  dueDate?: string;
  status: string;
  totalIssues: number;
  todo: number;
  inprogress: number;
  done: number;
}

export default function EpicTimeline({ epics }: { epics: EpicData[] }) {
  const [isOpen, setIsOpen] = useState(true);
  
  const ganttData = useMemo(() => {
    if (!epics || epics.length === 0) return null;

    // Filter valid epics (must have at least a creation date which helps normalize)
    const validEpics = epics.map(e => ({
        ...e,
        // Use created date if startDate missing, default duration if dueDate missing
        start: new Date(e.startDate || Date.now()).getTime(),
        end: e.dueDate ? new Date(e.dueDate).getTime() : new Date(e.startDate || Date.now()).getTime() + (14 * 24 * 60 * 60 * 1000) // Default 2 weeks
    })).sort((a, b) => a.start - b.start);

    if (validEpics.length === 0) return null;

    // Determine global range
    let minTime = Math.min(...validEpics.map(e => e.start));
    let maxTime = Math.max(...validEpics.map(e => e.end));

    // Add padding (1 week before, 1 week after)
    const padding = 7 * 24 * 60 * 60 * 1000;
    minTime -= padding;
    maxTime += padding;
    const totalDuration = maxTime - minTime;

    // Generate month headers
    const months = [];
    let current = new Date(minTime);
    current.setDate(1); // Snap to start of month
    
    while (current.getTime() <= maxTime) {
        months.push(new Date(current));
        current.setMonth(current.getMonth() + 1);
    }

    return { validEpics, minTime, totalDuration, months };
  }, [epics]);

  if (!ganttData) {
    return (
      <div className={styles.empty}>
        <p>No active epics found for timeline.</p>
      </div>
    );
  }

  const { validEpics, minTime, totalDuration, months } = ganttData;

  const getPosition = (time: number) => {
     return ((time - minTime) / totalDuration) * 100;
  };

  return (
    <div style={{ background: 'white', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.1)', overflow: 'hidden', marginBottom: '2rem' }}>
      {/* Collapsible Header */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          background: '#0747A6',
          color: 'white', 
          padding: '10px 16px', 
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontWeight: 600,
          letterSpacing: '1px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>EPIC TIMELINE</span>
          <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 4, fontWeight: 400 }}>
            {epics.length} epics
          </span>
        </div>
        <span>{isOpen ? '▼' : '▶'}</span>
      </div>

      {isOpen && (
        <div className={styles.container} style={{ margin: 0, boxShadow: 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '10px' }}>
              <div className={styles.legend}>
                <div className={styles.legendItem}>
                    <div className={`${styles.legendColor} ${styles.done}`}></div>
                    <span>Done</span>
                </div>
                <div className={styles.legendItem}>
                    <div className={`${styles.legendColor} ${styles.inprogress}`}></div>
                    <span>In progress</span>
                </div>
                <div className={styles.legendItem}>
                    <div className={`${styles.legendColor} ${styles.todo}`}></div>
                    <span>To do</span>
                </div>
              </div>
          </div>

          <div className={styles.scrollWrapper}>
            <div className={styles.chart}>
                {/* Header Row */}
                <div className={styles.header}>
                    {months.map((month, i) => {
                        const left = getPosition(month.getTime());
                        return (
                            <div key={i} className={styles.monthMarker} style={{ left: `${left}%` }}>
                                {month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                            </div>
                        );
                    })}
                </div>
                
                {/* Grid Lines */}
                 <div className={styles.grid}>
                     {months.map((month, i) => {
                         const left = getPosition(month.getTime());
                         return <div key={i} className={styles.gridLine} style={{ left: `${left}%` }} />;
                     })}
                 </div>

                {/* Bars */}
                <div className={styles.bars}>
                    {validEpics.map(epic => {
                        const left = getPosition(epic.start);
                        const width = Math.max(getPosition(epic.end) - left, 1); // Min 1% width
                        
                        const total = epic.totalIssues > 0 ? epic.totalIssues : 1;
                        const donePercent = Math.round((epic.done / total) * 100);
                        const progressPercent = Math.round((epic.inprogress / total) * 100);
                        const todoPercent = 100 - donePercent - progressPercent;

                        return (
                            <div key={epic.key} className={styles.row}>
                                <div className={styles.barGroup} style={{ left: `${left}%`, width: `${width}%` }}>
                                    <div className={styles.bar}>
                                        {donePercent > 0 && (
                                            <div className={`${styles.segment} ${styles.done}`} style={{ width: `${donePercent}%` }} />
                                        )}
                                        {progressPercent > 0 && (
                                            <div className={`${styles.segment} ${styles.inprogress}`} style={{ width: `${progressPercent}%` }} />
                                        )}
                                        {todoPercent > 0 && (
                                            <div className={`${styles.segment} ${styles.todo}`} style={{ width: `${todoPercent}%` }} />
                                        )}

                                        <div className={styles.tooltip}>
                                            <strong>{epic.key}</strong>: {epic.summary}<br/>
                                            Status: {epic.status}<br/>
                                            Done: {donePercent}% ({epic.done})<br/>
                                            In Progress: {progressPercent}% ({epic.inprogress})<br/>
                                            To Do: {todoPercent}% ({epic.todo})
                                        </div>
                                    </div>
                                    <div className={styles.label}>
                                        {epic.key} 
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

