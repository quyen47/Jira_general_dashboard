'use client';

import React, { useState, useMemo } from 'react';
// import { Gantt, Task, ViewMode, EventOption } from 'gantt-task-react';
// Workaround for import issues with some setups, but usually named import works if types are correct
import { Gantt, Task, ViewMode } from 'gantt-task-react';
import "gantt-task-react/dist/index.css";
import { GanttTaskData } from '@/actions/gantt';

interface WBSGanttChartProps {
  tasks: GanttTaskData[];
  baseUrl?: string;
}

export default function WBSGanttChart({ tasks: initialTasks, baseUrl }: WBSGanttChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Week);
  const [showCriticalPath, setShowCriticalPath] = useState(false);
  const [showBaselines, setShowBaselines] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  // Transform data for the library
  // Library Task interface:
  // id: string; name: string; type: "task" | "milestone" | "project"; progress: number; styles?: ...; isDisabled?: boolean; 
  // start: Date; end: Date; dependencies?: string[]; project?: string; hideChildren?: boolean; displayOrder?: number;
  const ganttTasks: Task[] = useMemo(() => {
    return initialTasks.map(t => {
      const isBug = t.issueType?.name === 'Bug';
      const isDone = t.status === 'Done';
      
      return {
        id: t.id,
        name: t.name,
        type: t.type,
        progress: t.progress,
        start: new Date(t.start), // Ensure Date object
        end: new Date(t.end),
        dependencies: t.dependencies,
        project: t.project,
        // Custom styles based on status/type
        styles: { 
          progressColor: isDone ? '#36B37E' : (isBug ? '#FF5630' : '#0052CC'),
          progressSelectedColor: isDone ? '#00875A' : (isBug ? '#DE350B' : '#0052CC'),
          backgroundColor: t.type === 'project' ? '#6B778C' : (showCriticalPath ? '#FFAB00' : (isBug ? '#FFEBE6' : '#DEEBFF')),
        },
        // Store original formatting/data in hidden props or use a wrapper map if needed
        // but component allows custom columns so we can access original data via ID lookup if needed
        hideChildren: false
      };
    });
  }, [initialTasks, showCriticalPath]);

  /* 
   * Custom list cell renderer to show Jira details
   */
  /* 
   * Custom list cell renderer to show Jira details
   */
  /* 
   * Custom list cell renderer to show Jira details
   */
  const TaskListHeader = ({ headerHeight }: { headerHeight: number }) => {
      return (
          <div style={{ height: headerHeight, display: 'flex', fontWeight: 'bold', borderBottom: '1px solid #dfe1e6', alignItems: 'center', background: '#f4f5f7' }}>
              <div style={{ minWidth: 30, padding: '0 4px', borderRight: '1px solid #dfe1e6', textAlign: 'center' }}>#</div>
              <div style={{ minWidth: 25, padding: '0 4px', borderRight: '1px solid #dfe1e6', textAlign: 'center' }}>T</div>
              <div style={{ minWidth: 70, padding: '0 8px', borderRight: '1px solid #dfe1e6' }}>Key</div>
              <div style={{ minWidth: 100, padding: '0 8px', borderRight: '1px solid #dfe1e6', flex: 1 }}>Summary</div>
              <div style={{ minWidth: 60, padding: '0 4px' }}>Status</div>
          </div>
      );
  };

  const TaskListTable = ({ rowHeight, tasks }: { rowHeight: number, tasks: Task[] }) => {
      return (
          <div style={{ fontFamily: 'inherit' }}>
              {tasks.map((t: Task, i: number) => {
                  const original = initialTasks.find(it => it.id === t.id);
                  const issueUrl = baseUrl && original?.jiraKey ? `${baseUrl}/browse/${original.jiraKey}` : '#';
                  
                  // Hierarchy Indentation Logic
                  // Level 0: Epic / Project (no parent) -> 0px
                  // Level 1: Story / Task (parent is Epic) -> 16px
                  // Level 2: Subtask (parent is Story) -> 32px
                  let indent = 0;
                  if (t.project) {
                      indent = 16;
                      const parent = initialTasks.find(it => it.id === t.project);
                      if (parent && parent.project) {
                          indent = 32;
                      }
                  }
                  
                  return (
                      <div key={t.id} style={{ height: rowHeight, display: 'flex', alignItems: 'center', borderBottom: '1px solid #f4f5f7', background: 'white' }}>
                          <div style={{ minWidth: 30, padding: '0 4px', borderRight: '1px solid #dfe1e6', textAlign: 'center', color: '#6B778C', fontSize: '0.8rem' }}>
                              {i + 1}
                          </div>
                          <div style={{ minWidth: 25, padding: '0 4px', borderRight: '1px solid #dfe1e6', display: 'flex', justifyContent: 'center' }}>
                              {original?.issueType?.iconUrl ? (
                                  <img src={original.issueType.iconUrl} alt={original.issueType.name} style={{ width: 16, height: 16 }} title={original.issueType.name} />
                              ) : (
                                  <span style={{ fontSize: '0.6rem' }}>{t.type.substring(0,1)}</span>
                              )}
                          </div>
                          <div style={{ minWidth: 70, padding: '0 8px', borderRight: '1px solid #dfe1e6' }}>
                              <a href={issueUrl} target="_blank" style={{ color: '#0052CC', textDecoration: 'none', fontSize: '0.85rem' }}>{original?.jiraKey}</a>
                          </div>
                          <div style={{ minWidth: 100, padding: `0 8px 0 ${8 + indent}px`, borderRight: '1px solid #dfe1e6', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              <a 
                                href={issueUrl}
                                target="_blank"
                                style={{ color: '#172B4D', fontSize: '0.9rem', textDecoration: 'none', cursor: 'pointer' }}
                                title={t.name}
                                onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}
                              >
                                {t.name}
                              </a>
                          </div>
                          <div style={{ minWidth: 60, padding: '0 4px', textAlign: 'center' }}>
                              <span style={{ 
                                  background: original?.status === 'Done' ? '#E3FCEF' : '#DFE1E6', 
                                  color: original?.status === 'Done' ? '#006644' : '#42526E',
                                  padding: '2px 4px', borderRadius: 3, fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                                  maxWidth: '100%', display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                              }} title={original?.status}>
                                  {original?.status}
                              </span>
                          </div>
                      </div>
                  );
              })}
          </div>
      );
  };

  return (
    <div style={{ background: 'white', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.1)', overflow: 'hidden', marginBottom: '2rem' }}>
       {/* Header */}
        <div 
            onClick={() => setIsOpen(!isOpen)}
            style={{ 
                background: '#0747A6', // Jira Blue
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
            <span>WBS GANTT-CHART</span>
            <span>{isOpen ? '▼' : '▶'}</span>
        </div>

      {isOpen && (
      <div style={{ border: '1px solid #dfe1e6', borderTop: 'none', background: 'white', overflow: 'hidden' }}>
      
      {/* Controls Toolbar */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #dfe1e6', display: 'flex', gap: 16, alignItems: 'center', background: '#FAFBFC' }}>
        <div style={{ display: 'flex', gap: 4, background: '#EBECF0', padding: 2, borderRadius: 3 }}>
             <button 
                onClick={() => setViewMode(ViewMode.Day)}
                style={{ padding: '4px 8px', border: 'none', background: viewMode === ViewMode.Day ? 'white' : 'transparent', borderRadius: 3, cursor: 'pointer', fontWeight: 500, boxShadow: viewMode === ViewMode.Day ? '0 1px 2px rgba(0,0,0,0.2)' : 'none' }}
             >Day</button>
             <button 
                onClick={() => setViewMode(ViewMode.Week)}
                style={{ padding: '4px 8px', border: 'none', background: viewMode === ViewMode.Week ? 'white' : 'transparent', borderRadius: 3, cursor: 'pointer', fontWeight: 500, boxShadow: viewMode === ViewMode.Week ? '0 1px 2px rgba(0,0,0,0.2)' : 'none' }}
             >Week</button>
             <button 
                onClick={() => setViewMode(ViewMode.Month)}
                style={{ padding: '4px 8px', border: 'none', background: viewMode === ViewMode.Month ? 'white' : 'transparent', borderRadius: 3, cursor: 'pointer', fontWeight: 500, boxShadow: viewMode === ViewMode.Month ? '0 1px 2px rgba(0,0,0,0.2)' : 'none' }}
             >Month</button>
        </div>

        <div style={{ width: 1, height: 20, background: '#dfe1e6' }} />

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={showCriticalPath} onChange={e => setShowCriticalPath(e.target.checked)} />
            Critical Path
        </label>
        
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={showBaselines} onChange={e => setShowBaselines(e.target.checked)} />
            Baseline
        </label>

         {/* Spacer */}
         <div style={{ flex: 1 }} />
         
         <button 
            onClick={() => alert('Auto-scheduling logic would go here. It requires backend updates to Jira issues based on dependencies.')}
            style={{ background: '#0052CC', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 3, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
         >
             Auto Schedule
         </button>
      </div>

      {ganttTasks.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <Gantt
                tasks={ganttTasks}
                viewMode={viewMode}
                onDateChange={(task: Task) => {
                    console.log('Task date changed:', task.name, task.start, task.end);
                    // Here we would call a server action to update dates
                }}
                onProgressChange={(task, progress) => {
                     console.log('Task progress changed:', task.name, progress);
                }}
                onDoubleClick={(task) => {
                     console.log('Show details for', task.name);
                }}
                listCellWidth="300px"
                columnWidth={viewMode === ViewMode.Month ? 300 : 60}
                rowHeight={40}
                headerHeight={50}
                /* Custom List */
                TaskListHeader={TaskListHeader}
                TaskListTable={TaskListTable}
                /* Critical Path highlighting via styling logic can be handled in useMemo content by setting styles */
            />
          </div>
      ) : (
          <div style={{ padding: 40, textAlign: 'center', color: '#6B778C' }}>
              No tasks found or schedule data unavailable.
          </div>
      )}
      </div>
      )}
    </div>
  );
}
