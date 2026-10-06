/**
 * Per-node MENTORED_TOPOLOGY_CONFIG preview panel
 */

import React, { useMemo } from 'react';
import { Experiment, VXLANEdge } from '../types/experiment';
import { resolveBridgeIPs } from '../utils/addressing';
import {
  generateNodeTopologyConfig,
  topologyConfigToJSON,
  validateNodeTopology,
} from '../utils/topologyConfigGenerator';
import './TopologyConfigPanel.css';

interface TopologyConfigPanelProps {
  experiment: Experiment;
  vxlanEdges: VXLANEdge[];
  selectedNodeId?: string;
}

export const TopologyConfigPanel: React.FC<TopologyConfigPanelProps> = ({
  experiment,
  vxlanEdges,
  selectedNodeId,
}) => {
  const [expanded, setExpanded] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [pickedNode, setPickedNode] = React.useState<string>('');

  const nodes = experiment.nodeactors;
  const node =
    nodes.find(n => n.name === pickedNode) ||
    nodes.find(n => n.name === selectedNodeId) ||
    nodes[0];

  const problemsByNode = useMemo(
    () => new Map(nodes.map(n => [n.name, validateNodeTopology(n, vxlanEdges)])),
    [nodes, vxlanEdges]
  );
  const invalidCount = Array.from(problemsByNode.values()).filter(p => p.length > 0).length;

  const topologyConfig = useMemo(
    () =>
      node
        ? generateNodeTopologyConfig(node, nodes, vxlanEdges, resolveBridgeIPs(nodes, vxlanEdges))
        : null,
    [node, nodes, vxlanEdges]
  );
  const configJSON = topologyConfig ? topologyConfigToJSON(topologyConfig) : '';
  const problems = node ? problemsByNode.get(node.name) || [] : [];

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(configJSON);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="topology-config-panel">
      <div className="panel-header">
        <button className="toggle-btn" onClick={() => setExpanded(!expanded)}>
          {expanded ? '▼' : '▶'} MENTORED_TOPOLOGY_CONFIG
        </button>
        <div className="status-badge">
          {invalidCount === 0 ? (
            <span className="status-valid">✓ Valid</span>
          ) : (
            <span className="status-invalid">✗ {invalidCount} node(s) with problems</span>
          )}
        </div>
      </div>

      {expanded && (
        <div className="panel-content">
          {!node || !topologyConfig ? (
            <p>No node actors yet. Right-click the canvas to add one.</p>
          ) : (
            <>
              <div className="info-section">
                <h4>
                  Node{' '}
                  <select
                    className="node-select"
                    value={node.name}
                    onChange={e => setPickedNode(e.target.value)}
                  >
                    {nodes.map(n => (
                      <option key={n.name} value={n.name}>
                        {n.name}
                        {(problemsByNode.get(n.name) || []).length > 0 ? ' ⚠' : ''}
                      </option>
                    ))}
                  </select>
                </h4>
                <div className="summary">
                  <div className="summary-item">
                    <span className="label">Bridges:</span>
                    <span className="value">{topologyConfig.bridges?.length || 0}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">VXLAN Interfaces:</span>
                    <span className="value">{topologyConfig.interfaces?.length || 0}</span>
                  </div>
                </div>
              </div>

              <div className="json-section">
                <div className="json-header">
                  <h4>JSON Output</h4>
                  <button className="btn-copy" onClick={handleCopyToClipboard}>
                    {copied ? '✓ Copied' : 'Copy to Clipboard'}
                  </button>
                </div>
                <pre className="json-content">{configJSON}</pre>
                <p className="hint-text">
                  Exported as MENTORED_TOPOLOGY_CONFIG in every container of this node actor
                </p>
              </div>

              {problems.length > 0 && (
                <div className="warning-section">
                  <h4>⚠ Problems</h4>
                  {problems.map(p => (
                    <p key={p}>{p}</p>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default TopologyConfigPanel;
