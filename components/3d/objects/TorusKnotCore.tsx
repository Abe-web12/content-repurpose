import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { TORUS_KNOT, COLOR_CONFIGS } from "../constants";
import type { ProgressRef } from "../types";

interface TorusKnotCoreProps {
  progressRef: ProgressRef;
}

export function TorusKnotCore({ progressRef }: TorusKnotCoreProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const targetScale = useRef(1);
  const targetEmissiveIntensity = useRef<number>(TORUS_KNOT.BASE_EMISSIVE_INTENSITY);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const p = progressRef.current;
    const t = clock.getElapsedTime();

    const fragmentScale = Math.max(TORUS_KNOT.MIN_SCALE, 1 - p * 1.2);
    const breathe1 = Math.sin(t * (1 + p * 2)) * TORUS_KNOT.BREATHE_AMPLITUDE;
    const breathe2 = Math.sin(t * 0.5) * TORUS_KNOT.BREATHE_AMPLITUDE * 0.5;
    const breathing = breathe1 + breathe2 + p * 0.03;

    const scaleTarget = fragmentScale + (targetScale.current - fragmentScale) * TORUS_KNOT.LERP_SPEED + breathing;
    meshRef.current.scale.setScalar(scaleTarget);

    meshRef.current.rotation.x = p * 0.8 + Math.sin(t * 0.3) * 0.05 + Math.sin(t * 0.15) * 0.02;
    meshRef.current.rotation.y = t * (0.2 + p * 0.3);

    const floatY = Math.sin(t * TORUS_KNOT.FLOAT_SPEED_Y) * TORUS_KNOT.FLOAT_AMPLITUDE_Y;
    const floatX = Math.sin(t * TORUS_KNOT.FLOAT_SPEED_X) * TORUS_KNOT.FLOAT_AMPLITUDE_X;
    meshRef.current.position.y = floatY;
    meshRef.current.position.x = floatX;

    const mat = meshRef.current.material as THREE.MeshPhysicalMaterial;
    mat.emissiveIntensity += (targetEmissiveIntensity.current - mat.emissiveIntensity) * TORUS_KNOT.EMISSIVE_LERP_SPEED;
    mat.opacity = Math.max(0.2, 1 - p * 0.8);

    const sectionIndex = Math.min(Math.floor(p * COLOR_CONFIGS.length), COLOR_CONFIGS.length - 1);
    const config = COLOR_CONFIGS[sectionIndex];
    const targetColor = new THREE.Color(config.accent);
    const targetEmissive = new THREE.Color(config.emissive);

    mat.color.lerp(targetColor, TORUS_KNOT.COLOR_LERP_SPEED);
    mat.emissive.lerp(targetEmissive, TORUS_KNOT.COLOR_LERP_SPEED);
  });

  return (
    <mesh
      ref={meshRef}
      onPointerOver={() => {
        targetScale.current = TORUS_KNOT.HOVER_SCALE;
        targetEmissiveIntensity.current = TORUS_KNOT.HOVER_EMISSIVE_INTENSITY;
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        targetScale.current = Math.max(TORUS_KNOT.MIN_SCALE, 1 - progressRef.current * 1.2);
        targetEmissiveIntensity.current = TORUS_KNOT.BASE_EMISSIVE_INTENSITY;
        document.body.style.cursor = "default";
      }}
    >
      <torusKnotGeometry
        args={[
          TORUS_KNOT.RADIUS,
          TORUS_KNOT.TUBE,
          TORUS_KNOT.RADIAL_SEGMENTS,
          TORUS_KNOT.TUBULAR_SEGMENTS,
        ]}
      />
      <meshPhysicalMaterial
        color="#818cf8"
        emissive="#4f46e5"
        emissiveIntensity={TORUS_KNOT.BASE_EMISSIVE_INTENSITY}
        roughness={TORUS_KNOT.ROUGHNESS}
        metalness={TORUS_KNOT.METALNESS}
        clearcoat={TORUS_KNOT.CLEARCOAT}
        clearcoatRoughness={TORUS_KNOT.CLEARCOAT_ROUGHNESS}
        envMapIntensity={TORUS_KNOT.ENV_MAP_INTENSITY}
        transparent
        opacity={1}
      />
    </mesh>
  );
}
