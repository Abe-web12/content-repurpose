import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { FRAGMENTS, MATERIALS } from "../constants";
import type { ProgressRef } from "../types";

interface FormatFragmentData {
  index: number;
  total: number;
  baseRadius: number;
  color: string;
  geometry: THREE.BufferGeometry;
  emergeStart: number;
  angleOffset: number;
  phaseOffset: number;
}

interface FormatFragmentsProps {
  progressRef: ProgressRef;
  multiplier?: number;
}

function createFragmentGeometry(type: string): THREE.BufferGeometry {
  switch (type) {
    case "box":
      return new THREE.BoxGeometry(0.08, 0.08, 0.08);
    case "flat":
      return new THREE.BoxGeometry(0.2, 0.03, 0.1);
    case "tube":
      return new THREE.TorusGeometry(0.06, 0.025, 8, 12);
    default:
      return new THREE.BoxGeometry(0.08, 0.08, 0.08);
  }
}

export function FormatFragments({ progressRef, multiplier = 1 }: FormatFragmentsProps) {
  const groupRef = useRef<THREE.Group>(null);
  const hoverStates = useRef<Map<number, { scale: number; emissive: number }>>(new Map());

  const fragmentTypes = useMemo(
    () => [
      { ...FRAGMENTS.LINKEDIN, count: Math.floor(FRAGMENTS.LINKEDIN.count * multiplier) },
      { ...FRAGMENTS.TWITTER, count: Math.floor(FRAGMENTS.TWITTER.count * multiplier) },
      { ...FRAGMENTS.CAROUSEL, count: Math.floor(FRAGMENTS.CAROUSEL.count * multiplier) },
    ],
    [multiplier],
  );

  const fragments: FormatFragmentData[] = useMemo(() => {
    const result: FormatFragmentData[] = [];
    fragmentTypes.forEach((type) => {
      const geo = createFragmentGeometry(type.type);
      for (let i = 0; i < type.count; i++) {
        result.push({
          index: i,
          total: type.count,
          baseRadius: type.radius,
          color: type.color,
          geometry: geo,
          emergeStart: FRAGMENTS.EMERGE_START_BASE + (i / type.count) * FRAGMENTS.EMERGE_DELAY_PER_INDEX,
          angleOffset: (i / type.count) * Math.PI * 2,
          phaseOffset: Math.random() * Math.PI * 2,
        });
      }
    });
    return result;
  }, [fragmentTypes]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const p = progressRef.current;
    const t = clock.getElapsedTime();
    const children = groupRef.current.children;

    fragments.forEach((frag, i) => {
      const mesh = children[i] as THREE.Mesh | undefined;
      if (!mesh) return;

      const emergeFactor = Math.max(0, Math.min(1, (p - frag.emergeStart) / FRAGMENTS.EMERGE_DURATION));
      mesh.visible = emergeFactor > 0;

      if (!mesh.visible) return;

      const speed = FRAGMENTS.ORBIT_SPEED_BASE + (frag.index % 3) * FRAGMENTS.ORBIT_SPEED_VARIANCE;
      const angle = t * speed + frag.angleOffset + p * 0.5;
      const radius = frag.baseRadius + p * FRAGMENTS.RADIUS_SCROLL_GROWTH;

      mesh.position.x = Math.cos(angle) * radius;
      mesh.position.z = Math.sin(angle) * radius * 0.7;
      mesh.position.y =
        Math.sin(t * FRAGMENTS.Y_DRIFT_SPEED + frag.phaseOffset) * FRAGMENTS.Y_DRIFT_AMPLITUDE +
        Math.sin(t * FRAGMENTS.Z_DRIFT_SPEED + frag.phaseOffset * 0.5) * FRAGMENTS.Y_DRIFT_AMPLITUDE * 0.3 +
        p * 0.3;

      const hover = hoverStates.current.get(i);
      const hoverScale = hover ? hover.scale * 1.5 : 0;
      mesh.scale.setScalar(emergeFactor * FRAGMENTS.BASE_SCALE + hoverScale);

      mesh.rotation.x = t * speed + frag.phaseOffset;
      mesh.rotation.y = t * speed * 0.6 + frag.phaseOffset * 0.5;

      const mat = mesh.material as THREE.MeshPhysicalMaterial;
      const targetEmissive = hover
        ? hover.emissive
        : 0.1 + emergeFactor * 0.3 + Math.sin(t + frag.phaseOffset) * 0.05;
      mat.emissiveIntensity += (targetEmissive - mat.emissiveIntensity) * 0.08;
    });
  });

  return (
    <group ref={groupRef}>
      {fragments.map((frag, i) => (
        <mesh
          key={i}
          geometry={frag.geometry}
          visible={false}
          onPointerOver={() => {
            hoverStates.current.set(i, { scale: FRAGMENTS.HOVER_SCALE, emissive: 1.2 });
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            hoverStates.current.delete(i);
            document.body.style.cursor = "default";
          }}
        >
          <meshPhysicalMaterial
            color={frag.color}
            emissive={frag.color}
            emissiveIntensity={0.1}
            roughness={MATERIALS.STANDARD_ROUGHNESS}
            metalness={MATERIALS.STANDARD_METALNESS}
            clearcoat={MATERIALS.CLEARCOAT}
            clearcoatRoughness={MATERIALS.CLEARCOAT_ROUGHNESS}
            envMapIntensity={MATERIALS.ENV_MAP_INTENSITY}
          />
        </mesh>
      ))}
    </group>
  );
}
