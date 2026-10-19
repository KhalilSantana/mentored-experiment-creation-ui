/**
 * Environment variable editor for containers
 */

import React, { useState } from 'react';
import { EnvVar } from '../types/experiment';
import './EnvVarEditor.css';

interface EnvVarEditorProps {
  envVars: EnvVar[];
  onAddEnvVar: (envVar: EnvVar) => void;
  onRemoveEnvVar: (index: number) => void;
  onUpdateEnvVar: (index: number, envVar: EnvVar) => void;
}

export const EnvVarEditor: React.FC<EnvVarEditorProps> = ({
  envVars,
  onAddEnvVar,
  onRemoveEnvVar,
  onUpdateEnvVar,
}) => {
  const [newName, setNewName] = useState('');
  const [newValue, setNewValue] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleAdd = () => {
    if (newName.trim()) {
      onAddEnvVar({
        name: newName,
        value: newValue,
      });
      setNewName('');
      setNewValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Only prevent Enter for text inputs, not for textareas (where Enter = newline)
    if (e.key === 'Enter' && e.currentTarget.tagName === 'INPUT') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="env-var-editor">
      <div className="env-var-list">
        {envVars.map((envVar, idx) => (
          <div key={idx} className="env-var-row">
            <input
              type="text"
              value={envVar.name}
              onChange={(e) =>
                onUpdateEnvVar(idx, { ...envVar, name: e.target.value })
              }
              placeholder="VARIABLE_NAME"
              className="env-var-name"
              disabled={editingIndex !== null && editingIndex !== idx}
            />
            <textarea
              value={envVar.value}
              onChange={(e) =>
                onUpdateEnvVar(idx, { ...envVar, value: e.target.value })
              }
              placeholder="value"
              className="env-var-value"
              disabled={editingIndex !== null && editingIndex !== idx}
              rows={2}
            />
            <button
              className="btn-delete-env"
              onClick={() => onRemoveEnvVar(idx)}
              title="Remove environment variable"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="env-var-input">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="VARIABLE_NAME"
          className="env-var-name"
        />
        <textarea
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="value"
          className="env-var-value"
          rows={2}
        />
        <button className="btn-add-env" onClick={handleAdd}>
          Add
        </button>
      </div>
    </div>
  );
};

export default EnvVarEditor;
