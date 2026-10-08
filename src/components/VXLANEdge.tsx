/**
 * Custom VXLAN edge component - respects network-based coloring passed via style
 */

import React from 'react';
import {
  EdgeProps,
  BaseEdge,
  getBezierPath,
  EdgeLabelRenderer,
} from 'reactflow';
import './VXLANEdge.css';

export interface VXLANEdgeData {
  vni?: number;
  sourceIP?: string;
  targetIP?: string;
  subnet?: string;
  isSelected?: boolean;
}

export const VXLANEdge: React.FC<EdgeProps<VXLANEdgeData>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  style,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Determine stroke color - use style from props (set by edgeColorMapper) or fallback
  const strokeColor = selected
    ? '#764ba2'
    : (style as any)?.stroke || '#667eea';

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          strokeWidth: selected ? 3 : 2,
          stroke: strokeColor,
          filter: selected ? `drop-shadow(0 0 3px ${strokeColor}80)` : 'none',
        }}
      />

      <EdgeLabelRenderer>
        <div
          className={`vxlan-edge-label ${selected ? 'selected' : ''}`}
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
        >
          {data?.vni !== undefined && (
            <span className="vni-badge" style={{ background: strokeColor }}>
              VNI: {data.vni}
            </span>
          )}
          {data?.sourceIP && (
            <span className="ip-badge source">{data.sourceIP}</span>
          )}
          {data?.targetIP && (
            <span className="ip-badge target">{data.targetIP}</span>
          )}
          {data?.subnet && (
            <span className="subnet-badge">{data.subnet}</span>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default VXLANEdge;
