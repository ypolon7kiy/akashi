export const GEOMETRY_CONSTANTS = {
  LEVEL_SPACING: 10,
  FOLDER_NODE_SIZE: 1.5,
  NOTE_SIZE_BASE: 0.5,
  TAG_NODE_SIZE: 0.8,
  EDGE_THICKNESS_BASE: 0.02,
  EDGE_THICKNESS_HOVER: 0.08,
  EDGE_THICKNESS_MULTIPLIER: 0.15,
  LABEL_OFFSET_Y: 0.5,
  /** World-space drei Text (ioodine-style). */
  LABEL_FONT_SIZE: 0.28,
  LABEL_SECONDARY_FONT_SCALE: 0.82,
  LABEL_MAX_WIDTH: 2.4,
} as const;

export const VISUAL_CONSTANTS = {
  EDGE_OPACITY_BASE: 0.6,
  EDGE_OPACITY_HOVER: 1.0,
} as const;

export const LIGHTING_CONSTANTS = {
  AMBIENT_INTENSITY: 0.8,
  DIRECTIONAL_INTENSITY: 1.0,
  DIRECTIONAL_POSITION: [10, 10, 5] as [number, number, number],
  DIRECTIONAL_2_INTENSITY: 0.8,
  DIRECTIONAL_2_POSITION: [-10, -10, -5] as [number, number, number],
  HEMISPHERE_SKY_COLOR: '#ffffff',
  HEMISPHERE_GROUND_COLOR: '#444444',
  HEMISPHERE_INTENSITY: 0.6,
  POINT_LIGHT_1_INTENSITY: 0.6,
  POINT_LIGHT_1_POSITION: [-10, -10, -10] as [number, number, number],
  POINT_LIGHT_2_INTENSITY: 0.5,
  POINT_LIGHT_2_POSITION: [10, 10, 10] as [number, number, number],
} as const;

export const CAMERA_CONSTANTS = {
  DEFAULT_POSITION: [30, 23, 38] as [number, number, number],
  DEFAULT_TARGET: [0, 0, 0] as [number, number, number],
  DEFAULT_FOV: 75,
  DEFAULT_NEAR: 0.1,
  DEFAULT_FAR: 1000,
  DEFAULT_AUTO_ROTATE: false,
  DEFAULT_AUTO_ROTATE_SPEED: 1,
  CENTER_OFFSET_DISTANCE: 10,
  CENTER_HEIGHT_MULTIPLIER: 0.6,
  /** OrbitControls — must exceed fitted camera distance for large graphs. */
  ORBIT_MIN_DISTANCE: 3,
  ORBIT_MAX_DISTANCE: 800,
  /**
   * FOV-based fit (ioodine-style): padding scales with graph size; tighter than legacy span*1.8
   * so the initial framing fills the viewport without looking tiny.
   */
  FIT_PADDING_TINY: 1.32,
  FIT_PADDING_SMALL: 1.22,
  FIT_PADDING_MEDIUM: 1.14,
  FIT_PADDING_LARGE: 1.06,
  FIT_DIAGONAL_TINY: 8,
  FIT_DIAGONAL_SMALL: 24,
  FIT_DIAGONAL_MEDIUM: 72,
  FIT_FOV_EXTRA_LEVELS_3: 10,
  FIT_FOV_EXTRA_LEVELS_4: 15,
  FIT_FOV_CAP: 90,

  /** Camera angle presets (relative offsets; scaled by fit distance). Aligned with ioodine GraphView3D. */
  ANGLE_PRESET_POSITIONS: {
    diagonal: [30, 23, 38] as [number, number, number],
    'diagonal-2': [30, -23, 38] as [number, number, number],
  },
  DEFAULT_ANGLE_PRESET: 'diagonal' as const,
  /** For diagonal-2, lower orbit target on Y so content stays framed (ioodine-style). */
  DIAGONAL_2_TARGET_OFFSET_MULTIPLIER: 0.25,
} as const;
