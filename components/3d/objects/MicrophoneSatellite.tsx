import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SATELLITES, MATERIALS } from "../constants";
import type { ProgressRef } from "../types";

interface MicrophoneSatelliteProps {
  progressRef: ProgressRef;
}

export function MicrophoneSatellite({ progressRef }: MicrophoneSatelliteProps) {
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshPhysicalMaterial>(null);

  useFrame(({ clock, pointer }) => {
    if (!groupRef.current || !matRef.current) return;
    const p = progressRef.current;
    const t = clock.getElapsedTime();

    const fadeOut = Math.max(0, 1 - p * 4);
    matRef.current.opacity = fadeOut;
    groupRef.current.visible = fadeOut > 0.01;

    if (fadeOut <= 0.01) return;

    const angle = t * SATELLITES.MICROPHONE.speed + p * 0.2;
    const radius = SATELLITES.MICROPHONE.orbitRadius - p * 0.5;
    groupRef.current.position.x = Math.cos(angle) * radius + pointer.x * SATELLITES.POINTER_INFLUENCE;
    groupRef.current.position.z = Math.sin(angle) * radius * 0.5;
    groupRef.current.position.y = 0.8 + Math.sin(t * SATELLITES.Y_BOB_SPEED) * SATELLITES.Y_BOB_AMPLITUDE;
    groupRef.current.rotation.z = 0.3 + Math.sin(t * 0.2) * 0.05;
    groupRef.current.rotation.x = Math.sin(t * 0.15) * 0.03;
    groupRef.current.scale.setScalar(0.7);
  });

  return (
    <group ref={groupRef} position={SATELLITES.MICROPHONE.position}>
      <mesh position={[0, 0.5, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshPhysicalMaterial
          ref={matRef}
          color="#a78bfa"
          roughness={0.15}
          metalness={0.8}
          clearcoat={MATERIALS.CLEARCOAT}
          clearcoatRoughness={MATERIALS.CLEARCOAT_ROUGHNESS}
          envMapIntensity={MATERIALS.ENV_MAP_INTENSITY}
          transparent
          opacity={1}
        />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.8, 12]} />
        <meshPhysicalMaterial
          color="#7c3aed"
          roughness={0.3}
          metalness={0.6}
          clearcoat={MATERIALS.CLEARCOAT}
          envMapIntensity={MATERIALS.ENV_MAP_INTENSITY}
          transparent
          opacity={1}
        />
      </mesh>
    </group>
  );
}
