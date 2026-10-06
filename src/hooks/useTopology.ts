/**
 * Central hook for managing topology state
 */

import { useCallback, useState, createContext } from 'react';
import { Experiment, NodeActor, VXLANEdge, UIState, Container, Script, UIBridge } from '../types/experiment';

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
  updateContainerInNode: (nodeId: string, containerIndex: number, container: Container) => void;
  removeContainerFromNode: (nodeId: string, containerIndex: number) => void;
  addScript: (script: Script) => void;
  removeScript: (scriptId: string) => void;
  updateScript: (scriptId: string, updates: Partial<Script>) => void;
  setSelectedNode: (nodeId?: string) => void;
  setSelectedEdge: (edgeId?: string) => void;
  exportExperiment: () => Experiment;
  importExperiment: (exp: Experiment) => void;
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
    updateContainerInNode,
    removeContainerFromNode,
    addScript,
    removeScript,
    updateScript,
    setSelectedNode,
    setSelectedEdge,
    exportExperiment,
    importExperiment,
    resetTopology,
  };

  return context;
};
