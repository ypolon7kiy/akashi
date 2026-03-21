import { OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import React, { useEffect, useRef } from 'react';
import type { Camera3DConfig } from '../../../domain/graphTypes';
import { CAMERA_CONSTANTS } from '../Constants';

interface CameraSystemProps {
  config: Camera3DConfig;
  onRotationStart?: () => void;
  onRotationEnd?: () => void;
}

export const CameraSystem: React.FC<CameraSystemProps> = ({
  config,
  onRotationStart,
  onRotationEnd,
}) => {
  const { camera } = useThree();
  const controlsRef = useRef<unknown>(null);

  useEffect(() => {
    const controls = controlsRef.current as {
      target?: { set: (x: number, y: number, z: number) => void };
      update?: () => void;
    } | null;
    if (!camera || !controls) {
      return;
    }
    const position = config.position;
    camera.position.set(position[0], position[1], position[2]);
    const target = config.target;
    if (controls.target) {
      controls.target.set(target[0], target[1], target[2]);
      controls.update?.();
    }
    if ('fov' in camera) {
      camera.fov = config.fov;
      camera.updateProjectionMatrix();
    }
  }, [camera, config.position, config.target, config.fov]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.1}
      autoRotate={config.autoRotate}
      autoRotateSpeed={config.autoRotateSpeed}
      minDistance={CAMERA_CONSTANTS.ORBIT_MIN_DISTANCE}
      maxDistance={CAMERA_CONSTANTS.ORBIT_MAX_DISTANCE}
      enablePan
      enableZoom
      enableRotate
      onStart={onRotationStart}
      onEnd={onRotationEnd}
      target={config.target}
    />
  );
};
