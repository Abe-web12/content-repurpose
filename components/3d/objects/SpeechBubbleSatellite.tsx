import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SATELLITES, MATERIALS } from "../constants";
import type { ProgressRef } from "../types";

interface SpeechBubbleSatelliteProps {
  progressRef: ProgressRef;
}

export function SpeechBubbleSatellite({ progressRef }: SpeechBubbleSatelliteProps) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock, pointer }) => {
    if (!ref.current) return;
    const p = progressRef.current;
    const t = clock.getElapsedTime();

    const appear = Math.max(0, Math.min(1, (p - 0.25) / 0.15));
    ref.current.visible = appear > 0.01;

    if (appear <= 0.01) return;

    const angle = t * SATELLITES.SPEECH.speed + 3.0 + p * 0.4;
    const radius = SATELLITES.SPEECH.orbitRadius + p * 0.6;
    ref.current.position.x = Math.cos(angle) * radius + pointer.x * 0.1;
    ref.current.position.z = Math.sin(angle) * radius * 0.5;
    ref.current.position.y = 1.2 + Math.sin(t * SATELLITES.Y_BOB_SPEED + 2) * SATELLITES.Y_BOB_AMPLITUDE + p * 0.4;
    ref.current.scale.setScalar(0.6 + appear * 0.4);
    ref.current.rotation.y = t * 0.15;
    ref.current.rotation.x = Math.sin(t * 0.1) * 0.02;
  });

  return (
    <mesh ref={ref} position={SATELLITES.SPEECH.position}>
      <sphereGeometry args={[0.45, 16, 16]} />
      <meshPhysicalMaterial
        color="#f0abfc"
        roughness={0.1}
        metalness={0.7}
        clearcoat={MATERIALS.CLEARCOAT}
        clearcoatRoughness={MATERIALS.CLEARCOAT_ROUGHNESS}
        envMapIntensity={MATERIALS.ENV_MAP_INTENSITY * 1.2}
        transparent
        opacity={0.8}
      />
    </mesh>
  );
}
