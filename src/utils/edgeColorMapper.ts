/**
 * Maps edges to colors based on their network (subnet/VNI)
 * Edges on the same network get the same color
 */

import { VXLANEdge } from '../types/experiment';

// Deterministic color palette for networks
const NETWORK_COLORS = [
  '#667eea',  // purple
  '#f56565',  // red
  '#48bb78',  // green
  '#ed8936',  // orange
  '#4299e1',  // blue
  '#9f7aea',  // violet
  '#ecc94b',  // yellow
  '#38b2ac',  // teal
  '#e53e3e',  // red-dark
  '#805ad5',  // purple-dark
  '#d69e2e',  // yellow-dark
  '#2c7a7b',  // teal-dark
  '#d69e2e',  // amber
  '#718096',  // gray
  '#e53e3e',  // red
  '#319795',  // teal-dark
];

/**
 * Generate a consistent color for a network based on its key
 */
export const getNetworkColor = (networkKey: string): string => {
  // Simple hash function to map string to array index
  let hash = 0;
  for (let i = 0; i < networkKey.length; i++) {
    hash = ((hash << 5) - hash) + networkKey.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return NETWORK_COLORS[Math.abs(hash) % NETWORK_COLORS.length];
};

/**
 * Get color for a VXLAN edge based on VNI
 */
export const getEdgeColor = (vni: number): string => {
  const colorKey = `vni-${vni}`;
  return getNetworkColor(colorKey);
};

/**
 * Get color for a VXLAN edge - same network = same color
 */
export const getEdgeColorForEdge = (edge: VXLANEdge): string => {
  // Use VNI as the key - same VNI = same network = same color
  return getNetworkColor(`vni-${edge.vni}`);
};

/**
 * Build a color map for all edges
 */
export const buildEdgeColorMap = (edges: VXLANEdge[]): Map<string, string> => {
  const colorMap = new Map<string, string>();
  const usedColors = new Set<string>();

  // Sort edges by VNI to ensure consistent ordering
  const sortedEdges = [...edges].sort((a, b) => a.vni - b.vni);

  sortedEdges.forEach(edge => {
    const colorKey = `vni-${edge.vni}`;
    let color = getNetworkColor(colorKey);

    // If this color is already used, try to find an alternative
    // We do this by using the same color for the same VNI
    if (!colorMap.has(edge.id)) {
      colorMap.set(edge.id, color);
    }
  });

  return colorMap;
};
