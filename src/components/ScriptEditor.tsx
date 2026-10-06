/**
 * Script editor component with syntax highlighting
 */

import React, { useState } from 'react';
import { Script } from '../types/experiment';
import './ScriptEditor.css';

export type ScriptType = 'bash' | 'sh' | 'python' | 'python3' | 'shellscript';

interface ScriptEditorProps {
  script: Script;
  onUpdate: (script: Script) => void;
  onRemove: () => void;
}

const SCRIPT_TYPES: ScriptType[] = ['bash', 'sh', 'python', 'python3', 'shellscript'];

/**
 * Simple syntax highlighter for script code
 */
const highlightCode = (code: string, type: ScriptType): React.ReactNode => {
  // For now, return plain text - can be enhanced with actual syntax highlighting
  // In a real application, would use a library like Prism.js or Highlight.js
  return code;
};

export const ScriptEditor: React.FC<ScriptEditorProps> = ({
  script,
  onUpdate,
  onRemove,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="script-editor">
      <div className="script-header">
        <div className="script-title-row">
          <button
            className="btn-expand-script"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '▼' : '▶'} Script ({script.script_id})
          </button>
          <select
            value={script.script_type || 'bash'}
            onChange={(e) =>
              onUpdate({
                ...script,
                script_type: e.target.value as ScriptType,
              })
            }
            className="script-type-select"
            disabled={!isExpanded}
          >
            {SCRIPT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isExpanded && (
        <div className="script-content">
          <textarea
            value={script.script_code || ''}
            onChange={(e) =>
              onUpdate({
                ...script,
                script_code: e.target.value,
              })
            }
            placeholder="Enter script code here..."
            className="script-code-textarea"
            spellCheck="false"
          />
          <div className="script-footer">
            <span className="script-lines">
              {(script.script_code || '').split('\n').length} lines
            </span>
            <button className="btn-remove-script" onClick={onRemove}>
              Remove Script
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScriptEditor;
