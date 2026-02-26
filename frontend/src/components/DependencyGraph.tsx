'use client';

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  ConnectionLineType,
  Panel,
  MarkerType,
  Position,
  Node,
  Edge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { FilterIssue } from '@/actions/filters';

const nodeWidth = 250;
const nodeHeight = 80;

interface DependencyGraphProps {
  issues: FilterIssue[];
  baseUrl?: string;
}

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const newNode = {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };

    return newNode;
  });

  return { nodes: newNodes, edges };
};

// Custom Node Component
const CustomNode = ({ data }: { data: any }) => {
  return (
    <div style={{
      width: '250px',
      background: 'white',
      borderRadius: '8px',
      border: `2px solid ${data.statusColor === 'green' ? '#36B37E' : data.statusColor === 'blue-gray' ? '#0052cc' : '#dfe1e6'}`,
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      padding: '12px',
      fontSize: '0.8rem',
      color: '#172b4d',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <a href={data.baseUrl ? `${data.baseUrl}/browse/${data.key}` : `/browse/${data.key}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, color: '#0052cc', textDecoration: 'none' }}>
          {data.key}
        </a>
        <span style={{ 
          fontSize: '0.7rem', 
          background: data.statusColor === 'green' ? '#e3fcef' : data.statusColor === 'blue-gray' ? '#deebff' : '#f4f5f7',
          color: data.statusColor === 'green' ? '#006644' : data.statusColor === 'blue-gray' ? '#0052cc' : '#42526e',
          padding: '2px 6px',
          borderRadius: '4px'
        }}>
          {data.status}
        </span>
      </div>
      
      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>
        {data.summary}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {data.issueTypeIcon && <img src={data.issueTypeIcon} alt={data.issueType} style={{ width: 14, height: 14 }} />}
          {data.priorityIcon && <img src={data.priorityIcon} alt={data.priority} style={{ width: 14, height: 14 }} />}
        </div>
        {data.assigneeAvatar ? (
          <img src={data.assigneeAvatar} alt={data.assignee} title={data.assignee} style={{ width: 20, height: 20, borderRadius: '50%' }} />
        ) : (
          <span style={{ fontSize: '0.7rem', color: '#8993a4' }}>Unassigned</span>
        )}
      </div>

      {/* React Flow handles for connections */}
      <div 
        data-handleid="target" 
        data-nodeid={data.key} 
        data-handlepos="left" 
        className="react-flow__handle react-flow__handle-left target" 
        style={{ top: '50%', left: '-2px', borderRadius: '50%', width: '8px', height: '8px', background: '#8993a4' }} 
      />
      <div 
        data-handleid="source" 
        data-nodeid={data.key} 
        data-handlepos="right" 
        className="react-flow__handle react-flow__handle-right source" 
        style={{ top: '50%', right: '-2px', borderRadius: '50%', width: '8px', height: '8px', background: '#8993a4' }} 
      />
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

export default function DependencyGraph({ issues, baseUrl }: DependencyGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  useEffect(() => {
    const initialNodes: Node[] = [];
    const initialEdges: Edge[] = [];
    
    // Map of issues to check existence easily
    const issueMap = new Set(issues.map(i => i.key));

    issues.forEach(issue => {
      // Add node
      initialNodes.push({
        id: issue.key,
        type: 'custom',
        position: { x: 0, y: 0 },
        data: {
          key: issue.key,
          summary: issue.summary,
          status: issue.status,
          statusColor: issue.statusColor,
          issueType: issue.issueType,
          issueTypeIcon: issue.issueTypeIcon,
          priority: issue.priority,
          priorityIcon: issue.priorityIcon,
          assignee: issue.assignee,
          assigneeAvatar: issue.assigneeAvatar,
          baseUrl: baseUrl,
        }
      });

      // Add edges based on dependencies
      if (issue.dependencies) {
        issue.dependencies.forEach(dep => {
          // Only draw lines if both source and target are in the filtered list
          if (issueMap.has(dep.targetKey)) {
            const source = dep.direction === 'outward' ? issue.key : dep.targetKey;
            const target = dep.direction === 'outward' ? dep.targetKey : issue.key;
            
            // To prevent duplicate reverse edges
            const edgeId = `${source}-${target}-${dep.type}`;
            
            if (!initialEdges.find(e => e.id === edgeId)) {
              initialEdges.push({
                id: edgeId,
                source: source,
                target: target,
                type: 'smoothstep',
                animated: dep.type === 'blocks', // Animate blocks for visibility
                label: dep.type,
                labelStyle: { fill: '#5e6c84', fontSize: 10, fontWeight: 500 },
                labelBgStyle: { fill: 'white', fillOpacity: 0.8 },
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  color: dep.type === 'blocks' ? '#FF5630' : '#8993a4',
                },
                style: {
                  stroke: dep.type === 'blocks' ? '#FF5630' : '#8993a4',
                  strokeWidth: 2,
                }
              });
            }
          }
        });
      }
    });

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      initialNodes,
      initialEdges
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [issues]);

  if (issues.length === 0) {
    return <div style={{ padding: '12px', textAlign: 'center', color: '#666' }}>No issues found.</div>;
  }

  return (
    <div style={
      isFullscreen
        ? {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            background: '#fafbfc'
          }
        : {
            width: '100%',
            height: '500px',
            border: '1px solid #dfe1e6',
            borderRadius: '8px',
            background: '#fafbfc'
          }
    }>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        connectionLineType={ConnectionLineType.SmoothStep}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.2}
      >
        <Panel position="top-left">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            style={{
              padding: '6px 12px',
              background: 'white',
              border: '1px solid #dfe1e6',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '0.8rem',
              color: '#172b4d',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}
          >
            {isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
          </button>
        </Panel>
        <Panel position="top-right" style={{ background: 'white', padding: '8px 12px', borderRadius: '4px', border: '1px solid #dfe1e6', fontSize: '0.8rem', opacity: 0.9 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '2px', background: '#FF5630' }}></div>
              <span>Blocks</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '2px', background: '#8993a4' }}></div>
              <span>Other Links</span>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
