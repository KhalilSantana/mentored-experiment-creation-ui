/**
 * Main app component
 */

import { TopologyContext, useTopology } from './hooks/useTopology';
import TopologyCanvas from './components/TopologyCanvas';
import PropertiesPanel from './components/PropertiesPanel';
import TopologyConfigPanel from './components/TopologyConfigPanel';
import { experimentToYAML } from './utils/yamlGenerator';
import './App.css';
import React, { useRef, useState, useCallback, useEffect } from 'react';

interface AppState {
  leftWidth: number;
  rightWidth: number;
  isResizingLeft: boolean;
  isResizingRight: boolean;
}

function App() {
  const topologyContext = useTopology();
  const [state, setState] = useState<AppState>({
    leftWidth: 220,
    rightWidth: 320,
    isResizingLeft: false,
    isResizingRight: false,
  });

  const appBodyRef = useRef<HTMLDivElement>(null);

  const handleMouseDownLeft = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setState(s => ({ ...s, isResizingLeft: true }));
  }, []);

  const handleMouseDownRight = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setState(s => ({ ...s, isResizingRight: true }));
  }, []);

  useEffect(() => {
    if (!state.isResizingLeft && !state.isResizingRight) return;

    const handleMouseMove = (e: MouseEvent) => {
      const appBody = appBodyRef.current;
      if (!appBody) return;

      const rect = appBody.getBoundingClientRect();

      if (state.isResizingLeft) {
        const newWidth = Math.max(160, Math.min(400, e.clientX - rect.left));
        setState(s => ({ ...s, leftWidth: newWidth }));
      }

      if (state.isResizingRight) {
        const newWidth = Math.max(200, Math.min(800, rect.right - e.clientX));
        setState(s => ({ ...s, rightWidth: newWidth }));
      }
    };

    const handleMouseUp = () => {
      setState(s => ({
        ...s,
        isResizingLeft: false,
        isResizingRight: false,
      }));
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [state.isResizingLeft, state.isResizingRight]);

  const handleFileUpload = (callback: (text: string) => void) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.yaml,.yml';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        callback(text);
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleExportYAML = () => {
    const yaml = experimentToYAML(topologyContext.state.experiment, topologyContext.state.vxlanEdges);
    const blob = new Blob([yaml], { type: 'application/x-yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${topologyContext.state.experiment.name || 'experiment'}.yaml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportYAML = () => {
    handleFileUpload((text) => {
      try {
        const YAML = require('js-yaml');
        const parsed = YAML.load(text) as any;
        const experiment = parsed.Experiment || parsed;
        if (experiment.name && experiment.nodeactors) {
          topologyContext.importExperiment(experiment);
        }
      } catch (err) {
        console.error('Failed to import YAML:', err);
        alert('Failed to import YAML file');
      }
    });
  };

  const handleExportSettings = () => {
    const settings = {
      experiment: topologyContext.state.experiment,
      vxlanEdges: topologyContext.state.vxlanEdges,
      vniCounter: topologyContext.state.vniCounter,
      drawing: topologyContext.state.experiment.drawing,
    };
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${settings.experiment.name || 'experiment'}-settings.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportSettings = () => {
    handleFileUpload((text) => {
      try {
        const settings = JSON.parse(text);
        if (settings.experiment && settings.vxlanEdges) {
          topologyContext.importExperiment(settings.experiment);
        }
      } catch (err) {
        console.error('Failed to import settings:', err);
        alert('Failed to import settings file');
      }
    });
  };

  return (
    <TopologyContext.Provider value={topologyContext}>
      <div className="app-container">
        {/* Compact toolbar */}
        <div className="app-toolbar">
          <div className="toolbar-left">
            <span className="toolbar-title">MENTORED Topology Editor</span>
          </div>
          <div className="toolbar-actions">
            <button className="toolbar-btn" onClick={handleImportYAML} title="Import YAML topology">
              📂 Import YAML
            </button>
            <button className="toolbar-btn" onClick={handleExportYAML} title="Export topology as YAML">
              📥 Export YAML
            </button>
            <button className="toolbar-btn" onClick={handleImportSettings} title="Import saved settings">
              📋 Load Settings
            </button>
            <button className="toolbar-btn" onClick={handleExportSettings} title="Export current settings">
              💾 Save Settings
            </button>
          </div>
        </div>

        <div className="app-body" ref={appBodyRef}>
          <aside
            className="app-sidebar-left"
            style={{ width: state.leftWidth }}
          >
            <div className="sidebar-section">
              <div className="sidebar-section-header">
                <h3>Node Actors</h3>
                <button className="btn-add-node" onClick={() => {
                  const name = prompt('Enter node name:');
                  if (name && name.trim()) {
                    topologyContext.addNodeActor({
                      name: name.trim(),
                      replicas: 1,
                      region: 'default',
                      containers: [{
                        name: 'main',
                        image: 'ghcr.io/khalilsantana/mentored-base-utils:latest',
                        imagePullPolicy: 'Always',
                        command: ['/entry.sh'],
                        args: ['sleep', 'infinity'],
                        securityContext: { privileged: true },
                      }],
                    });
                  }
                }}>+ Add</button>
              </div>
              <div className="node-list">
                {topologyContext.state.experiment.nodeactors.map(node => (
                  <div
                    key={node.name}
                    className={`node-item ${
                      topologyContext.state.selectedNodeId === node.name
                        ? 'selected'
                        : ''
                    }`}
                    onClick={() => topologyContext.setSelectedNode(node.name)}
                  >
                    {node.name}
                    <span className="replicas-badge">{node.replicas}x</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <div
            className={`resize-handle-left ${state.isResizingLeft ? 'active' : ''}`}
            onMouseDown={handleMouseDownLeft}
          />

          <main className="app-canvas">
            <TopologyCanvas />
          </main>

          <div className="app-sidebar-right-wrapper">
            <aside
              className="app-sidebar-right"
              style={{ width: state.rightWidth }}
            >
              <PropertiesPanel />
            </aside>

            <div
              className={`resize-handle-right ${state.isResizingRight ? 'active' : ''}`}
              onMouseDown={handleMouseDownRight}
            />
          </div>
        </div>

        <footer className="app-footer">
          <TopologyConfigPanel
            experiment={topologyContext.state.experiment}
            vxlanEdges={topologyContext.state.vxlanEdges}
            selectedNodeId={topologyContext.state.selectedNodeId}
          />
          <div className="status-info">
            <span>
              Nodes: {topologyContext.state.experiment.nodeactors.length} |
              Edges: {topologyContext.state.vxlanEdges.length} |
              VNI Counter: {topologyContext.state.vniCounter}
            </span>
          </div>
        </footer>
      </div>
    </TopologyContext.Provider>
  );
}

export default App;
