import { Text } from '@react-three/drei';
import { type ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import React, { memo, Suspense, useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { GraphNode3D } from '../../../domain/graphTypes';
import { getHoverColor, getNodeColor, UI_COLORS } from '../colors';
import { GEOMETRY_CONSTANTS } from '../Constants';
import { GRAPH_LABEL_FONT_URL } from '../graphLabelFont';

function labelLinesForNode(node: GraphNode3D): string[] {
  const raw =
    node.formattedTextLines.length > 0 ? node.formattedTextLines : node.label ? [node.label] : [];
  return raw.map((s) => s.trim()).filter((s) => s.length > 0);
}

const BillboardLabelText: React.FC<{
  textLines: string[];
  position: [number, number, number];
  primaryColor: string;
  secondaryColor: string;
  outlineColor: string;
}> = ({ textLines, position, primaryColor, secondaryColor, outlineColor }) => {
  const textRef = useRef<THREE.Group>(null);
  const textPosition = useRef(new THREE.Vector3());
  const textToCamera = useRef(new THREE.Vector3());
  const cameraDirection = useRef(new THREE.Vector3());
  const { camera } = useThree();
  const fontSize = GEOMETRY_CONSTANTS.LABEL_FONT_SIZE;
  const secondarySize = fontSize * GEOMETRY_CONSTANTS.LABEL_SECONDARY_FONT_SCALE;
  const lineSpacing = fontSize * 1.2;
  const maxWidth = GEOMETRY_CONSTANTS.LABEL_MAX_WIDTH;

  useFrame(() => {
    const g = textRef.current;
    if (!g) {
      return;
    }
    g.getWorldPosition(textPosition.current);
    textToCamera.current.subVectors(camera.position, textPosition.current).normalize();
    camera.getWorldDirection(cameraDirection.current);
    const angle = cameraDirection.current.dot(textToCamera.current);
    const tcx = textToCamera.current.x;
    const tcz = textToCamera.current.z;
    if (angle < 0) {
      g.rotation.y = Math.atan2(-tcx, -tcz) + Math.PI;
    } else {
      g.rotation.y = Math.atan2(-tcx, -tcz);
    }
    g.rotation.z = 0;
    g.rotation.x = 0;
  });

  const totalTextHeight =
    textLines.length > 0 ? (textLines.length - 1) * lineSpacing + fontSize : 0;
  const adjustedPosition: [number, number, number] = [
    position[0],
    position[1] + totalTextHeight,
    position[2],
  ];

  return (
    <group ref={textRef} position={adjustedPosition}>
      {textLines.map((line, index) => {
        const yPosition = -index * lineSpacing;
        const isPrimary = index === 0;
        return (
          <Text
            key={`${index}:${line}`}
            position={[0, yPosition, 0]}
            font={GRAPH_LABEL_FONT_URL}
            fontSize={isPrimary ? fontSize : secondarySize}
            fontWeight={isPrimary ? 500 : 400}
            color={isPrimary ? primaryColor : secondaryColor}
            anchorX="center"
            anchorY="top"
            maxWidth={maxWidth}
            outlineWidth={0.025}
            outlineColor={outlineColor}
            outlineOpacity={1}
          >
            {line}
          </Text>
        );
      })}
    </group>
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
  labelPrimaryColor: string;
  labelSecondaryColor: string;
  labelOutlineColor: string;
}

const NodeRendererComponent: React.FC<NodeRendererProps> = ({
  node,
  onClick,
  onDoubleClick,
  onPoint,
  onContextMenu,
  showLabels,
  isRotating,
  labelPrimaryColor,
  labelSecondaryColor,
  labelOutlineColor,
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
  const lines = labelLinesForNode(node);

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
      {showLabels && lines.length > 0 ? (
        <Suspense fallback={null}>
          <BillboardLabelText
            textLines={lines}
            position={[0, node.size + GEOMETRY_CONSTANTS.LABEL_OFFSET_Y, 0]}
            primaryColor={labelPrimaryColor}
            secondaryColor={labelSecondaryColor}
            outlineColor={labelOutlineColor}
          />
        </Suspense>
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
    prev.onContextMenu === next.onContextMenu &&
    prev.labelPrimaryColor === next.labelPrimaryColor &&
    prev.labelSecondaryColor === next.labelSecondaryColor &&
    prev.labelOutlineColor === next.labelOutlineColor
  );
});
