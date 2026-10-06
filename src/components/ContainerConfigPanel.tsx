/**
 * Container configuration panel
 */

import React, { useState } from 'react';
import { Container } from '../types/experiment';
import EnvVarEditor from './EnvVarEditor';
import './ContainerConfigPanel.css';

interface ContainerConfigPanelProps {
  nodeId: string;
  container: Container;
  containerIndex: number;
  onUpdate: (container: Container) => void;
  onRemove: () => void;
}

export const ContainerConfigPanel: React.FC<ContainerConfigPanelProps> = ({
  nodeId,
  container,
  containerIndex,
  onUpdate,
  onRemove,
}) => {
  const [newPort, setNewPort] = useState('');

  const handleFieldChange = (field: keyof Container, value: any) => {
    onUpdate({
      ...container,
      [field]: value,
    });
  };

  const handleAddPort = () => {
    if (newPort) {
      const portNum = parseInt(newPort, 10);
      if (!isNaN(portNum) && portNum > 0 && portNum <= 65535) {
        onUpdate({
          ...container,
          ports: [
            ...(container.ports || []),
            { containerPort: portNum },
          ],
        });
        setNewPort('');
      }
    }
  };

  const handleRemovePort = (index: number) => {
    onUpdate({
      ...container,
      ports: (container.ports || []).filter((_, i) => i !== index),
    });
  };

  return (
    <div className="container-config-panel">
      <div className="panel-header">
        <h3>Container {containerIndex + 1}</h3>
        <button className="btn-remove" onClick={onRemove} title="Remove container">
          ✕
        </button>
      </div>

      {/* Image */}
      <div className="form-group">
        <label>Image</label>
        <input
          type="text"
          value={container.image}
          onChange={(e) => handleFieldChange('image', e.target.value)}
          placeholder="ubuntu:latest"
        />
        <small className="hint-text">Container image URI</small>
      </div>

      {/* Image Pull Policy */}
      <div className="form-group">
        <label>Image Pull Policy</label>
        <select
          value={container.imagePullPolicy || 'IfNotPresent'}
          onChange={(e) => handleFieldChange('imagePullPolicy', e.target.value)}
        >
          <option value="Always">Always</option>
          <option value="IfNotPresent">IfNotPresent</option>
          <option value="Never">Never</option>
        </select>
      </div>

      {/* Command */}
      <div className="form-group">
        <label>Command</label>
        <textarea
          value={(container.command || []).join('\n')}
          onChange={(e) => handleFieldChange('command', e.target.value.split('\n').filter(c => c.trim()))}
          placeholder="bash&#10;-c"
          rows={3}
        />
        <small className="hint-text">One per line</small>
      </div>

      {/* Arguments */}
      <div className="form-group">
        <label>Arguments</label>
        <textarea
          value={(container.args || []).join('\n')}
          onChange={(e) => handleFieldChange('args', e.target.value.split('\n').filter(c => c.trim()))}
          placeholder="--verbose&#10;--config=/etc/config"
          rows={3}
        />
        <small className="hint-text">One per line</small>
      </div>

      {/* Ports Section */}
      <div className="section">
        <div className="section-header">
          <h4>Ports ({(container.ports || []).length})</h4>
        </div>
        {(container.ports || []).length === 0 ? (
          <p className="empty-state">No ports configured</p>
        ) : (
          <div className="ports-list">
            {(container.ports || []).map((port, idx) => (
              <div key={idx} className="port-item">
                <span className="port-number">{port.containerPort}</span>
                <button
                  className="btn-remove-item"
                  onClick={() => handleRemovePort(idx)}
                  title="Remove port"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="add-port">
          <input
            type="number"
            value={newPort}
            onChange={(e) => setNewPort(e.target.value)}
            placeholder="Port number"
            min="1"
            max="65535"
          />
          <button onClick={handleAddPort} className="btn-add-item">
            + Add
          </button>
        </div>
      </div>

      {/* Environment Variables Section */}
      <div className="section">
        <div className="section-header">
          <h4>Environment Variables ({(container.env || []).length})</h4>
          <small className="hint-text">User-defined variables (auto-generated: MENTORED_*)</small>
        </div>
        <EnvVarEditor
          envVars={container.env || []}
          onAddEnvVar={(envVar) =>
            handleFieldChange('env', [...(container.env || []), envVar])
          }
          onUpdateEnvVar={(index, envVar) => {
            const updated = [...(container.env || [])];
            updated[index] = envVar;
            handleFieldChange('env', updated);
          }}
          onRemoveEnvVar={(index) =>
            handleFieldChange(
              'env',
              (container.env || []).filter((_, i) => i !== index)
            )
          }
        />
      </div>

      {/* Resources */}
      <div className="section">
        <h4>Resources (Optional)</h4>
        <div className="form-row">
          <div className="form-group">
            <label>CPU Limit</label>
            <input
              type="text"
              value={container.resources?.limits?.cpu || ''}
              onChange={(e) =>
                handleFieldChange('resources', {
                  ...container.resources,
                  limits: {
                    ...container.resources?.limits,
                    cpu: e.target.value || undefined,
                  },
                })
              }
              placeholder="1000m"
            />
          </div>
          <div className="form-group">
            <label>Memory Limit</label>
            <input
              type="text"
              value={container.resources?.limits?.memory || ''}
              onChange={(e) =>
                handleFieldChange('resources', {
                  ...container.resources,
                  limits: {
                    ...container.resources?.limits,
                    memory: e.target.value || undefined,
                  },
                })
              }
              placeholder="512Mi"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContainerConfigPanel;
