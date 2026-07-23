import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SATELLITES, MATERIALS } from "../constants";
import type { ProgressRef } from "../types";

interface DocumentStackSatelliteProps {
  progressRef: ProgressRef;
}

export function DocumentStackSatellite({ progressRef }: DocumentStackSatelliteProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock, pointer }) => {
    if (!groupRef.current) return;
    const p = progressRef.current;
    const t = clock.getElapsedTime();

    const appear = Math.max(0, Math.min(1, (p - 0.12) / 0.15));
    const fadeOut = Math.max(0, 1 - Math.max(0, (p - SATELLITES.FADE_OUT_PROGRESS) / 0.15));
    const visibility = Math.min(appear, fadeOut);
    groupRef.current.visible = visibility > 0.01;

    if (visibility <= 0.01) return;

    const angle = t * SATELLITES.DOCUMENT.speed + 1.5 + p * 0.3;
    const radius = SATELLITES.DOCUMENT.orbitRadius + p * 0.8;
    groupRef.current.position.x = Math.cos(angle) * radius + pointer.x * 0.1;
    groupRef.current.position.z = Math.sin(angle) * radius * 0.6;
    groupRef.current.position.y = -0.3 + Math.sin(t * SATELLITES.Y_BOB_SPEED + 1) * SATELLITES.Y_BOB_AMPLITUDE + p * 0.5;
    groupRef.current.rotation.y = t * 0.2 + p * 0.5;
    groupRef.current.rotation.x = Math.sin(t * 0.1) * 0.02;
    groupRef.current.scale.setScalar(0.7 + visibility * 0.3);
  });

  const docColors = ["#c7d2fe", "#818cf8", "#6366f1"];

  return (
    <group ref={groupRef} position={SATELLITES.DOCUMENT.position}>
      {[0, 0.15, 0.3].map((offset, i) => (
        <mesh key={i} position={[i * 0.04, offset, -i * 0.04]} rotation={[0, 0.08 * i, 0]}>
          <boxGeometry args={[0.9, 0.04, 1.2]} />
          <meshPhysicalMaterial
            color={docColors[i]}
            roughness={0.35}
            metalness={0.4}
            clearcoat={0.2}
            clearcoatRoughness={0.3}
            envMapIntensity={MATERIALS.ENV_MAP_INTENSITY}
          />
        </mesh>
      ))}
    </group>
  );
}
