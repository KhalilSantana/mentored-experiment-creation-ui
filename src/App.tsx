/**
 * Main app component
 */

import { TopologyContext, useTopology } from './hooks/useTopology';
import TopologyCanvas from './components/TopologyCanvas';
import PropertiesPanel from './components/PropertiesPanel';
import TopologyConfigPanel from './components/TopologyConfigPanel';
import { experimentToYAML } from './utils/yamlGenerator';
import './App.css';

export const App = () => {
  const topologyContext = useTopology();

  const handleExport = () => {
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

  return (
    <TopologyContext.Provider value={topologyContext}>
      <div className="app-container">
        <header className="app-header">
          <h1>MENTORED Topology Editor</h1>
          <nav className="app-nav">
            <button className="nav-btn" onClick={handleExport}>📥 Export YAML</button>
            <button className="nav-btn">Edit</button>
            <button className="nav-btn">Help</button>
          </nav>
        </header>

        <div className="app-body">
          <aside className="app-sidebar-left">
            <div className="sidebar-section">
              <h3>Node Actors</h3>
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
              <button className="btn-add-node">+ Add Node</button>
            </div>
          </aside>

          <main className="app-canvas">
            <TopologyCanvas />
          </main>

          <aside className="app-sidebar-right">
            <PropertiesPanel />
          </aside>
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
};

export default App;
