/**
 * Node actor configuration panel
 */

import React, { useState } from 'react';
import { NodeActor } from '../types/experiment';
import { validateNodeName } from '../utils/validators';
import './NodeActorPanel.css';

interface NodeActorPanelProps {
  nodeActor: NodeActor;
  onUpdate: (nodeId: string, updates: Partial<NodeActor>) => void;
}

export const NodeActorPanel: React.FC<NodeActorPanelProps> = ({ nodeActor, onUpdate }) => {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleFieldChange = (field: keyof NodeActor, value: any) => {
    const newErrors = { ...errors };

    // Validation
    if (field === 'name') {
      if (!validateNodeName(value)) {
        newErrors.name = 'Invalid node name (1-32 chars, alphanumeric + hyphens)';
      } else {
        delete newErrors.name;
      }
    }

    if (field === 'replicas') {
      const num = parseInt(value, 10);
      if (isNaN(num) || num < 1 || num > 100) {
        newErrors.replicas = 'Replicas must be 1-100';
      } else {
        delete newErrors.replicas;
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      const update: Partial<NodeActor> = {};
      update[field as keyof NodeActor] = field === 'replicas' ? parseInt(value, 10) : value;
      onUpdate(nodeActor.name, update);
    }
  };

  const handleAddContainer = () => {
    onUpdate(nodeActor.name, {
      containers: [
        ...(nodeActor.containers || []),
        {
          name: `container-${Date.now()}`,
          image: 'ubuntu:latest',
          imagePullPolicy: 'IfNotPresent',
          command: [],
          args: [],
          env: [],
          ports: [],
        },
      ],
    });
  };

  return (
    <div className="node-actor-panel">
      <h3 className="panel-title">Node Configuration</h3>

      {/* Name */}
      <div className="form-group">
        <label>Name</label>
        <input
          type="text"
          value={nodeActor.name}
          onChange={(e) => handleFieldChange('name', e.target.value)}
          onFocus={() => setEditingField('name')}
          onBlur={() => setEditingField(null)}
          className={errors.name ? 'input-error' : ''}
          placeholder="node-name"
        />
        {errors.name && <span className="error-text">{errors.name}</span>}
        <small className="hint-text">1-32 chars, alphanumeric + hyphens</small>
      </div>

      {/* Replicas */}
      <div className="form-group">
        <label>Replicas</label>
        <input
          type="number"
          value={nodeActor.replicas}
          onChange={(e) => handleFieldChange('replicas', e.target.value)}
          min="1"
          max="100"
          className={errors.replicas ? 'input-error' : ''}
        />
        {errors.replicas && <span className="error-text">{errors.replicas}</span>}
        <small className="hint-text">Number of pod replicas (1-100)</small>
      </div>

      {/* Region */}
      <div className="form-group">
        <label>Region</label>
        <input
          type="text"
          value={nodeActor.region || ''}
          onChange={(e) => handleFieldChange('region', e.target.value || 'default')}
          placeholder="default"
        />
        <small className="hint-text">Deployment region or zone</small>
      </div>

      {/* Cluster */}
      <div className="form-group">
        <label>Cluster</label>
        <input
          type="text"
          value={nodeActor.cluster || ''}
          onChange={(e) => handleFieldChange('cluster', e.target.value)}
          placeholder="default-cluster"
        />
        <small className="hint-text">Target Kubernetes cluster</small>
      </div>

      {/* Persistent Volume Path */}
      <div className="form-group">
        <label>Persistent Volume Path</label>
        <input
          type="text"
          value={nodeActor.persistent_volume_path || ''}
          onChange={(e) => handleFieldChange('persistent_volume_path', e.target.value)}
          placeholder="/data"
        />
        <small className="hint-text">Mount path for persistent storage</small>
      </div>

      {/* Containers Section */}
      <div className="section">
        <div className="section-header">
          <h4>Containers ({(nodeActor.containers || []).length})</h4>
          <button className="btn-add-container" onClick={handleAddContainer}>
            + Add Container
          </button>
        </div>
        {(nodeActor.containers || []).length === 0 && (
          <p className="empty-state">No containers configured. Click "+ Add Container" to create one.</p>
        )}
      </div>
    </div>
  );
};

export default NodeActorPanel;
