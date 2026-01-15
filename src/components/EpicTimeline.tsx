import React, { useMemo } from 'react';
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
    <div className={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Epic Timeline</h3>
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
  );
}
