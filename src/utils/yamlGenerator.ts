/**
 * YAML export: strips UI-only state and injects MENTORED_TOPOLOGY_CONFIG per node.
 */

import YAML from 'js-yaml';
import { Container, Experiment, NodeActor, VXLANEdge } from '../types/experiment';
import { resolveBridgeIPs } from './addressing';
import { generateNodeTopologyConfig, topologyConfigToJSON } from './topologyConfigGenerator';

export const TOPOLOGY_ENV_NAME = 'MENTORED_TOPOLOGY_CONFIG';

const placeholderContainer = (): Container => ({
  name: 'main',
  image: 'ghcr.io/khalilsantana/mentored-base-utils:latest',
  imagePullPolicy: 'Always',
  command: ['/entry.sh'],
  args: ['sleep', 'infinity'],
  securityContext: { privileged: true },
});

const withTopologyEnv = (
  node: NodeActor,
  nodeactors: NodeActor[],
  edges: VXLANEdge[],
  bridgeIPs: Map<string, string>
): Omit<NodeActor, 'bridges'> => {
  const { bridges: _bridges, routes: _routes, ...exported } = node;
  const value = topologyConfigToJSON(generateNodeTopologyConfig(node, nodeactors, edges, bridgeIPs));

  const containers = node.containers && node.containers.length > 0
    ? node.containers
    : [placeholderContainer()];

  return {
    ...exported,
    containers: containers.map(c => ({
      ...c,
      env: [...(c.env || []).filter(e => e.name !== TOPOLOGY_ENV_NAME), { name: TOPOLOGY_ENV_NAME, value }],
    })),
  };
};

export const experimentToYAML = (experiment: Experiment, edges: VXLANEdge[] = []): string => {
  const bridgeIPs = resolveBridgeIPs(experiment.nodeactors, edges);

  const exported = {
    ...experiment,
    nodeactors: experiment.nodeactors.map(n =>
      withTopologyEnv(n, experiment.nodeactors, edges, bridgeIPs)
    ),
  };

  // JSON round-trip drops undefined values, which js-yaml rejects
  return YAML.dump({ Experiment: JSON.parse(JSON.stringify(exported)) }, { indent: 2, lineWidth: -1 });
};
