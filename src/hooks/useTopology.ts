/**
 * Central hook for managing topology state
 */

import { useCallback, useState, createContext } from 'react';
import { Experiment, NodeActor, VXLANEdge, UIState, Container, Script, UIBridge, Route } from '../types/experiment';

interface TopologyContextType {
  state: UIState;
  addNodeActor: (node: NodeActor) => void;
  updateNodeActor: (nodeId: string, updates: Partial<NodeActor>) => void;
  removeNodeActor: (nodeId: string) => void;
  addBridge: (nodeId: string) => void;
  updateBridge: (nodeId: string, bridgeId: string, updates: Partial<Omit<UIBridge, 'id'>>) => void;
  removeBridge: (nodeId: string, bridgeId: string) => void;
  addVXLANEdge: (edge: VXLANEdge) => void;
  updateVXLANEdge: (edgeId: string, updates: Partial<VXLANEdge>) => void;
  removeVXLANEdge: (edgeId: string) => void;
  addRoute: (nodeId: string, route: Route) => void;
  updateRoute: (nodeId: string, routeIndex: number, route: Route) => void;
  removeRoute: (nodeId: string, routeIndex: number) => void;
  updateContainerInNode: (nodeId: string, containerIndex: number, container: Container) => void;
  removeContainerFromNode: (nodeId: string, containerIndex: number) => void;
  addScript: (script: Script) => void;
  removeScript: (scriptId: string) => void;
  updateScript: (scriptId: string, updates: Partial<Script>) => void;
  setSelectedNode: (nodeId?: string) => void;
  setSelectedEdge: (edgeId?: string) => void;
  exportExperiment: () => Experiment;
  importExperiment: (exp: Experiment) => void;
  importExperimentWithEdges: (exp: Experiment) => void;
  resetTopology: () => void;
}

const defaultExperiment: Experiment = {
  name: 'New Experiment',
  nodeactors: [],
};

const defaultState: UIState = {
  experiment: defaultExperiment,
  vxlanEdges: [],
  vniCounter: 100,
  ipMappings: {},
};

export const TopologyContext = createContext<TopologyContextType | undefined>(
  undefined
);

let bridgeIdCounter = 0;

export const newBridgeId = (): string =>
  `bridge-${Date.now().toString(36)}-${(bridgeIdCounter++).toString(36)}`;

/** Creates a bridge with the first free `brN` name for its node. */
export const newBridge = (existing: UIBridge[] = []): UIBridge => {
  const used = new Set(existing.map(b => b.name));
  let n = 0;
  while (used.has(`br${n}`)) n++;
  return { id: newBridgeId(), name: `br${n}`, mtu: 1280 };
};

export const useTopology = () => {
  const [state, setState] = useState<UIState>(defaultState);

  const addNodeActor = useCallback((node: NodeActor) => {
    setState(prev => ({
      ...prev,
      experiment: {
        ...prev.experiment,
        nodeactors: [...prev.experiment.nodeactors, node],
      },
    }));
  }, []);

  const updateNodeActor = useCallback(
    (nodeId: string, updates: Partial<NodeActor>) => {
      setState(prev => {
        const newName = updates.name;
        const renamed = newName !== undefined && newName !== nodeId;
        if (renamed && prev.experiment.nodeactors.some(n => n.name === newName)) {
          return prev;
        }

        return {
          ...prev,
          experiment: {
            ...prev.experiment,
            nodeactors: prev.experiment.nodeactors.map(n =>
              n.name === nodeId ? { ...n, ...updates } : n
            ),
          },
          vxlanEdges: renamed
            ? prev.vxlanEdges.map(e => ({
                ...e,
                source: e.source === nodeId ? newName : e.source,
                target: e.target === nodeId ? newName : e.target,
              }))
            : prev.vxlanEdges,
          selectedNodeId:
            renamed && prev.selectedNodeId === nodeId ? newName : prev.selectedNodeId,
        };
      });
    },
    []
  );

  const addBridge = useCallback((nodeId: string) => {
    setState(prev => ({
      ...prev,
      experiment: {
        ...prev.experiment,
        nodeactors: prev.experiment.nodeactors.map(n => {
          if (n.name !== nodeId) return n;
          const bridges = n.bridges || [];
          return { ...n, bridges: [...bridges, newBridge(bridges)] };
        }),
      },
    }));
  }, []);

  const updateBridge = useCallback(
    (nodeId: string, bridgeId: string, updates: Partial<Omit<UIBridge, 'id'>>) => {
      setState(prev => ({
        ...prev,
        experiment: {
          ...prev.experiment,
          nodeactors: prev.experiment.nodeactors.map(n =>
            n.name === nodeId
              ? {
                  ...n,
                  bridges: (n.bridges || []).map(b =>
                    b.id === bridgeId ? { ...b, ...updates } : b
                  ),
                }
              : n
          ),
        },
      }));
    },
    []
  );

  const removeBridge = useCallback((nodeId: string, bridgeId: string) => {
    setState(prev => ({
      ...prev,
      experiment: {
        ...prev.experiment,
        nodeactors: prev.experiment.nodeactors.map(n =>
          n.name === nodeId
            ? { ...n, bridges: (n.bridges || []).filter(b => b.id !== bridgeId) }
            : n
        ),
      },
      vxlanEdges: prev.vxlanEdges.filter(
        e => e.sourceBridgeId !== bridgeId && e.targetBridgeId !== bridgeId
      ),
      selectedEdgeId: prev.vxlanEdges.some(
        e =>
          e.id === prev.selectedEdgeId &&
          (e.sourceBridgeId === bridgeId || e.targetBridgeId === bridgeId)
      )
        ? undefined
        : prev.selectedEdgeId,
    }));
  }, []);

  const removeNodeActor = useCallback((nodeId: string) => {
    setState(prev => {
      // Also remove any edges connected to this node
      const vxlanEdges = prev.vxlanEdges.filter(
        e => e.source !== nodeId && e.target !== nodeId
      );

      return {
        ...prev,
        experiment: {
          ...prev.experiment,
          nodeactors: prev.experiment.nodeactors.filter(n => n.name !== nodeId),
        },
        vxlanEdges,
      };
    });
  }, []);

  const addVXLANEdge = useCallback((edge: VXLANEdge) => {
    setState(prev => {
      const newVniCounter = Math.max(prev.vniCounter + 1, edge.vni + 1);
      return {
        ...prev,
        vxlanEdges: [...prev.vxlanEdges, edge],
        vniCounter: newVniCounter,
      };
    });
  }, []);

  const updateVXLANEdge = useCallback(
    (edgeId: string, updates: Partial<VXLANEdge>) => {
      setState(prev => ({
        ...prev,
        vxlanEdges: prev.vxlanEdges.map(e =>
          e.id === edgeId ? { ...e, ...updates } : e
        ),
      }));
    },
    []
  );

  const removeVXLANEdge = useCallback((edgeId: string) => {
    setState(prev => ({
      ...prev,
      vxlanEdges: prev.vxlanEdges.filter(e => e.id !== edgeId),
    }));
  }, []);


  const addRoute = useCallback((nodeId: string, route: Route) => {
    setState(prev => ({
      ...prev,
      experiment: {
        ...prev.experiment,
        nodeactors: prev.experiment.nodeactors.map(n => {
          if (n.name !== nodeId) return n;
          const routes = n.routes || [];
          return { ...n, routes: [...routes, route] };
        }),
      },
    }));
  }, []);

  const updateRoute = useCallback((nodeId: string, routeIndex: number, route: Route) => {
    setState(prev => ({
      ...prev,
      experiment: {
        ...prev.experiment,
        nodeactors: prev.experiment.nodeactors.map(n =>
          n.name === nodeId
            ? {
                ...n,
                routes: (n.routes || []).map((r, i) =>
                  i === routeIndex ? route : r
                ),
              }
            : n
        ),
      },
    }));
  }, []);

  const removeRoute = useCallback((nodeId: string, routeIndex: number) => {
    setState(prev => ({
      ...prev,
      experiment: {
        ...prev.experiment,
        nodeactors: prev.experiment.nodeactors.map(n =>
          n.name === nodeId
            ? { ...n, routes: (n.routes || []).filter((_, i) => i !== routeIndex) }
            : n
        ),
      },
    }));
  }, []);
  const updateContainerInNode = useCallback(
    (nodeId: string, containerIndex: number, container: Container) => {
      setState(prev => ({
        ...prev,
        experiment: {
          ...prev.experiment,
          nodeactors: prev.experiment.nodeactors.map(n =>
            n.name === nodeId
              ? {
                  ...n,
                  containers: (n.containers || []).map((c, i) =>
                    i === containerIndex ? container : c
                  ),
                }
              : n
          ),
        },
      }));
    },
    []
  );

  const removeContainerFromNode = useCallback(
    (nodeId: string, containerIndex: number) => {
      setState(prev => ({
        ...prev,
        experiment: {
          ...prev.experiment,
          nodeactors: prev.experiment.nodeactors.map(n =>
            n.name === nodeId
              ? {
                  ...n,
                  containers: (n.containers || []).filter((_, i) => i !== containerIndex),
                }
              : n
          ),
        },
      }));
    },
    []
  );

  const addScript = useCallback((script: Script) => {
    setState(prev => ({
      ...prev,
      experiment: {
        ...prev.experiment,
        scripts: [...(prev.experiment.scripts || []), script],
      },
    }));
  }, []);

  const removeScript = useCallback((scriptId: string) => {
    setState(prev => ({
      ...prev,
      experiment: {
        ...prev.experiment,
        scripts: (prev.experiment.scripts || []).filter(s => s.script_id !== scriptId),
      },
    }));
  }, []);

  const updateScript = useCallback((scriptId: string, updates: Partial<Script>) => {
    setState(prev => ({
      ...prev,
      experiment: {
        ...prev.experiment,
        scripts: (prev.experiment.scripts || []).map(s =>
          s.script_id === scriptId ? { ...s, ...updates } : s
        ),
      },
    }));
  }, []);

  const setSelectedNode = useCallback((nodeId?: string) => {
    setState(prev => ({
      ...prev,
      selectedNodeId: nodeId,
      selectedEdgeId: undefined,
    }));
  }, []);

  const setSelectedEdge = useCallback((edgeId?: string) => {
    setState(prev => ({
      ...prev,
      selectedEdgeId: edgeId,
      selectedNodeId: undefined,
    }));
  }, []);

  const exportExperiment = useCallback((): Experiment => {
    return state.experiment;
  }, [state.experiment]);

  const importExperiment = useCallback((exp: Experiment) => {
    setState(prev => ({
      ...prev,
      experiment: exp,
    }));
  }, []);

  /** Import an experiment and reconstruct VXLAN edges from MENTORED_TOPOLOGY_CONFIG. */
  const importExperimentWithEdges = useCallback((exp: Experiment) => {
    // 1. Set the experiment state
    setState(prev => ({ ...prev, experiment: exp }));

    // 2. Per-node data structures
    type NodeBridges = Map<string, { stableId: string; name: string }>;
    const nodeBridgesMap = new Map<string, NodeBridges>();
    // remoteBridgeMap: nodeId → Map of remoteHost → bridgeName for each VNI interface
    const remoteBridgeMap = new Map<string, Map<string, string>>();

    for (const node of exp.nodeactors) {
      const nodeBridgeMap = new Map<string, { stableId: string; name: string }>();
      const nodeRemoteMap = new Map<string, string>();

      for (const container of (node.containers || [])) {
        const topoConfigVar = (container.env || []).find(e => e.name === 'MENTORED_TOPOLOGY_CONFIG');
        if (!topoConfigVar) continue;
        try {
          const topoConfig = JSON.parse(topoConfigVar.value);
          if (topoConfig.bridges) {
            for (const bridge of topoConfig.bridges) {
              nodeBridgeMap.set(bridge.name, { stableId: newBridgeId(), name: bridge.name });
            }
          }
          if (topoConfig.interfaces) {
            for (const iface of topoConfig.interfaces) {
              if (iface.remote_host && iface.bridge) {
                nodeRemoteMap.set(iface.remote_host, iface.bridge);
              }
            }
          }
        } catch { /* skip */ }
      }
      nodeBridgesMap.set(node.name, nodeBridgeMap);
      remoteBridgeMap.set(node.name, nodeRemoteMap);
    }

    // 3. Rebuild node actors with bridges
    const updatedNodeactors = exp.nodeactors.map(node => {
      const existingBridges = (node.bridges || []).map(b => ({ ...b, id: newBridgeId() }));
      const nodeBridgeMap = nodeBridgesMap.get(node.name);
      if (!nodeBridgeMap) return node;

      // Add new bridges that weren't in the original data
      const updatedBridges = [...existingBridges];
      for (const [bridgeName, info] of nodeBridgeMap) {
        const existing = updatedBridges.find(b => b.name === bridgeName);
        if (!existing) {
          updatedBridges.push({ id: info.stableId, name: bridgeName, mtu: 1280 });
        }
      }

      // Extract routes from MENTORED_TOPOLOGY_CONFIG
      let updatedRoutes: Route[] = [];
      for (const container of (node.containers || [])) {
        const topoConfigVar = (container.env || []).find(e => e.name === 'MENTORED_TOPOLOGY_CONFIG');
        if (!topoConfigVar) continue;
        try {
          const topoConfig = JSON.parse(topoConfigVar.value);
          if (topoConfig.routes) {
            updatedRoutes = topoConfig.routes.map((r: any) => ({
              to: r.to,
              via: r.via,
              dev: r.dev,
              metric: r.metric,
              onlink: r.onlink,
            }));
            break;
          }
        } catch {
          // skip
        }
      }

      const result: NodeActor = {
        ...node,
        bridges: updatedBridges,
        routes: updatedRoutes.length > 0 ? updatedRoutes : node.routes,
      };
      return result;
    });

    // 3. Reconstruct VXLAN edges using remoteBridgeMap for correct bridge lookups
    const seenEdgeKeys = new Set<string>();
    const edgeMap = new Map<string, VXLANEdge>();

    for (const node of exp.nodeactors) {
      const nodeRemoteMap = remoteBridgeMap.get(node.name);
      const nodeBridgeMap = nodeBridgesMap.get(node.name);
      if (!nodeRemoteMap || !nodeBridgeMap) continue;

      for (const container of (node.containers || [])) {
        const topoConfigVar = (container.env || []).find(e => e.name === 'MENTORED_TOPOLOGY_CONFIG');
        if (!topoConfigVar) continue;
        try {
          const topoConfig = JSON.parse(topoConfigVar.value);
          if (!topoConfig.interfaces) continue;

          for (const iface of topoConfig.interfaces) {
            const edgeVni = iface.vni;
            const remoteHost = iface.remote_host;
            const localBridgeName = iface.bridge || '';

            if (!edgeVni || !remoteHost || !localBridgeName) continue;

            // Deduplicate: A↔B tunnel and B↔A tunnel are the same edge
            const [a, b] = node.name < remoteHost ? [node.name, remoteHost] : [remoteHost, node.name];
            const edgeKey = `${a}|${b}|${edgeVni}`;
            if (seenEdgeKeys.has(edgeKey)) continue;
            seenEdgeKeys.add(edgeKey);

            // Local bridge stable ID (this node's bridge for tunnel to remoteHost)
            const localBridgeInfo = nodeBridgeMap.get(localBridgeName);
            if (!localBridgeInfo) continue;

            // Remote bridge: use remoteBridgeMap to find what bridge the remote node
            // uses for tunnels BACK to this node (the correct bridge for this edge)
            const remoteNodeRemoteMap = remoteBridgeMap.get(remoteHost);
            const remoteBridgeName = remoteNodeRemoteMap?.get(node.name);
            if (!remoteBridgeName) continue;

            const remoteBridgeMapNode = nodeBridgesMap.get(remoteHost);
            const remoteBridgeInfo = remoteBridgeMapNode?.get(remoteBridgeName);
            if (!remoteBridgeInfo) continue;

            // Assign source = alphabetically first node, target = second
            const source = a;
            const target = b;
            let sourceBridgeId: string;
            let targetBridgeId: string;

            if (source === node.name) {
              // current node is source
              sourceBridgeId = localBridgeInfo.stableId;
              targetBridgeId = remoteBridgeInfo.stableId;
            } else {
              // current node is target; other node is source
              sourceBridgeId = remoteBridgeInfo.stableId;
              targetBridgeId = localBridgeInfo.stableId;
            }

            const edgeId = `imported-${edgeVni}-${source}-${target}`;
            edgeMap.set(edgeId, {
              id: edgeId,
              source,
              target,
              sourceBridgeId,
              targetBridgeId,
              vni: edgeVni,
            });
          }
        } catch { /* skip */ }
      }
    }

    // 4. Update state with everything
    setState(prev => ({
      ...prev,
      experiment: { ...prev.experiment, nodeactors: updatedNodeactors },
      vxlanEdges: Array.from(edgeMap.values()),
    }));
  }, []);

  const resetTopology = useCallback(() => {
    setState(defaultState);
  }, []);

  const context: TopologyContextType = {
    state,
    addNodeActor,
    updateNodeActor,
    removeNodeActor,
    addBridge,
    updateBridge,
    removeBridge,
    addVXLANEdge,
    updateVXLANEdge,
    removeVXLANEdge,
    addRoute,
    updateRoute,
    removeRoute,
    updateContainerInNode,
    removeContainerFromNode,
    addScript,
    removeScript,
    updateScript,
    setSelectedNode,
    setSelectedEdge,
    exportExperiment,
    importExperiment,
    importExperimentWithEdges,
    resetTopology,
  };

  return context;
};
