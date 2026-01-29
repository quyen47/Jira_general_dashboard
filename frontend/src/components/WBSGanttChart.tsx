'use client';

import React, { useState, useMemo } from 'react';
// import { Gantt, Task, ViewMode, EventOption } from 'gantt-task-react';
// Workaround for import issues with some setups, but usually named import works if types are correct
import { Gantt, Task, ViewMode } from 'gantt-task-react';
import "gantt-task-react/dist/index.css";
import { GanttTaskData, getProjectSchedule } from '@/actions/gantt';

interface WBSGanttChartProps {
  tasks: GanttTaskData[];
  baseUrl?: string;
  projectKey?: string;
}

export default function WBSGanttChart({ tasks: initialTasks, baseUrl, projectKey }: WBSGanttChartProps) {
  const [allTasks, setAllTasks] = useState<GanttTaskData[]>(initialTasks);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Week);
  const [showCriticalPath, setShowCriticalPath] = useState(false);
  const [showBaselines, setShowBaselines] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [collapsedTasks, setCollapsedTasks] = useState<string[]>([]);

  // Transform data for the library
  // Library Task interface:
  // id: string; name: string; type: "task" | "milestone" | "project"; progress: number; styles?: ...; isDisabled?: boolean; 
  // start: Date; end: Date; dependencies?: string[]; project?: string; hideChildren?: boolean; displayOrder?: number;
  const ganttTasks: Task[] = useMemo(() => {
    // 1. Sort Hierarchy (DFS to ensure children are below parents)
    const idSet = new Set(allTasks.map(t => t.id));
    const roots: GanttTaskData[] = [];
    const childrenMap = new Map<string, GanttTaskData[]>();
    
    allTasks.forEach(t => {
      // If task has a parent and that parent is also in the list, it's a child node
      if (t.project && idSet.has(t.project)) {
         if (!childrenMap.has(t.project)) childrenMap.set(t.project, []);
         childrenMap.get(t.project)!.push(t);
      } else {
         // Otherwise treat as root (Epic or independent task)
         roots.push(t);
      }
    });

    const sortedTasks: GanttTaskData[] = [];
    const traverse = (nodes: GanttTaskData[]) => {
       nodes.forEach(node => {
          sortedTasks.push(node);
          // If this node has children, append them immediately after
          if (childrenMap.has(node.id)) {
             traverse(childrenMap.get(node.id)!);
          }
       });
    }
    traverse(roots);

    // 2. Helper map for hierarchy lookup (visibilty check)
    const taskMap = new Map(allTasks.map(t => [t.id, t]));
    
    // Recursive check if a task is hidden due to an ancestor being collapsed
    const isSectionHidden = (taskId: string): boolean => {
       const task = taskMap.get(taskId);
       if (!task || !task.project) return false;
       const parentId = task.project;
       
       // If parent is explicitly collapsed, this task is hidden
       if (collapsedTasks.includes(parentId)) return true;
       
       // Otherwise check if parent itself is hidden
       return isSectionHidden(parentId);
    };

    // 3. Map to Gantt Task format
    const mappedTasks = sortedTasks.map(t => {
      const isBug = t.issueType?.name === 'Bug';
      const isDone = t.status === 'Done';
      
      // If this task is hidden (because an ancestor is collapsed), 
      // we must also hide its children so they don't dangle.
      const taskIsHidden = isSectionHidden(t.id);
      
      // Determine if strictly collapsed:
      // User explicit collapse OR (Has Children AND Not Loaded)
      const childrenLoaded = childrenMap.has(t.id); // childrenMap is built from allTasks
      const isLazyCollapsed = (t.hasChildren || false) && !childrenLoaded;
      const isCollapsed = collapsedTasks.includes(t.id) || isLazyCollapsed;

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
        hideChildren: isCollapsed || taskIsHidden
      };
    });

    return mappedTasks.filter(t => !isSectionHidden(t.id));
  }, [allTasks, showCriticalPath, collapsedTasks]);

  const handleExpanderClick = async (task: Task) => {
    // Lazy Load Check
    const original = allTasks.find(t => t.id === task.id);
    const childrenLoaded = allTasks.some(t => t.project === task.id);
    
    // If it has children conceptualy, but they are not loaded, load them
    if (original?.hasChildren && !childrenLoaded && projectKey) {
        try {
            const newTasks = await getProjectSchedule(projectKey, task.id);
            if (newTasks.length > 0) {
                setAllTasks(prev => {
                    const ids = new Set(prev.map(p => p.id));
                    return [...prev, ...newTasks.filter(n => !ids.has(n.id))];
                });
                
                // If we successfully loaded children, we naturally want to Expand.
                // The logical "forced collapse" (isLazyCollapsed) will evaluate to false now (since childrenLoaded will be true).
                // But we also need to ensure it's NOT in `collapsedTasks`.
                setCollapsedTasks(prev => prev.filter(id => id !== task.id));
                return;
            } else {
               // No children found despite flag? Just expand to show nothing or keep as is?
               // Toggle normal logic
            }
        } catch (e) {
            console.error('Lazy load failed', e);
        }
    }

    setCollapsedTasks(prev => {
      if (prev.includes(task.id)) {
        return prev.filter(id => id !== task.id);
      }
      return [...prev, task.id];
    });
  };

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
              <div style={{ minWidth: 65, padding: '0 8px', borderRight: '1px solid #dfe1e6' }}>Key</div>
              <div style={{ minWidth: 85, padding: '0 8px', borderRight: '1px solid #dfe1e6', flex: 1 }}>Summary</div>
              <div style={{ minWidth: 55, padding: '0 4px' }}>Status</div>
          </div>
      );
  };

  const TaskListTable = ({ rowHeight, tasks, onExpanderClick }: { rowHeight: number, tasks: Task[], onExpanderClick: (task: Task) => void }) => {
      return (
          <div style={{ fontFamily: 'inherit' }}>
              {tasks.map((t: Task, i: number) => {
                  const original = allTasks.find(it => it.id === t.id);
                  const issueUrl = baseUrl && original?.jiraKey ? `${baseUrl}/browse/${original.jiraKey}` : '#';
                  
                  // Hierarchy
                  const hasChildren = original?.hasChildren || allTasks.some(it => it.project === t.id);
                  let indentLevel = 0;
                  if (t.project) {
                      indentLevel = 1;
                      const parent = allTasks.find(it => it.id === t.project);
                      if (parent && parent.project) {
                          indentLevel = 2;
                      }
                  }
                  const paddingLeft = indentLevel * 14;

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
                          <div style={{ minWidth: 65, padding: '0 8px', borderRight: '1px solid #dfe1e6' }}>
                              <a href={issueUrl} target="_blank" style={{ color: '#0052CC', textDecoration: 'none', fontSize: '0.85rem' }}>{original?.jiraKey}</a>
                          </div>
                          <div style={{ minWidth: 85, padding: `0 8px`, borderRight: '1px solid #dfe1e6', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center' }}>
                              <div style={{ width: paddingLeft, flexShrink: 0, textAlign: 'right', color: '#ccc', marginRight: 4, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                                  {indentLevel > 0 && <span style={{ borderLeft: '1px solid #ccc', borderBottom: '1px solid #ccc', width: 8, height: 8, display: 'inline-block', marginBottom: 4 }}></span>}
                              </div>
                              
                              {hasChildren && (
                                  <div 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleExpanderClick(t);
                                      }}
                                      style={{ cursor: 'pointer', marginRight: 4, width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #dfe1e6', borderRadius: 2, background: '#f4f5f7', fontSize: 10, flexShrink: 0 }}
                                  >
                                      {t.hideChildren ? '+' : '-'}
                                  </div>
                              )}
                              
                              <a 
                                href={issueUrl}
                                target="_blank"
                                style={{ color: '#172B4D', fontSize: '0.85rem', textDecoration: 'none', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                title={t.name}
                                onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}
                              >
                                {t.name}
                              </a>
                          </div>
                          <div style={{ minWidth: 55, padding: '0 4px', textAlign: 'center' }}>
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
                onExpanderClick={handleExpanderClick}
                listCellWidth="265px"
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
