/**
 * Automatic bridge addressing: bridges linked by VXLAN edges form one L2 segment
 * and share a /24; each bridge gets the next free host address.
 */

import { NodeActor, VXLANEdge } from '../types/experiment';

export const DEFAULT_CLUSTER_POD_CIDR = '10.244.0.0/16';

const segmentSubnetBase = (segment: number): string =>
  `10.${10 + Math.floor(segment / 256)}.${segment % 256}`;

/** Returns bridgeId -> "a.b.c.d/24"; a manual `ip` on the bridge wins over the generated one. */
export const resolveBridgeIPs = (
  nodeactors: NodeActor[],
  edges: VXLANEdge[]
): Map<string, string> => {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root)!;
    parent.set(x, root);
    return root;
  };

  nodeactors.forEach(n => (n.bridges || []).forEach(b => parent.set(b.id, b.id)));
  edges.forEach(e => {
    if (parent.has(e.sourceBridgeId) && parent.has(e.targetBridgeId)) {
      parent.set(find(e.sourceBridgeId), find(e.targetBridgeId));
    }
  });

  const segmentOfRoot = new Map<string, number>();
  const nextHost = new Map<number, number>();
  const result = new Map<string, string>();

  nodeactors.forEach(n =>
    (n.bridges || []).forEach(b => {
      const root = find(b.id);
      if (!segmentOfRoot.has(root)) segmentOfRoot.set(root, segmentOfRoot.size);
      const segment = segmentOfRoot.get(root)!;
      const host = (nextHost.get(segment) || 0) + 1;
      nextHost.set(segment, host);

      result.set(b.id, b.ip || `${segmentSubnetBase(segment)}.${host}/24`);
    })
  );

  return result;
};
