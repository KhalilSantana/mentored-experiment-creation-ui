/**
 * Script reference panel
 */

import React from 'react';
import { Script } from '../types/experiment';
import ScriptEditor from './ScriptEditor';
import './ScriptPanel.css';

interface ScriptPanelProps {
  scripts: Script[];
  onAddScript: (script: Script) => void;
  onRemoveScript: (scriptId: string) => void;
  onUpdateScript?: (scriptId: string, updates: Partial<Script>) => void;
}

export const ScriptPanel: React.FC<ScriptPanelProps> = ({
  scripts,
  onAddScript,
  onRemoveScript,
  onUpdateScript,
}) => {
  const [scriptId, setScriptId] = React.useState('');
  const [scriptCode, setScriptCode] = React.useState('');
  const [scriptType, setScriptType] = React.useState<
    'python' | 'python3' | 'shellscript' | 'sh' | 'bash'
  >('bash');

  const handleAddScript = () => {
    if (scriptId && scriptCode) {
      onAddScript({
        script_id: scriptId,
        script_type: scriptType,
        script_code: scriptCode,
      });
      setScriptId('');
      setScriptCode('');
      setScriptType('bash');
    }
  };

  return (
    <div className="script-panel">
      <h3 className="panel-title">Scripts</h3>

      {scripts.length === 0 ? (
        <p className="empty-state">No scripts configured</p>
      ) : (
        <div className="scripts-list">
          {scripts.map((script) => (
            <ScriptEditor
              key={script.script_id}
              script={script}
              onUpdate={(updates) => {
                if (onUpdateScript) {
                  onUpdateScript(script.script_id, updates);
                }
              }}
              onRemove={() => onRemoveScript(script.script_id)}
            />
          ))}
        </div>
      )}

      <div className="section">
        <h4>Add New Script</h4>

        {/* Script ID */}
        <div className="form-group">
          <label>Script ID</label>
          <input
            type="text"
            value={scriptId}
            onChange={(e) => setScriptId(e.target.value)}
            placeholder="setup-network"
          />
          <small className="hint-text">Unique script identifier</small>
        </div>

        {/* Script Type */}
        <div className="form-group">
          <label>Script Type</label>
          <select
            value={scriptType}
            onChange={(e) => setScriptType(e.target.value as any)}
          >
            <option value="bash">Bash</option>
            <option value="sh">Shell</option>
            <option value="shellscript">Shell Script</option>
            <option value="python">Python</option>
            <option value="python3">Python 3</option>
          </select>
        </div>

        {/* Script Code */}
        <div className="form-group">
          <label>Script Code</label>
          <textarea
            value={scriptCode}
            onChange={(e) => setScriptCode(e.target.value)}
            placeholder="#!/bin/bash\necho 'Hello'\n"
            rows={4}
          />
        </div>

        <button className="btn-add-script" onClick={handleAddScript}>
          + Add Script
        </button>
      </div>
    </div>
  );
};

export default ScriptPanel;
