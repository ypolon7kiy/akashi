import { Html } from '@react-three/drei';
import { type ThreeEvent } from '@react-three/fiber';
import React, { memo, useCallback, useEffect, useRef } from 'react';
import type { GraphNode3D } from '../../../domain/graphTypes';
import { getHoverColor, getNodeColor, UI_COLORS } from '../colors';
import { GEOMETRY_CONSTANTS } from '../Constants';

function labelLinesForNode(node: GraphNode3D): string[] {
  const raw =
    node.formattedTextLines.length > 0 ? node.formattedTextLines : node.label ? [node.label] : [];
  return raw.map((s) => s.trim()).filter((s) => s.length > 0);
}

/** DOM labels use VS Code theme CSS; avoids Troika/font CDN under strict webview CSP. */
const NodeLabelHtml: React.FC<{
  textLines: string[];
  position: [number, number, number];
  /** Remount Html when world layout changes so drei screen projection re-syncs. */
  layoutSyncKey: string;
}> = ({ textLines, position, layoutSyncKey }) => {
  if (textLines.length === 0) {
    return null;
  }
  return (
    <Html
      key={layoutSyncKey}
      position={position}
      center
      pointerEvents="none"
      wrapperClass="akashi-graph-node-label-html-root"
    >
      <div className="akashi-graph-node-label">
        {textLines.map((line, index) => (
          <div
            key={`${index}:${line}`}
            className={
              index === 0
                ? 'akashi-graph-node-label__primary'
                : 'akashi-graph-node-label__secondary'
            }
          >
            {line}
          </div>
        ))}
      </div>
    </Html>
  );
};

interface NodeRendererProps {
  node: GraphNode3D;
  onClick: (node: GraphNode3D) => void;
  onDoubleClick: (node: GraphNode3D) => void;
  onPoint: (node: GraphNode3D | null) => void;
  onContextMenu?: (node: GraphNode3D, clientX: number, clientY: number) => void;
  showLabels: boolean;
  isRotating: boolean;
}

const NodeRendererComponent: React.FC<NodeRendererProps> = ({
  node,
  onClick,
  onDoubleClick,
  onPoint,
  onContextMenu,
  showLabels,
  isRotating,
}) => {
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doubleClickPendingRef = useRef(false);

  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
      doubleClickPendingRef.current = false;
    };
  }, []);

  const handleClick = useCallback(
    (event: { stopPropagation: () => void }) => {
      event.stopPropagation();
      if (doubleClickPendingRef.current) {
        return;
      }
      doubleClickPendingRef.current = true;
      clickTimeoutRef.current = setTimeout(() => {
        if (doubleClickPendingRef.current) {
          onClick(node);
          doubleClickPendingRef.current = false;
        }
        clickTimeoutRef.current = null;
      }, 300);
    },
    [node, onClick]
  );

  const handleDoubleClick = useCallback(
    (event: { stopPropagation: () => void }) => {
      event.stopPropagation();
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
      doubleClickPendingRef.current = false;
      onDoubleClick(node);
    },
    [node, onDoubleClick]
  );

  const handlePointerOver = useCallback(
    (event: { stopPropagation: () => void }) => {
      event.stopPropagation();
      if (isRotating) {
        return;
      }
      onPoint(node);
    },
    [node, onPoint, isRotating]
  );

  const handlePointerOut = useCallback(
    (event: { stopPropagation: () => void }) => {
      event.stopPropagation();
      if (isRotating) {
        return;
      }
      onPoint(null);
    },
    [onPoint, isRotating]
  );

  const handlePointerDown = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (event.nativeEvent.button === 2) {
        event.stopPropagation();
        onContextMenu?.(node, event.nativeEvent.clientX, event.nativeEvent.clientY);
      }
    },
    [node, onContextMenu]
  );

  if (!node.isVisible) {
    return <group position={node.position} visible={false} />;
  }

  const nodeColor = node.isPointed ? getHoverColor(node.type) : getNodeColor(node.type);

  return (
    <group position={node.position}>
      <mesh
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onPointerDown={handlePointerDown}
      >
        <sphereGeometry args={[node.size, 32, 32]} />
        <meshStandardMaterial
          color={nodeColor}
          transparent
          opacity={1}
          emissive={node.isSelected ? nodeColor : UI_COLORS.EMISSIVE_DEFAULT}
          emissiveIntensity={node.isSelected ? 0.3 : 0}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>
      {showLabels ? (
        <NodeLabelHtml
          layoutSyncKey={`${node.id}:${node.position[0]},${node.position[1]},${node.position[2]}`}
          textLines={labelLinesForNode(node)}
          position={[0, node.size + GEOMETRY_CONSTANTS.LABEL_OFFSET_Y, 0]}
        />
      ) : null}
    </group>
  );
};

function sameStringArray(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((s, i) => s === b[i]);
}

export const NodeRenderer = memo(NodeRendererComponent, (prev, next) => {
  return (
    prev.node.id === next.node.id &&
    prev.node.position[0] === next.node.position[0] &&
    prev.node.position[1] === next.node.position[1] &&
    prev.node.position[2] === next.node.position[2] &&
    prev.node.isVisible === next.node.isVisible &&
    prev.showLabels === next.showLabels &&
    prev.isRotating === next.isRotating &&
    prev.node.isPointed === next.node.isPointed &&
    prev.node.isSelected === next.node.isSelected &&
    prev.node.label === next.node.label &&
    sameStringArray(prev.node.formattedTextLines, next.node.formattedTextLines) &&
    prev.onContextMenu === next.onContextMenu
  );
});
