/**
 * Builds the per-node MENTORED_TOPOLOGY_CONFIG from bridges and VXLAN edges.
 */

import { Bridge, NodeActor, TopologyConfig, VXLANEdge, VXLANInterface } from '../types/experiment';
import { DEFAULT_CLUSTER_POD_CIDR, resolveBridgeIPs } from './addressing';

const DEFAULT_MTU = 1280;
const BRIDGE_NAME_RE = /^[A-Za-z0-9_-]{1,15}$/; // Linux IFNAMSIZ

export const validateBridgeName = (name: string): boolean => BRIDGE_NAME_RE.test(name);

export const generateNodeTopologyConfig = (
  node: NodeActor,
  nodeactors: NodeActor[],
  edges: VXLANEdge[],
  bridgeIPs: Map<string, string> = resolveBridgeIPs(nodeactors, edges)
): TopologyConfig => {
  const localBridges = node.bridges || [];
  const bridgeName = (id: string) => localBridges.find(b => b.id === id)?.name;

  const bridges: Bridge[] = localBridges.map(b => ({
    name: b.name,
    ip: bridgeIPs.get(b.id),
    mtu: b.mtu || DEFAULT_MTU,
  }));

  const interfaces: VXLANInterface[] = [];
  edges.forEach(edge => {
    const isSource = edge.source === node.name;
    const isTarget = edge.target === node.name;
    if (!isSource && !isTarget) return;

    const bridge = bridgeName(isSource ? edge.sourceBridgeId : edge.targetBridgeId);
    if (!bridge) return;

    interfaces.push({
      interface: `vxlan${edge.vni}`,
      vni: edge.vni,
      bridge,
      remote_host: isSource ? edge.target : edge.source,
      mtu: DEFAULT_MTU,
    });
  });

  const config: TopologyConfig = { cluster_pod_cidr: DEFAULT_CLUSTER_POD_CIDR };
  if (bridges.length > 0) config.bridges = bridges;
  if (interfaces.length > 0) config.interfaces = interfaces;

  // Collect routes from the node's routes array
  const nodeRoutes = node.routes || [];
  if (nodeRoutes.length > 0) {
    config.routes = nodeRoutes.map(r => ({
      to: r.to,
      via: r.via,
      dev: r.dev,
      metric: r.metric,
      onlink: r.onlink,
    }));
  }

  return config;
};

export const topologyConfigToJSON = (config: TopologyConfig): string =>
  JSON.stringify(config, null, 2);

/** Returns human-readable problems; empty list means the node config is valid. */
export const validateNodeTopology = (node: NodeActor, edges: VXLANEdge[]): string[] => {
  const problems: string[] = [];
  const bridges = node.bridges || [];

  const names = new Set<string>();
  bridges.forEach(b => {
    if (!validateBridgeName(b.name)) {
      problems.push(`Bridge "${b.name}": invalid name (1-15 chars: letters, digits, "-", "_")`);
    }
    if (names.has(b.name)) {
      problems.push(`Bridge "${b.name}": duplicated name`);
    }
    names.add(b.name);
  });

  const vnis = new Set<number>();
  edges
    .filter(e => e.source === node.name || e.target === node.name)
    .forEach(e => {
      if (vnis.has(e.vni)) {
        problems.push(`VNI ${e.vni} is used by more than one tunnel on this node`);
      }
      vnis.add(e.vni);
    });

  if (bridges.length === 0 && vnis.size > 0) {
    problems.push('Node has tunnels but no bridge');
  }

  return problems;
};
