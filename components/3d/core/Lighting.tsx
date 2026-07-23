import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { LIGHTS, ATMOSPHERE, COLOR_CONFIGS } from "../constants";
import type { ProgressRef } from "../types";

interface LightingProps {
  progressRef: ProgressRef;
  prefersReducedMotion?: boolean;
}

export function Lighting({ progressRef, prefersReducedMotion = false }: LightingProps) {
  const { scene } = useThree();
  const rimLeftRef = useRef<THREE.DirectionalLight>(null);
  const rimRightRef = useRef<THREE.DirectionalLight>(null);
  const point1Ref = useRef<THREE.PointLight>(null);
  const point2Ref = useRef<THREE.PointLight>(null);
  const point3Ref = useRef<THREE.PointLight>(null);
  const fogRef = useRef<THREE.FogExp2 | null>(null);

  useEffect(() => {
    fogRef.current = new THREE.FogExp2(
      new THREE.Color(ATMOSPHERE.BASE_FOG_COLOR),
      ATMOSPHERE.BASE_FOG_DENSITY,
    );
    scene.fog = fogRef.current;
    return () => {
      scene.fog = null;
    };
  }, [scene]);

  useFrame(({ clock }) => {
    const p = progressRef.current;
    const t = clock.getElapsedTime();

    const sectionIndex = Math.min(Math.floor(p * COLOR_CONFIGS.length), COLOR_CONFIGS.length - 1);
    const config = COLOR_CONFIGS[sectionIndex];

    if (rimLeftRef.current) {
      const baseX = LIGHTS.RIM_BACK_LEFT.position[0];
      const baseZ = LIGHTS.RIM_BACK_LEFT.position[2];
      const drift = prefersReducedMotion ? 0 : Math.sin(t * 0.1) * 0.3;
      rimLeftRef.current.position.x = baseX + drift;
      rimLeftRef.current.position.z = baseZ + Math.cos(t * 0.08) * 0.3;
      rimLeftRef.current.color.lerp(new THREE.Color(config.rimColor), 0.04);
    }

    if (rimRightRef.current) {
      const baseX = LIGHTS.RIM_BACK_RIGHT.position[0];
      const baseZ = LIGHTS.RIM_BACK_RIGHT.position[2];
      const drift = prefersReducedMotion ? 0 : Math.sin(t * 0.08 + 1) * 0.3;
      rimRightRef.current.position.x = baseX + drift;
      rimRightRef.current.position.z = baseZ + Math.cos(t * 0.1 + 1) * 0.3;
      rimRightRef.current.color.lerp(new THREE.Color(config.rimColor), 0.04);
    }

    if (point1Ref.current) {
      point1Ref.current.position.y = LIGHTS.POINT1.position[1] + Math.sin(t * 0.2) * 0.3;
    }
    if (point2Ref.current) {
      point2Ref.current.position.y = LIGHTS.POINT2.position[1] + Math.cos(t * 0.15) * 0.3;
    }
    if (point3Ref.current) {
      point3Ref.current.position.y = LIGHTS.POINT3.position[1] + Math.sin(t * 0.18 + 1) * 0.3;
    }

    if (fogRef.current) {
      const targetColor = new THREE.Color(config.fogColor);
      fogRef.current.color.lerp(targetColor, 0.03);
      fogRef.current.density = ATMOSPHERE.BASE_FOG_DENSITY - p * 0.01;
    }
  });

  return (
    <>
      <ambientLight intensity={LIGHTS.AMBIENT_INTENSITY} />
      <hemisphereLight args={[LIGHTS.HEMISPHERE_SKY, LIGHTS.HEMISPHERE_GROUND, LIGHTS.HEMISPHERE_INTENSITY]} />
      <directionalLight
        position={LIGHTS.DIRECTIONAL_POSITION}
        intensity={LIGHTS.DIRECTIONAL_INTENSITY}
        color={LIGHTS.DIRECTIONAL_COLOR}
      />
      <directionalLight
        ref={rimLeftRef}
        position={LIGHTS.RIM_BACK_LEFT.position}
        intensity={LIGHTS.RIM_BACK_LEFT.intensity}
        color={LIGHTS.RIM_BACK_LEFT.color}
      />
      <directionalLight
        ref={rimRightRef}
        position={LIGHTS.RIM_BACK_RIGHT.position}
        intensity={LIGHTS.RIM_BACK_RIGHT.intensity}
        color={LIGHTS.RIM_BACK_RIGHT.color}
      />
      <pointLight
        ref={point1Ref}
        position={LIGHTS.POINT1.position}
        intensity={LIGHTS.POINT1.intensity}
        color={LIGHTS.POINT1.color}
      />
      <pointLight
        ref={point2Ref}
        position={LIGHTS.POINT2.position}
        intensity={LIGHTS.POINT2.intensity}
        color={LIGHTS.POINT2.color}
      />
      <pointLight
        ref={point3Ref}
        position={LIGHTS.POINT3.position}
        intensity={LIGHTS.POINT3.intensity}
        color={LIGHTS.POINT3.color}
      />
    </>
  );
}
