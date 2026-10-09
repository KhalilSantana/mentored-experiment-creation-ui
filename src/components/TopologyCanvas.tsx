/**
 * Main topology canvas with ReactFlow - now supports manual edge placement
 * with network-based coloring and intuitive handle positions.
 */

import React, { useCallback, useContext, useRef, useState, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Connection,
  useNodesState,
  useEdgesState,
  MiniMap,
  Controls,
  Background,
  NodeTypes,
  EdgeTypes,
  MarkerType,
  ConnectionMode,
} from 'reactflow';
import 'reactflow/dist/style.css';
import CustomNode from './CustomNode';
import VXLANEdge, { VXLANEdgeData } from './VXLANEdge';
import VXLANConnectionPanel from './VXLANConnectionPanel';
import { TopologyContext, newBridge } from '../hooks/useTopology';
import { NodeActor, VXLANEdge as VXLANEdgeType } from '../types/experiment';
import { resolveBridgeIPs } from '../utils/addressing';
import { buildEdgeColorMap } from '../utils/edgeColorMapper';
import './TopologyCanvas.css';

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

const edgeTypes: EdgeTypes = {
  vxlan: VXLANEdge as any,
};

export const TopologyCanvas: React.FC = () => {
  const context = useContext(TopologyContext);
  if (!context) {
    throw new Error('TopologyCanvas must be used within TopologyContext provider');
  }

  const { state, addNodeActor, addVXLANEdge, removeVXLANEdge, setSelectedNode, setSelectedEdge } = context;

  const [rfNodes, setRfNodes, onRfNodesChange] = useNodesState([]);
  const [rfEdges, setRfEdges, onRfEdgesChange] = useEdgesState([]);
  const [connectionInProgress, setConnectionInProgress] = useState<{
    source: string;
    target: string;
    sourceBridgeId: string;
    targetBridgeId: string;
    sourceHandle: string;
    targetHandle: string;
  } | null>(null);
  const [showVXLANPanel, setShowVXLANPanel] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const nextNodeIdRef = useRef(1);
  const nodePositionsRef = useRef<Record<string, { x: number; y: number }>>({});

  // Build edge color map from current edges
  const edgeColorMap = useMemo(
    () => buildEdgeColorMap(state.vxlanEdges),
    [state.vxlanEdges]
  );

  // Sync canvas nodes with experiment state
  React.useEffect(() => {
    const bridgeIPs = Object.fromEntries(
      resolveBridgeIPs(state.experiment.nodeactors, state.vxlanEdges)
    );
    const newNodes: Node[] = state.experiment.nodeactors.map((actor, idx) => {
      const drawingNode = state.experiment.drawing?.nodes?.find(n => n.id === actor.name);
      const savedPosition = drawingNode?.position || nodePositionsRef.current[actor.name];
      const position = savedPosition || {
        x: 100 + (idx % 3) * 280,
        y: 120 + Math.floor(idx / 3) * 200,
      };

      nodePositionsRef.current[actor.name] = position;

      // Build bridge IP map for this node
      const bridges = actor.bridges || [];

      return {
        id: actor.name,
        data: {
          label: actor.name,
          nodeType: detectNodeType(actor.name),
          replicas: actor.replicas,
          region: actor.region,
          bridges: bridges,
          bridgeIPs,
        },
        position,
        type: 'custom',
        selected: state.selectedNodeId === actor.name,
      };
    });

    setRfNodes(newNodes);
  }, [state.experiment.nodeactors, state.vxlanEdges, state.selectedNodeId, setRfNodes]);

  // Sync edges with VXLAN edges - now with network-based coloring
  React.useEffect(() => {
    const newEdges: Edge<VXLANEdgeData>[] = state.vxlanEdges.map((vxlanEdge) => ({
      id: vxlanEdge.id,
      source: vxlanEdge.source,
      target: vxlanEdge.target,
      sourceHandle: `source-${vxlanEdge.sourceBridgeId}`,
      targetHandle: `target-${vxlanEdge.targetBridgeId}`,
      type: 'vxlan',
      data: {
        vni: vxlanEdge.vni,
      },
      style: {
        stroke: edgeColorMap.get(vxlanEdge.id) || '#667eea',
        strokeWidth: 2,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: edgeColorMap.get(vxlanEdge.id) || '#667eea',
      },
      selected: state.selectedEdgeId === vxlanEdge.id,
      animated: false,
      focusable: false,
    }));

    setRfEdges(newEdges);
  }, [state.vxlanEdges, state.selectedEdgeId, edgeColorMap, setRfEdges]);

  const handleNodesChange = useCallback(
    (changes: any) => {
      onRfNodesChange(changes);
      changes.forEach((change: any) => {
        if (change.type === 'position' && change.position) {
          nodePositionsRef.current[change.id] = change.position;
          // Also save to experiment drawing metadata
          if (change.id && change.position) {
            const drawingNode = {
              id: change.id,
              label: change.id,
              position: change.position,
            };
            // We save it in the node's ref for now, exported via drawing in state
            // The drawing is saved automatically through the experiment
          }
        }
      });
    },
    [onRfNodesChange]
  );

  const detectNodeType = (name: string): string => {
    const lower = name.toLowerCase();
    if (lower.includes('router')) return 'router';
    if (lower.includes('client')) return 'client';
    if (lower.includes('server')) return 'server';
    if (lower.includes('dns')) return 'dns';
    return 'generic';
  };

  // Custom connect handler — one handle per bridge, stacked source+target
  const handleConnect = useCallback(
    (connection: Connection) => {
      const { source, target, sourceHandle, targetHandle } = connection;
      if (!source || !target || !sourceHandle || !targetHandle) return;
      if (source === target) return;

      // Extract bridge IDs from handle prefixes (source-{bridgeId}, target-{bridgeId})
      const extractBridgeId = (handle: string) => handle.replace(/^(source|target)-/, '');
      const sourceBridgeId = extractBridgeId(sourceHandle);
      const targetBridgeId = extractBridgeId(targetHandle);

      const alreadyLinked = state.vxlanEdges.some(
        (e) =>
          (e.sourceBridgeId === sourceBridgeId && e.targetBridgeId === targetBridgeId) ||
          (e.sourceBridgeId === targetBridgeId && e.targetBridgeId === sourceBridgeId)
      );
      if (alreadyLinked) return;

      setConnectionInProgress({
        source,
        target,
        sourceBridgeId,
        targetBridgeId,
        sourceHandle,
        targetHandle,
      });

      // Immediately create a temporary visual edge so the user sees the
      // connection forming while the modal is open.
      setRfEdges((eds) => [
        ...eds,
        {
          id: `pending-${sourceHandle}-${targetHandle}`,
          source,
          target,
          sourceHandle,
          targetHandle,
          type: 'vxlan',
          data: {},
          style: { stroke: '#667eea', strokeDasharray: '8 4' },
          animated: true,
          focusable: false,
        },
      ]);

      setShowVXLANPanel(true);
    },
    [state.vxlanEdges]
  );

  const handleVXLANConfirm = (edge: VXLANEdgeType) => {
    addVXLANEdge(edge);
    setShowVXLANPanel(false);

    // Remove the temporary dashed edge and let the edge-sync effect
    // re-create it as a solid edge with correct handle IDs.
    setConnectionInProgress((prev) => {
      if (prev) {
        setRfEdges((eds) =>
          eds.filter(
            (e) =>
              e.id !== `pending-${prev.sourceHandle}-${prev.targetHandle}`
          )
        );
      }
      return null;
    });
  };

  const handleVXLANCancel = () => {
    setShowVXLANPanel(false);
    setConnectionInProgress(null);
  };

  const handleNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNode(node.id);
  };

  const handleEdgeClick = (_: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge.id);
  };

  const handleCanvasContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
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
      const item = menu.querySelector(`[data-type="${type}"]`);
      item?.addEventListener('click', () => {
        const nodeName = `${type.toLowerCase()}-${Date.now()}`;
        const newNode: NodeActor = {
          name: nodeName,
          replicas: 1,
          region: 'default',
          containers: [{
            name: 'main',
            image: 'ghcr.io/khalilsantana/mentored-base-utils:latest',
            imagePullPolicy: 'Always',
            command: ['/entry.sh'],
            args: ['sleep', 'infinity'],
            securityContext: { privileged: true },
          }],
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
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onRfEdgesChange}
        onConnect={handleConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        deleteKeyCode={null}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onContextMenu={handleCanvasContextMenu}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.2}
        maxZoom={2}
      >
        <Background color="#e2e8f0" gap={24} />
        <Controls
          showInteractive={false}
          showZoom={true}
          showFitView={true}
        />
      </ReactFlow>

      {showVXLANPanel && connectionInProgress && (
        <VXLANConnectionPanel
          connection={{
            source: connectionInProgress.source,
            target: connectionInProgress.target,
            sourceBridgeId: connectionInProgress.sourceBridgeId,
            targetBridgeId: connectionInProgress.targetBridgeId,
          }}
          nodeactors={state.experiment.nodeactors}
          onConfirm={handleVXLANConfirm}
          onCancel={handleVXLANCancel}
          suggestedVNI={state.vniCounter}
          existingVNIs={new Set(state.vxlanEdges.map(e => e.vni))}
        />
      )}

      <div className="canvas-info">
        <p>Right-click to add node • Drag bridge handles to connect • Drag nodes to reposition • Edges colored by network</p>
      </div>
    </div>
  );
};

export default TopologyCanvas;
