import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { JSX, MutableRefObject } from 'react';
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation } from 'd3-force';
import type { Simulation } from 'd3-force';
import { inferLayoutDepth } from '../../application/gridLayout';
import { applyPointedFocusVisibility } from '../../application/applyPointedFocusVisibility';
import type { GraphEdge3D, GraphNode3D } from '../../domain/graphTypes';
import { getNodeColor } from '../graphNodeColors';
import { readCanvasThemeColors } from './canvasThemeColors';
import { Graph2DMessageType } from './messages';
import { getVscodeApi } from '../../../../webview-shared/api';

export type SimNode = GraphNode3D & {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  /** Offset from preset hub; simulation pulls toward preset + clusterRel. */
  clusterRel?: { rx: number; ry: number };
};

type SimLink = GraphEdge3D & {
  source: string | SimNode;
  target: string | SimNode;
};

/** Movement past this distance while panning/dragging suppresses the next context menu. */
const CONTEXT_MENU_SUPPRESS_DRAG_PX = 5;

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function seedRing(nodes: SimNode[], prev: Map<string, { x: number; y: number }>): void {
  const n = nodes.length;
  const R = Math.max(80, Math.sqrt(n) * 28);
  for (let i = 0; i < n; i++) {
    const id = nodes[i].id;
    const kept = prev.get(id);
    if (kept && Number.isFinite(kept.x) && Number.isFinite(kept.y)) {
      nodes[i].x = kept.x;
      nodes[i].y = kept.y;
      continue;
    }
    const h = hashId(id);
    const angle = ((i + (h % 360) / 360) / n) * Math.PI * 2;
    const r = R * (0.25 + 0.75 * Math.sqrt((i + 1) / Math.max(1, n)));
    nodes[i].x = r * Math.cos(angle);
    nodes[i].y = r * Math.sin(angle);
    nodes[i].vx = 0;
    nodes[i].vy = 0;
  }
}

/** Ring radius scale when multiple preset hubs share the view (simulation units). */
const HUB_RING_BASE_R = 260;
/** Minimum ring radius so nearby hubs do not overlap clusters (simulation units). */
const HUB_RING_MIN_R = 340;
/** Preset sits above cell anchor (smaller y = higher on screen). */
const PRESET_OFFSET_Y = 78;
const LOCALITY_DY = 46;
const LOCALITY_HALF_DX = 72;
const CONTENT_BASE_DY = 96;
const CONTENT_ROW_STEP = 40;
const COL_STEP = 24;
const SLICE_SHIFT = 48;

function targetYRelToPreset(node: GraphNode3D, all: readonly GraphNode3D[]): number {
  if (node.type === 'preset') {
    return 0;
  }
  if (node.type === 'locality') {
    return LOCALITY_DY;
  }
  const d = typeof node.layoutDepth === 'number' ? node.layoutDepth : inferLayoutDepth(node, all);
  if (d >= 2) {
    return CONTENT_BASE_DY + (d - 2) * CONTENT_ROW_STEP;
  }
  return CONTENT_BASE_DY;
}

/**
 * Preset hubs: one enabled preset sits at the origin; several presets are spaced evenly on a ring around it (no default “main” id).
 * Within each cluster: preset top, locality row, then depth rows.
 */
function seedPresetClusters(nodes: SimNode[], prev: Map<string, { x: number; y: number }>): void {
  const presets = nodes.filter((n) => n.type === 'preset').sort((a, b) => a.id.localeCompare(b.id));
  if (presets.length === 0) {
    seedRing(nodes, prev);
    for (const n of nodes) {
      delete n.clusterRel;
    }
    return;
  }

  const placed = new Set<string>();
  const presetIds = [...new Set(presets.map((p) => p.graphPresetId).filter(Boolean) as string[])].sort((a, b) =>
    a.localeCompare(b)
  );
  if (presetIds.length === 0) {
    seedRing(nodes, prev);
    for (const n of nodes) {
      delete n.clusterRel;
    }
    return;
  }

  const P = presetIds.length;

  const anchorByPresetId = new Map<string, { ax: number; ay: number }>();
  if (P === 1) {
    anchorByPresetId.set(presetIds[0], { ax: 0, ay: 0 });
  } else {
    const ringRadius = Math.max(HUB_RING_MIN_R, HUB_RING_BASE_R * Math.sqrt(P));
    for (let i = 0; i < P; i++) {
      const id = presetIds[i];
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / P;
      anchorByPresetId.set(id, {
        ax: ringRadius * Math.cos(angle),
        ay: ringRadius * Math.sin(angle),
      });
    }
  }

  for (const n of nodes) {
    const kept = prev.get(n.id);
    if (kept && Number.isFinite(kept.x) && Number.isFinite(kept.y)) {
      n.x = kept.x;
      n.y = kept.y;
      n.vx = 0;
      n.vy = 0;
      placed.add(n.id);
    }
  }

  for (const n of nodes) {
    if (placed.has(n.id) || n.type !== 'preset') {
      continue;
    }
    const pid = n.graphPresetId;
    const a = pid && anchorByPresetId.has(pid) ? anchorByPresetId.get(pid)! : { ax: 0, ay: 0 };
    n.x = a.ax;
    n.y = a.ay - PRESET_OFFSET_Y;
    n.vx = 0;
    n.vy = 0;
    placed.add(n.id);
  }

  const presetWorld = new Map<string, { x: number; y: number }>();
  for (const n of nodes) {
    if (n.type === 'preset' && n.graphPresetId) {
      presetWorld.set(n.graphPresetId, { x: n.x, y: n.y });
    }
  }

  for (const n of nodes) {
    if (placed.has(n.id) || n.type !== 'locality') {
      continue;
    }
    const pid = n.graphPresetId;
    const pw = pid ? presetWorld.get(pid) : undefined;
    if (!pw) {
      continue;
    }
    const isGlobal = n.graphLocality === 'global';
    n.x = pw.x + (isGlobal ? -LOCALITY_HALF_DX : LOCALITY_HALF_DX);
    n.y = pw.y + LOCALITY_DY;
    n.vx = 0;
    n.vy = 0;
    placed.add(n.id);
  }

  type ContentNode = SimNode & { type: 'folder' | 'note' | 'tag' };
  const buckets = new Map<string, ContentNode[]>();
  for (const n of nodes) {
    if (placed.has(n.id)) {
      continue;
    }
    if (n.type !== 'folder' && n.type !== 'note' && n.type !== 'tag') {
      continue;
    }
    const pid = n.graphPresetId;
    if (!pid || !presetWorld.has(pid)) {
      continue;
    }
    const d = typeof n.layoutDepth === 'number' ? n.layoutDepth : inferLayoutDepth(n, nodes);
    const slice = n.graphSliceKey ?? `${pid}:${n.graphLocality ?? 'project'}`;
    const key = `${pid}|${slice}|${d}`;
    let arr = buckets.get(key);
    if (!arr) {
      arr = [];
      buckets.set(key, arr);
    }
    arr.push(n as ContentNode);
  }

  for (const arr of buckets.values()) {
    arr.sort((a, b) => a.id.localeCompare(b.id));
  }

  for (const [key, arr] of buckets) {
    const parts = key.split('|');
    const pid = parts[0];
    const sliceKey = parts[1];
    const depth = Number(parts[2]);
    const pw = presetWorld.get(pid);
    if (!pw || arr.length === 0) {
      continue;
    }
    const isGlobal = sliceKey.endsWith(':global');
    const sliceShift = isGlobal ? -SLICE_SHIFT : SLICE_SHIFT;
    const baseY = pw.y + CONTENT_BASE_DY + Math.max(0, depth - 2) * CONTENT_ROW_STEP;
    const m = arr.length;
    for (let idx = 0; idx < m; idx++) {
      const n = arr[idx];
      n.x = pw.x + sliceShift + (idx - (m - 1) / 2) * COL_STEP;
      n.y = baseY;
      n.vx = 0;
      n.vy = 0;
      placed.add(n.id);
    }
  }

  for (const n of nodes) {
    if (placed.has(n.id)) {
      continue;
    }
    const pid = n.graphPresetId;
    const pw = pid ? presetWorld.get(pid) : undefined;
    if (pw) {
      const h = hashId(n.id);
      n.x = pw.x + (h % 80) - 40;
      n.y = pw.y + CONTENT_BASE_DY + (h % 50);
    } else {
      n.x = (hashId(n.id) % 120) - 60;
      n.y = (hashId(n.id + 'y') % 120) - 60;
    }
    n.vx = 0;
    n.vy = 0;
    placed.add(n.id);
  }

  for (const n of nodes) {
    delete n.clusterRel;
    if (n.type === 'preset' || !n.graphPresetId) {
      continue;
    }
    const pw = presetWorld.get(n.graphPresetId);
    if (!pw) {
      continue;
    }
    n.clusterRel = { rx: n.x - pw.x, ry: n.y - pw.y };
  }
}

function createClusterOffsetForce(getStrength: () => number) {
  let nodes: SimNode[] = [];
  function force(alpha: number): void {
    const strength = getStrength();
    if (strength <= 0) {
      return;
    }
    const presetPos = new Map<string, { x: number; y: number }>();
    for (const n of nodes) {
      if (n.type === 'preset' && n.graphPresetId) {
        presetPos.set(n.graphPresetId, { x: n.x, y: n.y });
      }
    }
    for (const n of nodes) {
      if (n.type === 'preset' || n.fx != null || n.fy != null) {
        continue;
      }
      const rel = n.clusterRel;
      const p = n.graphPresetId;
      if (!rel || !p) {
        continue;
      }
      const hub = presetPos.get(p);
      if (!hub) {
        continue;
      }
      const tx = hub.x + rel.rx;
      const ty = hub.y + rel.ry;
      const vx = n.vx ?? 0;
      const vy = n.vy ?? 0;
      n.vx = vx + (tx - n.x) * strength * alpha;
      n.vy = vy + (ty - n.y) * strength * alpha;
    }
  }
  force.initialize = (init: SimNode[]): void => {
    nodes = init;
  };
  return force;
}

function createLayerBandYForce(getStrength: () => number, getAll: () => readonly SimNode[]) {
  let nodes: SimNode[] = [];
  function force(alpha: number): void {
    const strength = getStrength();
    if (strength <= 0) {
      return;
    }
    const presetY = new Map<string, number>();
    for (const n of nodes) {
      if (n.type === 'preset' && n.graphPresetId) {
        presetY.set(n.graphPresetId, n.y);
      }
    }
    const all = getAll();
    for (const n of nodes) {
      if (n.type === 'preset' || n.fx != null || n.fy != null) {
        continue;
      }
      const p = n.graphPresetId;
      if (!p) {
        continue;
      }
      const py = presetY.get(p);
      if (py === undefined) {
        continue;
      }
      const targetY = py + targetYRelToPreset(n, all);
      const vy = n.vy ?? 0;
      n.vy = vy + (targetY - n.y) * strength * alpha;
    }
  }
  force.initialize = (init: SimNode[]): void => {
    nodes = init;
  };
  return force;
}

function nodeRadius(n: GraphNode3D): number {
  return Math.max(5, 3 + n.size * 5);
}

function resolveFsPath(node: GraphNode3D): string {
  if (node.filesystemPath) {
    return node.filesystemPath;
  }
  return node.id;
}

export interface ForceGraphSimProps {
  linkDistance: number;
  linkStrength: number;
  chargeStrength: number;
  centerStrength: number;
  presetClusterStrength: number;
  layerBandStrength: number;
  collidePadding: number;
}

function resetPanZoomToCenterWorldOrigin(
  wrap: HTMLDivElement | null,
  transformRef: MutableRefObject<{ tx: number; ty: number; k: number }>,
  wrapLastSizeRef: MutableRefObject<{ w: number; h: number } | null>
): void {
  if (!wrap) {
    return;
  }
  const w = wrap.clientWidth;
  const h = wrap.clientHeight;
  if (w < 2 || h < 2) {
    return;
  }
  transformRef.current = { k: 1, tx: w / 2, ty: h / 2 };
  wrapLastSizeRef.current = { w, h };
}

function updateSimulationForces(sim: Simulation<SimNode, SimLink>, p: ForceGraphSimProps): void {
  /* d3-force Simulation.force() is typed as a generic Force; call sites are the named forces we registered. */
  /* eslint-disable @typescript-eslint/no-unsafe-call -- force mutators */
  const lf = sim.force('link');
  if (lf) {
    lf.distance(p.linkDistance);
    lf.strength((l: SimLink) => p.linkStrength * Math.min(1, l.strength ?? 1));
  }
  const ch = sim.force('charge');
  ch?.strength(-p.chargeStrength);
  const ce = sim.force('center');
  ce?.strength(p.centerStrength);
  const co = sim.force('collide');
  co?.radius((d: SimNode) => nodeRadius(d) + p.collidePadding);
  /* eslint-enable @typescript-eslint/no-unsafe-call */
  sim.alpha(Math.max(sim.alpha(), 0.35)).restart();
}

export function ForceGraphView(props: {
  nodes: GraphNode3D[];
  edges: GraphEdge3D[];
  emptyHint: string | null;
  showLabels: boolean;
  showEdges: boolean;
  sim: ForceGraphSimProps;
}): JSX.Element {
  const simPropsRef = useRef(props.sim);
  simPropsRef.current = props.sim;

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<Simulation<SimNode, SimLink> | null>(null);
  const simNodesRef = useRef<SimNode[]>([]);
  const posCacheRef = useRef(new Map<string, { x: number; y: number }>());
  const transformRef = useRef({ tx: 0, ty: 0, k: 1 });
  const wrapLastSizeRef = useRef<{ w: number; h: number } | null>(null);
  const draggingRef = useRef<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const panRef = useRef<{ sx: number; sy: number; tx0: number; ty0: number } | null>(null);
  const pointerGestureOriginRef = useRef<{ x: number; y: number } | null>(null);
  const suppressContextMenuAfterGestureRef = useRef(false);
  const [pointedId, setPointedId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    node: GraphNode3D;
  } | null>(null);
  const { nodes: focusNodes, edges: focusEdges } = useMemo(
    () => applyPointedFocusVisibility(props.nodes, props.edges, pointedId),
    [props.nodes, props.edges, pointedId]
  );

  const focusNodeById = useMemo(() => new Map(focusNodes.map((n) => [n.id, n])), [focusNodes]);
  const focusEdgeById = useMemo(() => new Map(focusEdges.map((e) => [e.id, e])), [focusEdges]);

  const postOpenPath = useCallback((path: string) => {
    getVscodeApi()?.postMessage({ type: Graph2DMessageType.OpenPath, payload: { path } });
  }, []);

  const postCopyPath = useCallback((path: string) => {
    getVscodeApi()?.postMessage({ type: Graph2DMessageType.CopyPath, payload: { path } });
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    const dpr = window.devicePixelRatio || 1;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    if (w < 2 || h < 2) {
      return;
    }
    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const { tx, ty, k } = transformRef.current;
    const simNodes = simNodesRef.current;

    ctx.save();
    ctx.translate(tx, ty);
    ctx.scale(k, k);

    const theme = readCanvasThemeColors();

    if (props.showEdges) {
      for (const e of props.edges) {
        const meta = focusEdgeById.get(e.id);
        const vis = meta?.isVisible !== false;
        const src = simNodes.find((n) => n.id === e.source);
        const tgt = simNodes.find((n) => n.id === e.target);
        if (!src || !tgt || src.x === undefined || src.y === undefined) {
          continue;
        }
        if (tgt.x === undefined || tgt.y === undefined) {
          continue;
        }
        const ep = pointedId !== null && (e.source === pointedId || e.target === pointedId);
        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);
        ctx.strokeStyle = ep ? theme.edgeHighlight : theme.edge;
        ctx.globalAlpha = vis ? (ep ? 0.9 : 0.55) : 0.08;
        ctx.lineWidth = ep ? 1.8 / k : 1.35 / k;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    const labelFontPx = Math.max(10, 11 / k);
    let ff = 'sans-serif';
    try {
      ff = getComputedStyle(document.body).fontFamily || ff;
    } catch {
      /* webview */
    }
    ctx.font = `${labelFontPx}px ${ff}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const n of simNodes) {
      const meta = focusNodeById.get(n.id);
      const vis = meta?.isVisible !== false;
      if (n.x === undefined || n.y === undefined) {
        continue;
      }
      const r = nodeRadius(n);
      const np = n.id === pointedId;
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = getNodeColor(n.type);
      ctx.globalAlpha = vis ? 1 : 0.12;
      ctx.fill();
      ctx.globalAlpha = vis ? 0.9 : 0.15;
      ctx.strokeStyle = np ? theme.nodeStrokeHighlight : theme.nodeStroke;
      ctx.lineWidth = np ? 2.2 / k : 1 / k;
      ctx.stroke();
      ctx.globalAlpha = 1;

      if (props.showLabels && vis) {
        const label = n.label.length > 32 ? `${n.label.slice(0, 31)}…` : n.label;
        ctx.fillStyle = theme.label;
        ctx.fillText(label, n.x, n.y + r + labelFontPx * 0.85);
      }
    }

    ctx.restore();
  }, [props.edges, props.showEdges, props.showLabels, pointedId, focusNodeById, focusEdgeById]);

  const drawRef = useRef(draw);
  drawRef.current = draw;

  const graphSig = useMemo(() => {
    const ids = props.nodes.map((n) => n.id).join('\0');
    const es = props.edges.map((e) => `${e.source}->${e.target}`).join('\0');
    return `${ids}|${es}`;
  }, [props.nodes, props.edges]);

  useEffect(() => {
    setPointedId(null);
  }, [graphSig]);

  useEffect(() => {
    const onClick = (): void => setContextMenu(null);
    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, []);

  useEffect(() => {
    simRef.current?.stop();
    simRef.current = null;
    simNodesRef.current = [];

    if (props.nodes.length === 0) {
      resetPanZoomToCenterWorldOrigin(wrapRef.current, transformRef, wrapLastSizeRef);
      drawRef.current();
      return;
    }

    const simNodes: SimNode[] = props.nodes.map((n) => ({
      ...n,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
    }));
    seedPresetClusters(simNodes, posCacheRef.current);
    simNodes.forEach((n) => {
      posCacheRef.current.set(n.id, { x: n.x, y: n.y });
    });

    const simLinks: SimLink[] = props.edges.map((e) => ({
      ...e,
      source: e.source,
      target: e.target,
    }));

    const linkForce = forceLink<SimNode, SimLink>(simLinks)
      .id((d) => d.id)
      .distance(props.sim.linkDistance)
      .strength((l) => props.sim.linkStrength * Math.min(1, l.strength ?? 1));

    const sim: Simulation<SimNode, SimLink> = forceSimulation<SimNode>(simNodes)
      .force('link', linkForce)
      .force('charge', forceManyBody<SimNode>().strength(-props.sim.chargeStrength))
      .force('center', forceCenter(0, 0).strength(props.sim.centerStrength))
      .force(
        'clusterOffset',
        createClusterOffsetForce(() => simPropsRef.current.presetClusterStrength)
      )
      .force(
        'layerBand',
        createLayerBandYForce(
          () => simPropsRef.current.layerBandStrength,
          () => simNodes
        )
      )
      .force(
        'collide',
        forceCollide<SimNode>()
          .radius((d) => nodeRadius(d) + props.sim.collidePadding)
          .strength(0.85)
      )
      .alphaDecay(0.0228)
      .alphaMin(0.001)
      .on('tick', () => {
        for (const sn of simNodes) {
          posCacheRef.current.set(sn.id, { x: sn.x, y: sn.y });
        }
        drawRef.current();
      });

    simRef.current = sim;
    simNodesRef.current = simNodes;
    resetPanZoomToCenterWorldOrigin(wrapRef.current, transformRef, wrapLastSizeRef);
    drawRef.current();

    return () => {
      sim.stop();
    };
  }, [graphSig, props.nodes, props.edges]);

  useEffect(() => {
    const sim = simRef.current;
    if (!sim || props.nodes.length === 0) {
      return;
    }
    updateSimulationForces(sim, props.sim);
  }, [
    props.sim.linkDistance,
    props.sim.linkStrength,
    props.sim.chargeStrength,
    props.sim.centerStrength,
    props.sim.presetClusterStrength,
    props.sim.layerBandStrength,
    props.sim.collidePadding,
    props.nodes.length,
  ]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) {
      return;
    }
    const ro = new ResizeObserver(() => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (w < 2 || h < 2) {
        return;
      }
      const prev = wrapLastSizeRef.current;
      if (prev) {
        transformRef.current.tx += (w - prev.w) / 2;
        transformRef.current.ty += (h - prev.h) / 2;
      } else {
        transformRef.current = { k: 1, tx: w / 2, ty: h / 2 };
      }
      wrapLastSizeRef.current = { w, h };
      drawRef.current();
    });
    ro.observe(wrap);
    drawRef.current();
    return () => ro.disconnect();
  }, []);

  const clientToWorld = useCallback((clientX: number, clientY: number) => {
    const wrap = wrapRef.current;
    if (!wrap) {
      return { wx: 0, wy: 0 };
    }
    const r = wrap.getBoundingClientRect();
    const sx = clientX - r.left;
    const sy = clientY - r.top;
    const { tx, ty, k } = transformRef.current;
    return { wx: (sx - tx) / k, wy: (sy - ty) / k };
  }, []);

  const pickNode = useCallback((wx: number, wy: number): SimNode | null => {
    let best: SimNode | null = null;
    let bestD = Infinity;
    for (const n of simNodesRef.current) {
      if (n.x === undefined || n.y === undefined) {
        continue;
      }
      const r = nodeRadius(n);
      const dx = wx - n.x;
      const dy = wy - n.y;
      const d2 = dx * dx + dy * dy;
      if (d2 <= r * r && d2 < bestD) {
        bestD = d2;
        best = n;
      }
    }
    return best;
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const wrap = wrapRef.current;
    if (!wrap) {
      return;
    }
    const r = wrap.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    const { tx, ty, k } = transformRef.current;
    const wx = (mx - tx) / k;
    const wy = (my - ty) / k;
    const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
    const newK = Math.min(4, Math.max(0.12, k * factor));
    transformRef.current = {
      k: newK,
      tx: mx - wx * newK,
      ty: my - wy * newK,
    };
    drawRef.current();
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      suppressContextMenuAfterGestureRef.current = false;
      pointerGestureOriginRef.current = { x: e.clientX, y: e.clientY };
      const { wx, wy } = clientToWorld(e.clientX, e.clientY);
      const hit = pickNode(wx, wy);
      if (hit) {
        draggingRef.current = {
          id: hit.id,
          offsetX: wx - hit.x,
          offsetY: wy - hit.y,
        };
        hit.fx = wx - draggingRef.current.offsetX;
        hit.fy = wy - draggingRef.current.offsetY;
        simRef.current?.alphaTarget(0.35).restart();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        setPointedId(hit.id);
        return;
      }
      draggingRef.current = null;
      panRef.current = {
        sx: e.clientX,
        sy: e.clientY,
        tx0: transformRef.current.tx,
        ty0: transformRef.current.ty,
      };
      setPointedId(null);
      setContextMenu(null);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [clientToWorld, pickNode]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const origin = pointerGestureOriginRef.current;
      if (origin && (draggingRef.current || panRef.current)) {
        const moved = Math.hypot(e.clientX - origin.x, e.clientY - origin.y);
        if (moved >= CONTEXT_MENU_SUPPRESS_DRAG_PX) {
          suppressContextMenuAfterGestureRef.current = true;
        }
      }
      if (draggingRef.current) {
        const { wx, wy } = clientToWorld(e.clientX, e.clientY);
        const hit = simNodesRef.current.find((n) => n.id === draggingRef.current?.id);
        if (hit) {
          hit.fx = wx - draggingRef.current.offsetX;
          hit.fy = wy - draggingRef.current.offsetY;
        }
        return;
      }
      if (panRef.current) {
        const dx = e.clientX - panRef.current.sx;
        const dy = e.clientY - panRef.current.sy;
        transformRef.current = {
          ...transformRef.current,
          tx: panRef.current.tx0 + dx,
          ty: panRef.current.ty0 + dy,
        };
        drawRef.current();
        return;
      }
      const { wx, wy } = clientToWorld(e.clientX, e.clientY);
      const hit = pickNode(wx, wy);
      setPointedId(hit?.id ?? null);
    },
    [clientToWorld, pickNode]
  );

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (draggingRef.current) {
      const hit = simNodesRef.current.find((n) => n.id === draggingRef.current?.id);
      if (hit) {
        hit.fx = null;
        hit.fy = null;
      }
      draggingRef.current = null;
      simRef.current?.alphaTarget(0).restart();
    }
    panRef.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  const onDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const { wx, wy } = clientToWorld(e.clientX, e.clientY);
      const hit = pickNode(wx, wy);
      if (hit && (hit.type === 'note' || hit.type === 'folder')) {
        postOpenPath(resolveFsPath(hit));
      }
    },
    [clientToWorld, pickNode, postOpenPath]
  );

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (suppressContextMenuAfterGestureRef.current) {
        suppressContextMenuAfterGestureRef.current = false;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      const { wx, wy } = clientToWorld(e.clientX, e.clientY);
      const hit = pickNode(wx, wy);
      if (!hit) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY, node: hit });
    },
    [clientToWorld, pickNode]
  );

  return (
    <div className="akashi-graph2d-canvas-wrap" ref={wrapRef}>
      {contextMenu ? (
        <div
          className="akashi-graph-context-menu akashi-graph2d-context-menu"
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
          onClick={(ev) => ev.stopPropagation()}
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
      {props.nodes.length === 0 && props.emptyHint ? (
        <div className="akashi-graph-empty-overlay" role="status">
          {props.emptyHint}
        </div>
      ) : null}
      <canvas
        ref={canvasRef}
        className="akashi-graph2d-canvas"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
      />
    </div>
  );
}
