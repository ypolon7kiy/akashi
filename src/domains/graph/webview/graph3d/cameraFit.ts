import type { Camera3DConfig, CameraAnglePreset, GraphNode3D } from '../../domain/graphTypes';
import { CAMERA_CONSTANTS } from './Constants';

export interface GraphBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  centerX: number;
  centerY: number;
  centerZ: number;
  width: number;
  height: number;
  depth: number;
}

export interface CameraFitOptions {
  /** Multiplies fitted camera distance (ioodine ControlPanel default 1.0, range ~0.1–1). */
  cameraDistanceMultiplier?: number;
  cameraAnglePreset?: CameraAnglePreset;
}

export function calculateGraphBounds(nodes: GraphNode3D[]): GraphBounds | null {
  if (nodes.length === 0) {
    return null;
  }
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const node of nodes) {
    const s = node.size || 1;
    const [x, y, z] = node.position;
    minX = Math.min(minX, x - s);
    maxX = Math.max(maxX, x + s);
    minY = Math.min(minY, y - s);
    maxY = Math.max(maxY, y + s);
    minZ = Math.min(minZ, z - s);
    maxZ = Math.max(maxZ, z + s);
  }
  return {
    minX,
    maxX,
    minY,
    maxY,
    minZ,
    maxZ,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    centerZ: (minZ + maxZ) / 2,
    width: maxX - minX,
    height: maxY - minY,
    depth: maxZ - minZ,
  };
}

export function getDefaultCameraConfig(): Camera3DConfig {
  return {
    position: [...CAMERA_CONSTANTS.DEFAULT_POSITION],
    target: [...CAMERA_CONSTANTS.DEFAULT_TARGET],
    fov: CAMERA_CONSTANTS.DEFAULT_FOV,
    near: CAMERA_CONSTANTS.DEFAULT_NEAR,
    far: CAMERA_CONSTANTS.DEFAULT_FAR,
    autoRotate: CAMERA_CONSTANTS.DEFAULT_AUTO_ROTATE,
    autoRotateSpeed: CAMERA_CONSTANTS.DEFAULT_AUTO_ROTATE_SPEED,
  };
}

/**
 * Fit camera using vertical FOV and bounding diagonal (ioodine GraphUtils.calculateCameraFit idea).
 * Does not set `autoRotate` / `autoRotateSpeed` — merge from previous UI state in the caller.
 */
export function cameraFitToBounds(
  nodes: GraphNode3D[],
  options?: CameraFitOptions
): Omit<Camera3DConfig, 'autoRotate' | 'autoRotateSpeed'> {
  const b = calculateGraphBounds(nodes);
  if (!b) {
    const d = getDefaultCameraConfig();
    const { autoRotate: _a, autoRotateSpeed: _s, ...rest } = d;
    void _a;
    void _s;
    return rest;
  }

  const w = b.width;
  const h = b.height;
  const d = b.depth;
  const diagonal = Math.sqrt(w * w + h * h + d * d);

  let padding: number;
  if (diagonal < CAMERA_CONSTANTS.FIT_DIAGONAL_TINY) {
    padding = CAMERA_CONSTANTS.FIT_PADDING_TINY;
  } else if (diagonal < CAMERA_CONSTANTS.FIT_DIAGONAL_SMALL) {
    padding = CAMERA_CONSTANTS.FIT_PADDING_SMALL;
  } else if (diagonal < CAMERA_CONSTANTS.FIT_DIAGONAL_MEDIUM) {
    padding = CAMERA_CONSTANTS.FIT_PADDING_MEDIUM;
  } else {
    padding = CAMERA_CONSTANTS.FIT_PADDING_LARGE;
  }

  let fov: number = CAMERA_CONSTANTS.DEFAULT_FOV;
  const depthLevels = new Set(
    nodes.map((n) =>
      typeof n.layoutDepth === 'number' ? n.layoutDepth : typeof n.depth === 'number' ? n.depth : 0
    )
  ).size;
  if (depthLevels >= 4) {
    fov = Math.min(fov + CAMERA_CONSTANTS.FIT_FOV_EXTRA_LEVELS_4, CAMERA_CONSTANTS.FIT_FOV_CAP);
  } else if (depthLevels >= 3) {
    fov = Math.min(fov + CAMERA_CONSTANTS.FIT_FOV_EXTRA_LEVELS_3, CAMERA_CONSTANTS.FIT_FOV_CAP);
  }

  const fovRad = (fov * Math.PI) / 180;
  let cameraDistance = diagonal / 2 / Math.tan(fovRad / 2);
  cameraDistance *= padding;

  const tall = h > w * 0.85 || h > d * 0.85;
  if (tall) {
    const verticalDistance = (h / 2 / Math.tan(fovRad / 2)) * padding;
    cameraDistance = Math.max(cameraDistance, verticalDistance);
  }

  const minD = Math.max(diagonal * 0.32, 5);
  const maxD = 480;
  cameraDistance = Math.min(Math.max(cameraDistance, minD), maxD);

  const mult = options?.cameraDistanceMultiplier ?? 1;
  cameraDistance *= mult;

  const preset = options?.cameraAnglePreset ?? CAMERA_CONSTANTS.DEFAULT_ANGLE_PRESET;
  const presetPos = CAMERA_CONSTANTS.ANGLE_PRESET_POSITIONS[preset];

  const targetX = b.centerX;
  let targetY = b.centerY;
  const targetZ = b.centerZ;
  if (preset === 'diagonal-2') {
    targetY = b.centerY - b.height * CAMERA_CONSTANTS.DIAGONAL_2_TARGET_OFFSET_MULTIPLIER;
  }

  const presetLen = Math.hypot(presetPos[0], presetPos[1], presetPos[2]);
  const scale = presetLen > 0 ? cameraDistance / presetLen : 1;
  const position: [number, number, number] = [
    targetX + presetPos[0] * scale,
    targetY + presetPos[1] * scale,
    targetZ + presetPos[2] * scale,
  ];

  return {
    position,
    target: [targetX, targetY, targetZ],
    fov,
    near: CAMERA_CONSTANTS.DEFAULT_NEAR,
    far: CAMERA_CONSTANTS.DEFAULT_FAR,
  };
}
