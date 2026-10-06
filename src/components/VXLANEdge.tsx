/**
 * Custom VXLAN edge component
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
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          strokeWidth: selected ? 3 : 2,
          stroke: selected ? '#764ba2' : '#667eea',
          filter: selected ? 'drop-shadow(0 0 3px rgba(118, 75, 162, 0.5))' : 'none',
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
            <span className="vni-badge">VNI: {data.vni}</span>
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
