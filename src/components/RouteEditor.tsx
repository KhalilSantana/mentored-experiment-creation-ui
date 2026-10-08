/**
 * Route editor component for managing static routes on a node
 */

import React from 'react';
import { Route } from '../types/experiment';
import './RouteEditor.css';

interface RouteEditorProps {
  routes: Route[];
  onAddRoute: (route: Route) => void;
  onUpdateRoute: (index: number, route: Route) => void;
  onRemoveRoute: (index: number) => void;
}

const emptyRoute = (): Route => ({
  to: 'default',
  via: '',
  dev: '',
  onlink: true,
});

export const RouteEditor: React.FC<RouteEditorProps> = ({
  routes,
  onAddRoute,
  onUpdateRoute,
  onRemoveRoute,
}) => {
  const handleAddEmpty = () => {
    onAddRoute(emptyRoute());
  };

  return (
    <div className="route-editor">
      <div className="route-editor-header">
        <h4>Static Routes</h4>
        <button className="btn-add-route" onClick={handleAddEmpty}>
          + Route
        </button>
      </div>

      {routes.length === 0 && (
        <p className="empty-state">No routes configured. Click "+ Route" to add one.</p>
      )}

      <div className="routes-list">
        {routes.map((route, index) => (
          <div key={index} className="route-item">
            <div className="route-item-header">
              <span className="route-label">Route {index + 1}</span>
              <button
                className="btn-remove-route"
                onClick={() => onRemoveRoute(index)}
                title="Remove route"
              >
                ✕
              </button>
            </div>

            <div className="route-fields">
              <div className="form-group">
                <label>Destination</label>
                <input
                  type="text"
                  value={route.to || ''}
                  onChange={e =>
                    onUpdateRoute(index, { ...route, to: e.target.value || undefined })
                  }
                  placeholder="default or CIDR (e.g., 10.0.0.0/8)"
                />
                <small className="hint-text">
                  Use <code>default</code> for default route, or a CIDR like <code>10.0.0.0/8</code>
                </small>
              </div>

              <div className="form-group">
                <label>Gateway</label>
                <input
                  type="text"
                  value={route.via || ''}
                  onChange={e =>
                    onUpdateRoute(index, { ...route, via: e.target.value || undefined })
                  }
                  placeholder="Gateway IP (e.g., 192.168.100.1)"
                />
                <small className="hint-text">Next-hop gateway IP address</small>
              </div>

              <div className="form-group">
                <label>Device</label>
                <input
                  type="text"
                  value={route.dev || ''}
                  onChange={e =>
                    onUpdateRoute(index, { ...route, dev: e.target.value || undefined })
                  }
                  placeholder="Interface name (e.g., office-lan)"
                />
                <small className="hint-text">
                  Interface name (bridge name or VXLAN interface)
                </small>
              </div>

              <div className="form-row">
                <div className="form-group checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={route.onlink || false}
                      onChange={e =>
                        onUpdateRoute(index, { ...route, onlink: e.target.checked })
                      }
                    />
                    <span>On-link</span>
                  </label>
                  <small className="hint-text">
                    Use <code>--onlink</code> for gateways not directly on-link
                  </small>
                </div>

                <div className="form-group">
                  <label>Metric</label>
                  <input
                    type="number"
                    value={route.metric !== undefined ? route.metric : ''}
                    onChange={e =>
                      onUpdateRoute(index, {
                        ...route,
                        metric: e.target.value ? parseInt(e.target.value, 10) : undefined,
                      })
                    }
                    placeholder="Optional"
                    min="0"
                  />
                  <small className="hint-text">Route priority (lower = higher priority)</small>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="route-preview">
              <span className="preview-label">Command preview:</span>
              <code className="preview-command">
                ip route replace {route.to || '<dest>'}
                {route.via ? ` via ${route.via}` : ''}
                {route.dev ? ` dev ${route.dev}` : ''}
                {route.metric !== undefined ? ` metric ${route.metric}` : ''}
                {route.onlink ? ' onlink' : ''}
              </code>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RouteEditor;
