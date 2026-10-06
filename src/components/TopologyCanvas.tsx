/**
 * Main topology canvas with ReactFlow
 */

import React, { useCallback, useContext, useRef, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Connection,
  useNodesState,
  useEdgesState,
  addEdge,
  MiniMap,
  Controls,
  Background,
  ConnectionMode,
  NodeTypes,
  EdgeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import CustomNode from './CustomNode';
import VXLANEdge, { VXLANEdgeData } from './VXLANEdge';
import VXLANConnectionPanel from './VXLANConnectionPanel';
import { TopologyContext, newBridge } from '../hooks/useTopology';
import { NodeActor, VXLANEdge as VXLANEdgeType } from '../types/experiment';
import { resolveBridgeIPs } from '../utils/addressing';
import './TopologyCanvas.css';

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

const edgeTypes: EdgeTypes = {
  vxlan: VXLANEdge as any,
};

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

export const TopologyCanvas: React.FC = () => {
  const context = useContext(TopologyContext);
  if (!context) {
    throw new Error('TopologyCanvas must be used within TopologyContext provider');
  }

  const { state, addNodeActor, addVXLANEdge, removeVXLANEdge, setSelectedNode, setSelectedEdge } = context;

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [connectionInProgress, setConnectionInProgress] = useState<{
    source: string;
    target: string;
    sourceBridgeId: string;
    targetBridgeId: string;
  } | null>(null);
  const [showVXLANPanel, setShowVXLANPanel] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const nextNodeIdRef = useRef(1);
  const nodePositionsRef = useRef<Record<string, { x: number; y: number }>>({});

  // Sync canvas nodes with experiment state
  React.useEffect(() => {
    const bridgeIPs = Object.fromEntries(
      resolveBridgeIPs(state.experiment.nodeactors, state.vxlanEdges)
    );
    const newNodes: Node[] = state.experiment.nodeactors.map((actor, idx) => {
      // Try to get existing position from drawing metadata or ref
      const drawingNode = state.experiment.drawing?.nodes?.find(n => n.id === actor.name);
      const savedPosition = drawingNode?.position || nodePositionsRef.current[actor.name];
      const position = savedPosition || { x: idx * 250, y: 100 };

      // Save position in ref for next time
      nodePositionsRef.current[actor.name] = position;

      return {
        id: actor.name,
        data: {
          label: actor.name,
          nodeType: detectNodeType(actor.name),
          replicas: actor.replicas,
          region: actor.region,
          bridges: actor.bridges || [],
          bridgeIPs,
        },
        position,
        type: 'custom',
        selected: state.selectedNodeId === actor.name,
      };
    });

    setNodes(newNodes);
  }, [state.experiment.nodeactors, state.vxlanEdges, state.selectedNodeId, setNodes]);

  // Sync edges with VXLAN edges
  React.useEffect(() => {
    const newEdges: Edge<VXLANEdgeData>[] = state.vxlanEdges.map(vxlanEdge => ({
      id: vxlanEdge.id,
      source: vxlanEdge.source,
      target: vxlanEdge.target,
      sourceHandle: vxlanEdge.sourceBridgeId,
      targetHandle: vxlanEdge.targetBridgeId,
      type: 'vxlan',
      data: {
        vni: vxlanEdge.vni,
      },
      selected: state.selectedEdgeId === vxlanEdge.id,
    }));

    setEdges(newEdges);
  }, [state.vxlanEdges, state.selectedEdgeId, setEdges]);

  // Wrap onNodesChange to save positions
  const handleNodesChange = useCallback(
    (changes: any) => {
      onNodesChange(changes);
      // Save position changes to ref
      changes.forEach((change: any) => {
        if (change.type === 'position' && change.position) {
          nodePositionsRef.current[change.id] = change.position;
        }
      });
    },
    [onNodesChange]
  );

  const detectNodeType = (name: string): string => {
    const lower = name.toLowerCase();
    if (lower.includes('router')) return 'router';
    if (lower.includes('client')) return 'client';
    if (lower.includes('server')) return 'server';
    if (lower.includes('dns')) return 'dns';
    return 'generic';
  };

  const handleConnect = useCallback(
    (connection: Connection) => {
      const { source, target, sourceHandle, targetHandle } = connection;
      if (!source || !target || !sourceHandle || !targetHandle) return;
      if (source === target) return;

      const alreadyLinked = state.vxlanEdges.some(
        e =>
          (e.sourceBridgeId === sourceHandle && e.targetBridgeId === targetHandle) ||
          (e.sourceBridgeId === targetHandle && e.targetBridgeId === sourceHandle)
      );
      if (alreadyLinked) return;

      setConnectionInProgress({
        source,
        target,
        sourceBridgeId: sourceHandle,
        targetBridgeId: targetHandle,
      });
      setShowVXLANPanel(true);
    },
    [state.vxlanEdges]
  );

  const handleVXLANConfirm = (edge: VXLANEdgeType) => {
    addVXLANEdge(edge);
    setShowVXLANPanel(false);
    setConnectionInProgress(null);
  };

  const handleVXLANCancel = () => {
    setShowVXLANPanel(false);
    setConnectionInProgress(null);
  };

  const handleNodeClick = (nodeId: string) => {
    setSelectedNode(nodeId);
  };

  const handleEdgeClick = (edgeId: string) => {
    setSelectedEdge(edgeId);
  };

  const handleCanvasContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();

    // Show context menu for adding new node
    showAddNodeMenu(e.clientX, e.clientY);
  };

  const showAddNodeMenu = (x: number, y: number) => {
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.position = 'fixed';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.style.zIndex = '999';

    const nodeTypes = ['Router', 'Client', 'Server', 'DNS', 'Generic'];
    menu.innerHTML = nodeTypes
      .map(type => `<div class="menu-item" data-type="${type}">${type}</div>`)
      .join('');

    nodeTypes.forEach(type => {
      menu.querySelector(`[data-type="${type}"]`)?.addEventListener('click', () => {
        const nodeName = `${type.toLowerCase()}-${Date.now()}`;
        const newNode: NodeActor = {
          name: nodeName,
          replicas: 1,
          region: 'default',
          containers: [],
          bridges: [newBridge()],
        };

        addNodeActor(newNode);
        document.body.removeChild(menu);
      });
    });

    document.body.appendChild(menu);

    setTimeout(() => {
      if (document.body.contains(menu)) {
        document.body.removeChild(menu);
      }
    }, 5000);
  };

  return (
    <div className="topology-canvas-container" ref={canvasRef}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        deleteKeyCode={null}
        onNodeClick={(_, node) => handleNodeClick(node.id)}
        onEdgeClick={(_, edge) => handleEdgeClick(edge.id)}
        onContextMenu={handleCanvasContextMenu}
        fitView
      >
        <Background color="#aaa" gap={16} />
        <Controls />
        <MiniMap />
      </ReactFlow>

      {showVXLANPanel && connectionInProgress && (
        <VXLANConnectionPanel
          connection={connectionInProgress}
          nodeactors={state.experiment.nodeactors}
          onConfirm={handleVXLANConfirm}
          onCancel={handleVXLANCancel}
          suggestedVNI={state.vniCounter}
          existingVNIs={new Set(state.vxlanEdges.map(e => e.vni))}
        />
      )}

      <div className="canvas-info">
        <p>Right-click to add node • Drag from a bridge handle to another bridge to create a VXLAN tunnel • Click to select</p>
      </div>
    </div>
  );
};

export default TopologyCanvas;
