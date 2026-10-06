/**
 * Custom node component for topology
 */

import React, { useContext, useEffect, useState } from 'react';
import { Handle, Position, NodeProps, useUpdateNodeInternals } from 'reactflow';
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
      <Handle
        id={bridge.id}
        type="source"
        position={Position.Right}
        className="bridge-handle"
        style={{ right: -19 }}
      />
    </div>
  );
};

export const CustomNode: React.FC<NodeProps<CustomNodeData>> = ({ id, data, selected }) => {
  const context = useContext(TopologyContext);
  const updateNodeInternals = useUpdateNodeInternals();
  const nodeType = data.nodeType || 'generic';
  const bridges = data.bridges || [];
  const bridgeKey = bridges.map(b => b.id).join(',');

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, bridgeKey, updateNodeInternals]);

  return (
    <div className={`custom-node custom-node-${nodeType} ${selected ? 'selected' : ''}`}>
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
