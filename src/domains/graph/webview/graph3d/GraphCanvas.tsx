import { Canvas } from '@react-three/fiber';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { Camera3DConfig, GraphEdge3D, GraphNode3D } from '../../domain/graphTypes';
import { applyPointedFocusVisibility } from '../../application/applyPointedFocusVisibility';
import { cameraFitToBounds, getDefaultCameraConfig, type CameraFitOptions } from './cameraFit';
import { getDefaultLightingConfig, LightingSystem } from './rendering/LightingSystem';
import { CameraSystem } from './rendering/CameraSystem';
import { NodeRenderer } from './rendering/NodeRenderer';
import { EdgeRenderer } from './rendering/EdgeRenderer';
import { CAMERA_CONSTANTS } from './Constants';
import { GraphMessageType } from '../messages';
import { getVscodeApi } from '../../../../webview-shared/api';
import { WebGLResizeSync } from './WebGLResizeSync';
import { readGraphLabelColors, type GraphLabelColors } from './readGraphLabelColors';

interface GraphCanvasProps {
  nodes: GraphNode3D[];
  edges: GraphEdge3D[];
  /** Shown over the canvas when there are no nodes (helps diagnose empty index vs WebGL). */
  emptyHint: string | null;
  showLabels?: boolean;
  showEdges?: boolean;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  cameraFitOptions?: CameraFitOptions;
}

function centerCameraOnNode(
  node: GraphNode3D,
  setCamera: React.Dispatch<React.SetStateAction<Camera3DConfig>>
): void {
  const [x, y, z] = node.position;
  const d = CAMERA_CONSTANTS.CENTER_OFFSET_DISTANCE;
  setCamera((prev) => ({
    ...prev,
    target: [x, y, z],
    position: [x + d, y + d * CAMERA_CONSTANTS.CENTER_HEIGHT_MULTIPLIER, z + d],
  }));
}

function resolveFsPath(node: GraphNode3D): string {
  if (node.filesystemPath) {
    return node.filesystemPath;
  }
  return node.id;
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  nodes,
  edges,
  emptyHint,
  showLabels = true,
  showEdges = true,
  autoRotate = false,
  autoRotateSpeed = CAMERA_CONSTANTS.DEFAULT_AUTO_ROTATE_SPEED,
  cameraFitOptions,
}) => {
  const [cameraConfig, setCameraConfig] = useState<Camera3DConfig>(getDefaultCameraConfig);
  const [lightingConfig] = useState(getDefaultLightingConfig);
  const [pointedId, setPointedId] = useState<string | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    node: GraphNode3D;
  } | null>(null);
  const [labelColors, setLabelColors] = useState<GraphLabelColors>(() => readGraphLabelColors());

  const autoRotateRef = useRef(autoRotate);
  const autoRotateSpeedRef = useRef(autoRotateSpeed);
  autoRotateRef.current = autoRotate;
  autoRotateSpeedRef.current = autoRotateSpeed;

  useEffect(() => {
    const speed = autoRotateSpeedRef.current ?? CAMERA_CONSTANTS.DEFAULT_AUTO_ROTATE_SPEED;
    if (nodes.length === 0) {
      setCameraConfig({
        ...getDefaultCameraConfig(),
        autoRotate: autoRotateRef.current,
        autoRotateSpeed: speed,
      });
      return;
    }
    setCameraConfig({
      ...cameraFitToBounds(nodes, cameraFitOptions),
      autoRotate: autoRotateRef.current,
      autoRotateSpeed: speed,
    });
  }, [nodes, cameraFitOptions]);

  useEffect(() => {
    const speed = autoRotateSpeed ?? CAMERA_CONSTANTS.DEFAULT_AUTO_ROTATE_SPEED;
    setCameraConfig((prev) => ({ ...prev, autoRotate, autoRotateSpeed: speed }));
  }, [autoRotate, autoRotateSpeed]);

  useEffect(() => {
    const close = (): void => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  useLayoutEffect(() => {
    const refresh = (): void => {
      setLabelColors(readGraphLabelColors());
    };
    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  /**
   * Hover focus (`pointedId`) filters edges. When layout or camera fit changes, node spheres move
   * in world space but the pointer often never receives pointerout — stale focus hides most edges.
   */
  useEffect(() => {
    setPointedId(null);
  }, [nodes, cameraFitOptions]);

  const { nodes: focusNodes, edges: focusEdges } = useMemo(
    () => applyPointedFocusVisibility(nodes, edges, pointedId),
    [nodes, edges, pointedId]
  );

  const nodesMap = useMemo(() => new Map(focusNodes.map((n) => [n.id, n])), [focusNodes]);

  const nodesRendered = useMemo(
    () =>
      focusNodes.map((n) => ({
        ...n,
        isPointed: n.id === pointedId,
      })),
    [focusNodes, pointedId]
  );

  const edgesRendered = useMemo(
    () =>
      focusEdges.map((e) => ({
        ...e,
        isPointed: pointedId !== null && (e.source === pointedId || e.target === pointedId),
      })),
    [focusEdges, pointedId]
  );

  const postOpenPath = useCallback((path: string) => {
    getVscodeApi()?.postMessage({ type: GraphMessageType.OpenPath, payload: { path } });
  }, []);

  const postCopyPath = useCallback((path: string) => {
    getVscodeApi()?.postMessage({ type: GraphMessageType.CopyPath, payload: { path } });
  }, []);

  const handleNodeClick = useCallback((node: GraphNode3D) => {
    centerCameraOnNode(node, setCameraConfig);
  }, []);

  const handleNodeDoubleClick = useCallback(
    (node: GraphNode3D) => {
      if (node.type === 'note' || node.type === 'folder') {
        postOpenPath(resolveFsPath(node));
      }
    },
    [postOpenPath]
  );

  const handlePoint = useCallback((node: GraphNode3D | null) => {
    setPointedId(node?.id ?? null);
  }, []);

  const handleNodeContextMenu = useCallback(
    (node: GraphNode3D, clientX: number, clientY: number) => {
      setContextMenu({ x: clientX, y: clientY, node });
    },
    []
  );

  const handleCanvasPointerMissed = useCallback(() => {
    setContextMenu(null);
    setPointedId(null);
  }, []);

  return (
    <div className="akashi-graph-canvas-wrap">
      {contextMenu ? (
        <div
          className="akashi-graph-context-menu"
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 100,
            background: 'var(--vscode-editorWidget-background, #252526)',
            color: 'var(--vscode-editorWidget-foreground, #ccc)',
            border: '1px solid var(--vscode-widget-border, #333)',
            borderRadius: 4,
            padding: 4,
            minWidth: 140,
            boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
          }}
          role="menu"
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.node.type === 'note' || contextMenu.node.type === 'folder' ? (
            <button
              type="button"
              className="akashi-graph-context-item"
              onClick={() => {
                postOpenPath(resolveFsPath(contextMenu.node));
                setContextMenu(null);
              }}
            >
              Open
            </button>
          ) : null}
          <button
            type="button"
            className="akashi-graph-context-item"
            onClick={() => {
              const n = contextMenu.node;
              const text =
                n.type === 'tag' ? n.formattedTextLines.join(' · ') || n.label : resolveFsPath(n);
              postCopyPath(text);
              setContextMenu(null);
            }}
          >
            Copy path
          </button>
        </div>
      ) : null}
      {nodes.length === 0 && emptyHint ? (
        <div className="akashi-graph-empty-overlay" role="status">
          {emptyHint}
        </div>
      ) : null}
      <Canvas
        frameloop="always"
        camera={{ fov: cameraConfig.fov, near: cameraConfig.near, far: cameraConfig.far }}
        onPointerMissed={handleCanvasPointerMissed}
        gl={{
          alpha: false,
          antialias: true,
          failIfMajorPerformanceCaveat: false,
          powerPreference: 'default',
        }}
        onCreated={({ scene, gl }) => {
          let bg = new THREE.Color(0x1e1e1e);
          try {
            const raw = getComputedStyle(document.body)
              .getPropertyValue('--vscode-editor-background')
              .trim();
            if (raw) {
              bg = new THREE.Color().setStyle(raw);
            }
          } catch {
            /* keep default */
          }
          scene.background = bg;
          gl.setClearColor(bg, 1);
        }}
        style={{ width: '100%', height: '100%', flex: 1, minHeight: 0, display: 'block' }}
      >
        <WebGLResizeSync />
        <LightingSystem config={lightingConfig} />
        <CameraSystem
          config={cameraConfig}
          onRotationStart={() => setIsRotating(true)}
          onRotationEnd={() => setIsRotating(false)}
        />
        {showEdges
          ? edgesRendered.map((edge) => {
              const src = nodesMap.get(edge.source);
              const tgt = nodesMap.get(edge.target);
              if (!src || !tgt) {
                return null;
              }
              return (
                <EdgeRenderer
                  key={edge.id}
                  edge={edge}
                  sourceNode={src}
                  targetNode={tgt}
                  isPointed={edge.isPointed}
                />
              );
            })
          : null}
        {nodesRendered.map((node) => (
          <NodeRenderer
            key={node.id}
            node={node}
            onClick={handleNodeClick}
            onDoubleClick={handleNodeDoubleClick}
            onPoint={handlePoint}
            onContextMenu={handleNodeContextMenu}
            showLabels={showLabels}
            isRotating={isRotating}
            labelPrimaryColor={labelColors.primary}
            labelSecondaryColor={labelColors.secondary}
            labelOutlineColor={labelColors.outline}
          />
        ))}
      </Canvas>
    </div>
  );
};
