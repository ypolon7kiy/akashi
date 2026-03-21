import React from 'react';
import type { Lighting3DConfig } from '../../../domain/graphTypes';
import { LIGHTING_COLORS, UI_COLORS } from '../colors';
import { LIGHTING_CONSTANTS } from '../Constants';

interface LightingSystemProps {
  config: Lighting3DConfig;
}

export const LightingSystem: React.FC<LightingSystemProps> = ({ config }) => {
  return (
    <>
      <ambientLight color={config.ambient.color} intensity={config.ambient.intensity} />
      <hemisphereLight
        color={LIGHTING_CONSTANTS.HEMISPHERE_SKY_COLOR}
        groundColor={LIGHTING_CONSTANTS.HEMISPHERE_GROUND_COLOR}
        intensity={LIGHTING_CONSTANTS.HEMISPHERE_INTENSITY}
      />
      <directionalLight
        color={config.directional.color}
        intensity={config.directional.intensity}
        position={config.directional.position}
        castShadow
      />
      <directionalLight
        color={LIGHTING_COLORS.DIRECTIONAL}
        intensity={LIGHTING_CONSTANTS.DIRECTIONAL_2_INTENSITY}
        position={LIGHTING_CONSTANTS.DIRECTIONAL_2_POSITION}
      />
      <pointLight
        color={LIGHTING_COLORS.POINT_LIGHT_1}
        intensity={LIGHTING_CONSTANTS.POINT_LIGHT_1_INTENSITY}
        position={LIGHTING_CONSTANTS.POINT_LIGHT_1_POSITION}
      />
      <pointLight
        color={LIGHTING_COLORS.POINT_LIGHT_2}
        intensity={LIGHTING_CONSTANTS.POINT_LIGHT_2_INTENSITY}
        position={LIGHTING_CONSTANTS.POINT_LIGHT_2_POSITION}
      />
    </>
  );
};

export function getDefaultLightingConfig(): Lighting3DConfig {
  return {
    ambient: {
      color: UI_COLORS.BACKGROUND_DARK,
      intensity: LIGHTING_CONSTANTS.AMBIENT_INTENSITY,
    },
    directional: {
      color: LIGHTING_COLORS.DIRECTIONAL,
      intensity: LIGHTING_CONSTANTS.DIRECTIONAL_INTENSITY,
      position: [...LIGHTING_CONSTANTS.DIRECTIONAL_POSITION],
    },
  };
}
