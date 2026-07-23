import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PARTICLES } from "../constants";
import type { ProgressRef } from "../types";

interface ParticleFieldProps {
  count?: number;
  size?: number;
  vertexColors?: boolean;
  progressRef?: ProgressRef;
  prefersReducedMotion?: boolean;
}

export function ParticleField({
  count = PARTICLES.BACKGROUND_COUNT,
  size = PARTICLES.BACKGROUND_SIZE,
  vertexColors = false,
  progressRef,
  prefersReducedMotion = false,
}: ParticleFieldProps) {
  const ref = useRef<THREE.Points>(null);
  const phaseOffsets = useMemo(
    () => Array.from({ length: count }, () => Math.random() * Math.PI * 2),
    [count],
  );

  const { geometry, initialPositions } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = vertexColors ? new Float32Array(count * 3) : null;
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * PARTICLES.SPREAD.x;
      positions[i3 + 1] = (Math.random() - 0.5) * PARTICLES.SPREAD.y;
      positions[i3 + 2] = (Math.random() - 0.5) * PARTICLES.SPREAD.z - 5;
      if (colors) {
        const shade = 0.4 + Math.random() * 0.6;
        colors[i3] = 0.4 * shade;
        colors[i3 + 1] = 0.3 * shade;
        colors[i3 + 2] = 0.9 * shade;
      }
      sizes[i] = 0.02 + Math.random() * 0.04;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    if (colors) {
      geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    }
    geo.setAttribute("size", new THREE.Float32BufferAttribute(sizes, 1));
    return { geometry: geo, initialPositions: positions };
  }, [count, vertexColors]);

  useFrame(({ clock, pointer }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    const p = progressRef?.current ?? 0;
    const pos = ref.current.geometry.attributes.position.array as Float32Array;

    if (prefersReducedMotion) {
      ref.current.rotation.y = p * 2;
      ref.current.rotation.x = p * 0.5;
      return;
    }

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const phase = phaseOffsets[i];
      pos[i3] =
        initialPositions[i3] +
        Math.sin(t * PARTICLES.DRIFT_SPEED + phase) * PARTICLES.DRIFT_AMPLITUDE +
        pointer.x * PARTICLES.SCROLL_RESPONSE * 0.1;
      pos[i3 + 1] =
        initialPositions[i3 + 1] +
        Math.cos(t * PARTICLES.DRIFT_SPEED * 0.7 + phase) * PARTICLES.DRIFT_AMPLITUDE * 0.5 +
        pointer.y * PARTICLES.SCROLL_RESPONSE * 0.1;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;

    ref.current.rotation.y = t * 0.02 + p * 2;
    ref.current.rotation.x = Math.sin(t * 0.1) * 0.03 + p * 0.5;
  });

  const materialProps = vertexColors
    ? { vertexColors: true as const }
    : { color: "#a5b4fc" as const };

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial
        {...materialProps}
        size={size}
        transparent
        opacity={PARTICLES.OPACITY}
        sizeAttenuation
        blending={vertexColors ? THREE.AdditiveBlending : undefined}
        depthWrite={false}
      />
    </points>
  );
}
