/**
 * Modal for configuring a VXLAN tunnel between two bridges
 */

import React, { useState } from 'react';
import { NodeActor, VXLANEdge } from '../types/experiment';
import { validateVNI } from '../utils/validators';
import './VXLANConnectionPanel.css';

export interface PendingConnection {
  source: string;
  target: string;
  sourceBridgeId: string;
  targetBridgeId: string;
}

export interface VXLANConnectionPanelProps {
  connection: PendingConnection;
  nodeactors: NodeActor[];
  onConfirm: (edge: VXLANEdge) => void;
  onCancel: () => void;
  suggestedVNI?: number;
  existingVNIs?: Set<number>;
}

export const VXLANConnectionPanel: React.FC<VXLANConnectionPanelProps> = ({
  connection,
  nodeactors,
  onConfirm,
  onCancel,
  suggestedVNI = 100,
  existingVNIs = new Set(),
}) => {
  const [vni, setVni] = useState<string>(String(suggestedVNI));
  const [error, setError] = useState<string>('');

  const bridgeName = (nodeId: string, bridgeId: string) =>
    nodeactors.find(n => n.name === nodeId)?.bridges?.find(b => b.id === bridgeId)?.name ?? '?';

  const handleConfirm = () => {
    const vniNum = Number(vni);
    if (!Number.isInteger(vniNum) || !validateVNI(vniNum)) {
      setError('VNI must be an integer between 0 and 16777215');
      return;
    }
    if (existingVNIs.has(vniNum)) {
      setError('VNI already in use');
      return;
    }

    onConfirm({
      id: `edge-${connection.sourceBridgeId}-${connection.targetBridgeId}`,
      source: connection.source,
      target: connection.target,
      sourceBridgeId: connection.sourceBridgeId,
      targetBridgeId: connection.targetBridgeId,
      vni: vniNum,
    });
  };

  return (
    <div className="vxlan-connection-modal-overlay">
      <div className="vxlan-connection-modal">
        <div className="modal-header">
          <h3>Configure VXLAN Tunnel</h3>
          <button className="close-btn" onClick={onCancel}>✕</button>
        </div>

        <div className="modal-body">
          <div className="connection-info">
            <p>
              <strong>Source:</strong> {connection.source} / {bridgeName(connection.source, connection.sourceBridgeId)}
            </p>
            <p>
              <strong>Target:</strong> {connection.target} / {bridgeName(connection.target, connection.targetBridgeId)}
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="vni">
              VNI (VXLAN Network Identifier)
              <span className="hint">Auto-increments from 100</span>
            </label>
            <input
              id="vni"
              type="number"
              min="0"
              max="16777215"
              value={vni}
              onChange={e => {
                setVni(e.target.value);
                setError('');
              }}
              className={error ? 'error' : ''}
            />
            {error && <span className="error-text">{error}</span>}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn-confirm" onClick={handleConfirm}>
            Create Tunnel
          </button>
        </div>
      </div>
    </div>
  );
};

export default VXLANConnectionPanel;
