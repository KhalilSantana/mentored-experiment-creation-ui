/**
 * Custom node component for topology - with connection handles on left and right
 * to allow intuitive edge placement from any side.
 */

import React, { useContext, useEffect, useState } from 'react';
import { Handle, NodeProps, Position, useUpdateNodeInternals } from 'reactflow';
import { TopologyContext } from '../hooks/useTopology';
import { UIBridge } from '../types/experiment';
import { validateBridgeName } from '../utils/topologyConfigGenerator';
import './CustomNode.css';

export interface CustomNodeData {
  label: string;
  nodeType?: 'router' | 'client' | 'server' | 'dns' | 'generic';
  replicas?: number;
  region?: string;
  bridges?: UIBridge[];
  bridgeIPs?: Record<string, string>;
}

interface BridgeRowProps {
  bridge: UIBridge;
  ip?: string;
  siblingNames: string[];
  onRename: (name: string) => void;
  onRemove: () => void;
}

const BridgeRow: React.FC<BridgeRowProps> = ({ bridge, ip, siblingNames, onRename, onRemove }) => {
  const [draft, setDraft] = useState(bridge.name);
  const invalid = !validateBridgeName(draft) || siblingNames.includes(draft);

  useEffect(() => setDraft(bridge.name), [bridge.name]);

  const commit = () => {
    if (invalid) {
      setDraft(bridge.name);
    } else if (draft !== bridge.name) {
      onRename(draft);
    }
  };

  return (
    <div className="bridge-row">
      <input
        className={`bridge-name nodrag ${invalid ? 'invalid' : ''}`}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        title="Bridge name"
      />
      {ip && <span className="bridge-ip">{ip}</span>}
      <button className="bridge-remove nodrag" onClick={onRemove} title="Delete bridge">
        ✕
      </button>
    </div>
  );
};

export const CustomNode: React.FC<NodeProps<CustomNodeData>> = ({ id, data, selected }) => {
  const context = useContext(TopologyContext);
  const updateNodeInternals = useUpdateNodeInternals();
  const nodeType = data.nodeType || 'generic';
  const bridges = data.bridges || [];
  const bridgeCount = bridges.length;

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, bridgeCount, updateNodeInternals]);

  // Calculate vertical offset for each bridge's handles
  // Positions handles relative to the bridge area (which starts below node content)
  const getBridgeOffset = (index: number) => {
    if (bridgeCount <= 1) return 15; // Slightly below center for single bridge (bridge area)
    // Bridge area starts at ~115px from node top, each bridge row is ~30px tall
    // Node center shifts down as more bridges are added
    const nodeCenterY = 108 + (bridgeCount * 15); // approximate node center
    const handleY = 115 + index * 30; // position of each bridge row from node top
    return handleY - nodeCenterY;
  };

  return (
    <div className={`custom-node custom-node-${nodeType} ${selected ? 'selected' : ''}`}>
      {/* Render one handle pair per bridge, positioned alongside each bridge row */}
      {bridges.map((bridge, index) => {
        const offsetY = getBridgeOffset(index);
        return (
          <React.Fragment key={`handles-${bridge.id}`}>
            {/* Input handle on left - accept connections for this bridge */}
            <Handle
              type="target"
              position={Position.Left}
              className={`node-handle node-handle-left bridge-handle-${index}`}
              id={bridge.id}
              isConnectable
              style={{ transform: `translate(-50%, -50%) translateY(${offsetY}px)` }}
            />

            {/* Output handle on right - create connections from this bridge */}
            <Handle
              type="source"
              position={Position.Right}
              className={`node-handle node-handle-right bridge-handle-${index}`}
              id={bridge.id}
              isConnectable
              style={{ transform: `translate(-50%, -50%) translateY(${offsetY}px)` }}
            />
          </React.Fragment>
        );
      })}

      <div className="node-content">
        <div className="node-icon">
          {nodeType === 'router' && '🔀'}
          {nodeType === 'client' && '💻'}
          {nodeType === 'server' && '🖥️'}
          {nodeType === 'dns' && '🌐'}
          {nodeType === 'generic' && '📦'}
        </div>

        <div className="node-label">
          <strong>{data.label}</strong>
          {data.replicas && <span className="replicas">×{data.replicas}</span>}
          {data.region && <small className="region">{data.region}</small>}
        </div>
      </div>

      <div className="bridge-list">
        {bridges.map(bridge => (
          <BridgeRow
            key={bridge.id}
            bridge={bridge}
            ip={data.bridgeIPs?.[bridge.id]}
            siblingNames={bridges.filter(b => b.id !== bridge.id).map(b => b.name)}
            onRename={name => context?.updateBridge(id, bridge.id, { name })}
            onRemove={() => context?.removeBridge(id, bridge.id)}
          />
        ))}
        <button className="bridge-add nodrag" onClick={() => context?.addBridge(id)}>
          + bridge
        </button>
      </div>
    </div>
  );
};

export default CustomNode;
