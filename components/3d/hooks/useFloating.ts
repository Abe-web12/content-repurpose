import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface OrganicFloatingConfig {
  speedBase?: number;
  speedRange?: number;
  amplitudeY?: number;
  amplitudeX?: number;
  amplitudeZ?: number;
  rotationSpeed?: number;
  rotationAmplitude?: number;
}

export function useOrganicFloat(config: OrganicFloatingConfig = {}) {
  const {
    speedBase = 0.5,
    speedRange = 0.3,
    amplitudeY = 0.06,
    amplitudeX = 0.03,
    amplitudeZ = 0.02,
    rotationSpeed = 0.3,
    rotationAmplitude = 0.02,
  } = config;

  const phases = useMemo(
    () => ({
      y1: Math.random() * Math.PI * 2,
      y2: Math.random() * Math.PI * 2,
      x1: Math.random() * Math.PI * 2,
      x2: Math.random() * Math.PI * 2,
      z1: Math.random() * Math.PI * 2,
      rot: Math.random() * Math.PI * 2,
    }),
    [],
  );

  const freq = useMemo(
    () => ({
      y1: speedBase + Math.random() * speedRange,
      y2: speedBase * 0.5 + Math.random() * speedRange * 0.5,
      x1: speedBase * 0.7 + Math.random() * speedRange * 0.5,
      x2: speedBase * 0.3 + Math.random() * speedRange * 0.3,
      rot: rotationSpeed + Math.random() * 0.2,
    }),
    [speedBase, speedRange, rotationSpeed],
  );

  const initialPos = useRef<THREE.Vector3 | null>(null);

  function update(obj: THREE.Object3D, t: number) {
    if (!initialPos.current) {
      initialPos.current = obj.position.clone();
    }
    const pos = initialPos.current;

    const yOffset =
      Math.sin(t * freq.y1 + phases.y1) * amplitudeY +
      Math.sin(t * freq.y2 + phases.y2) * amplitudeY * 0.5;
    const xOffset =
      Math.sin(t * freq.x1 + phases.x1) * amplitudeX +
      Math.sin(t * freq.x2 + phases.x2) * amplitudeX * 0.4;
    const zOffset = Math.sin(t * freq.x1 + phases.z1) * amplitudeZ;

    obj.position.x = pos.x + xOffset;
    obj.position.y = pos.y + yOffset;
    obj.position.z = pos.z + zOffset;

    obj.rotation.x += Math.sin(t * freq.rot + phases.rot) * rotationAmplitude;
    obj.rotation.z += Math.cos(t * freq.rot * 0.7 + phases.rot) * rotationAmplitude * 0.6;
  }

  return { update };
}

export const useFloating = useOrganicFloat;

export function useFloatingGroup(config: OrganicFloatingConfig = {}) {
  const ref = useRef<THREE.Group>(null);
  const { update } = useOrganicFloat(config);

  useFrame(({ clock }) => {
    if (ref.current) {
      update(ref.current, clock.getElapsedTime());
    }
  });

  return ref;
}
