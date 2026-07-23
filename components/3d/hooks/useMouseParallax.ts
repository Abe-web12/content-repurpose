import { useRef, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface ParallaxConfig {
  strength?: number;
  lerpSpeed?: number;
}

export function useMouseParallax(config: ParallaxConfig = {}) {
  const { strength = 0.3, lerpSpeed = 0.015 } = config;
  const targetX = useRef(0);
  const targetY = useRef(0);

  const update = useCallback(
    (obj: THREE.Object3D, pointerX: number, pointerY: number) => {
      targetX.current += (pointerX * strength - targetX.current) * lerpSpeed;
      targetY.current += (pointerY * strength - targetY.current) * lerpSpeed;
      obj.position.x += targetX.current;
      obj.position.y += targetY.current;
    },
    [strength, lerpSpeed],
  );

  return { update };
}

export function useMouseParallaxPosition(config: ParallaxConfig = {}) {
  const { strength = 0.3, lerpSpeed = 0.015 } = config;
  const offsetRef = useRef({ x: 0, y: 0 });

  useFrame(({ pointer }) => {
    offsetRef.current.x += (pointer.x * strength - offsetRef.current.x) * lerpSpeed;
    offsetRef.current.y += (pointer.y * strength - offsetRef.current.y) * lerpSpeed;
  });

  return offsetRef;
}
