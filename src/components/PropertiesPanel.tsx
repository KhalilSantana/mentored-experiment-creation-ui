/**
 * Properties panel - Composite view for node/edge configuration
 */

import React, { useContext, useState } from 'react';
import { TopologyContext } from '../hooks/useTopology';
import { UIBridge } from '../types/experiment';
import { resolveBridgeIPs } from '../utils/addressing';
import { validateBridgeName } from '../utils/topologyConfigGenerator';
import { validateSubnet } from '../utils/validators';
import NodeActorPanel from './NodeActorPanel';
import ContainerConfigPanel from './ContainerConfigPanel';
import ScriptPanel from './ScriptPanel';
import { RouteEditor } from './RouteEditor';
import './PropertiesPanel.css';

interface BridgeEditorProps {
  bridge: UIBridge;
  autoIP?: string;
  siblingNames: string[];
  onUpdate: (updates: Partial<Omit<UIBridge, 'id'>>) => void;
  onRemove: () => void;
}

const BridgeEditor: React.FC<BridgeEditorProps> = ({ bridge, autoIP, siblingNames, onUpdate, onRemove }) => {
  const [name, setName] = useState(bridge.name);
  const [ip, setIp] = useState(bridge.ip || '');
  const nameInvalid = !validateBridgeName(name) || siblingNames.includes(name);
  const ipInvalid = ip !== '' && !validateSubnet(ip);

  return (
    <div className="bridge-editor">
      <div className="bridge-editor-row">
        <input
          value={name}
          className={nameInvalid ? 'input-error' : ''}
          onChange={e => setName(e.target.value)}
          onBlur={() => (nameInvalid ? setName(bridge.name) : onUpdate({ name }))}
          placeholder="bridge name"
        />
        <button className="bridge-delete-btn" onClick={onRemove} title="Delete bridge">
          ✕
        </button>
      </div>
      <div className="bridge-editor-row">
        <input
          value={ip}
          className={ipInvalid ? 'input-error' : ''}
          onChange={e => setIp(e.target.value)}
          onBlur={() => (ipInvalid ? setIp(bridge.ip || '') : onUpdate({ ip: ip || undefined }))}
          placeholder={autoIP ? `auto: ${autoIP}` : 'IP/CIDR (auto)'}
        />
        <input
          type="number"
          min="576"
          max="9000"
          value={bridge.mtu ?? 1280}
          onChange={e => onUpdate({ mtu: parseInt(e.target.value, 10) || 1280 })}
          title="MTU"
        />
      </div>
    </div>
  );
};

export const PropertiesPanel: React.FC = () => {
  const context = useContext(TopologyContext);
  if (!context) {
    throw new Error('PropertiesPanel must be used within TopologyContext provider');
  }

  const {
    state,
    updateNodeActor,
    addScript,
    removeScript,
    updateScript,
    updateContainerInNode,
    removeContainerFromNode,
    addBridge,
    updateBridge,
    removeBridge,
    removeVXLANEdge,
    addRoute,
    updateRoute,
    removeRoute,
    setSelectedEdge,
  } = context;

  const selectedNode = state.experiment.nodeactors.find(n => n.name === state.selectedNodeId);
  const selectedEdge = state.vxlanEdges.find(e => e.id === state.selectedEdgeId);
  const bridgeIPs = resolveBridgeIPs(state.experiment.nodeactors, state.vxlanEdges);
  const bridgeLabel = (nodeId: string, bridgeId: string) =>
    state.experiment.nodeactors.find(n => n.name === nodeId)?.bridges?.find(b => b.id === bridgeId)?.name ?? '?';

  if (!selectedNode && !selectedEdge) {
    return (
      <div className="properties-panel empty">
        <div className="empty-state">
          <p>Select a node or connection to view properties</p>
          <small>Click on a node or edge in the canvas</small>
        </div>
      </div>
    );
  }

  if (selectedEdge) {
    return (
      <div className="properties-panel edge-properties">
        <h3>VXLAN Connection Properties</h3>
        <div className="property-group">
          <label>From</label>
          <span className="property-value">
            {selectedEdge.source} / {bridgeLabel(selectedEdge.source, selectedEdge.sourceBridgeId)}
          </span>
        </div>
        <div className="property-group">
          <label>To</label>
          <span className="property-value">
            {selectedEdge.target} / {bridgeLabel(selectedEdge.target, selectedEdge.targetBridgeId)}
          </span>
        </div>
        <div className="property-group">
          <label>VNI</label>
          <span className="property-value">{selectedEdge.vni}</span>
        </div>
        <button
          className="bridge-delete-tunnel"
          onClick={() => {
            removeVXLANEdge(selectedEdge.id);
            setSelectedEdge(undefined);
          }}
        >
          Delete tunnel
        </button>
      </div>
    );
  }

  if (!selectedNode) {
    return null;
  }

  return (
    <div className="properties-panel node-properties">
      {/* Node Actor Properties */}
      <NodeActorPanel
        nodeActor={selectedNode}
        onUpdate={(nodeId, updates) => updateNodeActor(nodeId, updates)}
      />

      {/* Bridges */}
      <div className="bridges-section">
        <h3>Bridges</h3>
        {(selectedNode.bridges || []).map(bridge => (
          <BridgeEditor
            key={bridge.id}
            bridge={bridge}
            autoIP={bridgeIPs.get(bridge.id)}
            siblingNames={(selectedNode.bridges || []).filter(b => b.id !== bridge.id).map(b => b.name)}
            onUpdate={updates => updateBridge(selectedNode.name, bridge.id, updates)}
            onRemove={() => removeBridge(selectedNode.name, bridge.id)}
          />
        ))}
        <button className="bridge-add-btn" onClick={() => addBridge(selectedNode.name)}>
          + bridge
        </button>
      </div>

      {/* Routes */}
      {selectedNode && (
        <RouteEditor
          routes={selectedNode.routes || []}
          onAddRoute={(route) => addRoute(selectedNode.name, route)}
          onUpdateRoute={(index, route) => updateRoute(selectedNode.name, index, route)}
          onRemoveRoute={(index) => removeRoute(selectedNode.name, index)}
        />
      )}

      {/* Containers */}
      <div className="containers-section">
        <h3>Containers</h3>
        {(selectedNode.containers || []).filter(c => 'image' in c).map((container, idx) => (
          <ContainerConfigPanel
            key={idx}
            nodeId={selectedNode.name}
            container={container as any}
            containerIndex={idx}
            onUpdate={(updated) => updateContainerInNode(selectedNode.name, idx, updated)}
            onRemove={() => removeContainerFromNode(selectedNode.name, idx)}
          />
        ))}
      </div>

      {/* Scripts (experiment-level) */}
      <div className="scripts-section">
        <ScriptPanel
          scripts={state.experiment.scripts || []}
          onAddScript={addScript}
          onRemoveScript={removeScript}
          onUpdateScript={updateScript}
        />
      </div>
    </div>
  );
};

export default PropertiesPanel;
