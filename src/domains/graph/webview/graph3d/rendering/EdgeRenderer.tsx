import { memo, useEffect, useRef, type FC, type LegacyRef } from 'react';
import * as THREE from 'three';
import type { GraphEdge3D, GraphNode3D } from '../../../domain/graphTypes';
import { calculateEdgeOpacity, calculateEdgeThickness } from '../edgeStyle';
import { getEdgeColor } from '../colors';
import { frameRateController } from '../FrameRateController';

interface EdgeRendererProps {
  edge: GraphEdge3D;
  sourceNode: GraphNode3D;
  targetNode: GraphNode3D;
  isPointed: boolean;
  /** Multiplier on computed line thickness (default 1). */
  thicknessScale?: number;
}

const EdgeRendererComponent: FC<EdgeRendererProps> = ({
  edge,
  sourceNode,
  targetNode,
  isPointed,
  thicknessScale = 1,
}) => {
  const lineRef = useRef<THREE.Line>(null);
  const color = getEdgeColor(isPointed);
  const opacity = calculateEdgeOpacity(edge, isPointed);
  const thickness = calculateEdgeThickness(edge, isPointed) * thicknessScale;

  const direction = new THREE.Vector3(
    targetNode.position[0] - sourceNode.position[0],
    targetNode.position[1] - sourceNode.position[1],
    targetNode.position[2] - sourceNode.position[2]
  );
  if (direction.lengthSq() < 1e-12) {
    direction.set(0, 1, 0);
  } else {
    direction.normalize();
  }
  const sr = sourceNode.size;
  const tr = targetNode.size;
  const edgeStart = new THREE.Vector3(
    sourceNode.position[0] + direction.x * sr,
    sourceNode.position[1] + direction.y * sr,
    sourceNode.position[2] + direction.z * sr
  );
  const edgeEnd = new THREE.Vector3(
    targetNode.position[0] - direction.x * tr,
    targetNode.position[1] - direction.y * tr,
    targetNode.position[2] - direction.z * tr
  );
  const positions = [edgeStart.x, edgeStart.y, edgeStart.z, edgeEnd.x, edgeEnd.y, edgeEnd.z];

  useEffect(() => {
    const unregister = frameRateController.registerCallback(() => {
      if (!edge.isVisible) {
        return;
      }
      const line = lineRef.current;
      if (!line?.geometry) {
        return;
      }
      const dir = new THREE.Vector3(
        targetNode.position[0] - sourceNode.position[0],
        targetNode.position[1] - sourceNode.position[1],
        targetNode.position[2] - sourceNode.position[2]
      );
      if (dir.lengthSq() < 1e-12) {
        dir.set(0, 1, 0);
      } else {
        dir.normalize();
      }
      const sR = sourceNode.size;
      const tR = targetNode.size;
      const start = new THREE.Vector3(
        sourceNode.position[0] + dir.x * sR,
        sourceNode.position[1] + dir.y * sR,
        sourceNode.position[2] + dir.z * sR
      );
      const end = new THREE.Vector3(
        targetNode.position[0] - dir.x * tR,
        targetNode.position[1] - dir.y * tR,
        targetNode.position[2] - dir.z * tR
      );
      const pos = [start.x, start.y, start.z, end.x, end.y, end.z];
      line.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      line.geometry.attributes.position.needsUpdate = true;
    });
    return unregister;
  }, [edge.isVisible, sourceNode.position, targetNode.position, sourceNode.size, targetNode.size]);

  if (!edge.isVisible) {
    return null;
  }

  return (
    <line ref={lineRef as unknown as LegacyRef<SVGLineElement>}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={2}
          array={new Float32Array(positions)}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color={color} transparent opacity={opacity} linewidth={thickness} />
    </line>
  );
};

export const EdgeRenderer = memo(EdgeRendererComponent, (prev, next) => {
  return (
    prev.edge.id === next.edge.id &&
    prev.edge.isVisible === next.edge.isVisible &&
    prev.sourceNode.position[0] === next.sourceNode.position[0] &&
    prev.sourceNode.position[1] === next.sourceNode.position[1] &&
    prev.sourceNode.position[2] === next.sourceNode.position[2] &&
    prev.targetNode.position[0] === next.targetNode.position[0] &&
    prev.targetNode.position[1] === next.targetNode.position[1] &&
    prev.targetNode.position[2] === next.targetNode.position[2] &&
    prev.isPointed === next.isPointed &&
    (prev.thicknessScale ?? 1) === (next.thicknessScale ?? 1)
  );
});
