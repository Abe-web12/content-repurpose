import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { Lighting } from "../core/Lighting";
import { CameraRig } from "../core/CameraRig";
import { SafeEnvironment } from "../core/SafeEnvironment";
import { Effects } from "../core/Effects";
import { TorusKnotCore } from "../objects/TorusKnotCore";
import { FormatFragments } from "../objects/FormatFragments";
import { MicrophoneSatellite } from "../objects/MicrophoneSatellite";
import { DocumentStackSatellite } from "../objects/DocumentStackSatellite";
import { SpeechBubbleSatellite } from "../objects/SpeechBubbleSatellite";
import { SparkleField } from "../particles/SparkleField";
import { SHADOWS } from "../constants";
import type { ProgressRef } from "../types";

interface ScrollSceneCoreProps {
  progressRef: ProgressRef;
  performance: {
    isTablet: boolean;
    particleMultiplier: number;
    sparkleCount: number;
    shadowOpacity: number;
    prefersReducedMotion: boolean;
  };
}

function GLBModelInner({ progressRef }: { progressRef: ProgressRef }) {
  const { scene } = useGLTF("/model.glb");
  const groupRef = useRef<THREE.Group>(null);
  const targetScaleBoost = useRef(0);
  const targetEmissiveBoost = useRef(0);

  const clonedScene = useMemo(() => scene.clone(), [scene]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const p = progressRef.current;
    const t = clock.getElapsedTime();

    groupRef.current.rotation.y = t * 0.08 + p * 0.5;
    groupRef.current.rotation.x = p * 0.4 + Math.sin(t * 0.15) * 0.03;
    groupRef.current.position.y = Math.sin(t * 0.4) * 0.12 - p * 0.6;
    groupRef.current.position.x = p * 0.3;

    const baseScale = Math.max(0.6, 1 - p * 0.3);
    const hoverScale = targetScaleBoost.current * 0.2;
    groupRef.current.scale.setScalar(baseScale + hoverScale);

    groupRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mat = child.material as THREE.MeshStandardMaterial;
        if (mat.emissiveIntensity !== undefined) {
          const target = 0.1 + p * 0.3 + targetEmissiveBoost.current * 0.8;
          mat.emissiveIntensity += (target - mat.emissiveIntensity) * 0.06;
        }
      }
    });
  });

  return (
    <primitive
      ref={groupRef}
      object={clonedScene}
      onPointerOver={() => {
        targetScaleBoost.current = 1;
        targetEmissiveBoost.current = 1;
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        targetScaleBoost.current = 0;
        targetEmissiveBoost.current = 0;
        document.body.style.cursor = "default";
      }}
    />
  );
}

function ProceduralContent({ progressRef, performance }: ScrollSceneCoreProps) {
  return (
    <>
      <TorusKnotCore progressRef={progressRef} />
      <FormatFragments progressRef={progressRef} multiplier={performance.particleMultiplier} />
      <MicrophoneSatellite progressRef={progressRef} />
      <DocumentStackSatellite progressRef={progressRef} />
      <SpeechBubbleSatellite progressRef={progressRef} />
    </>
  );
}

export function ScrollScene({ progressRef, performance }: ScrollSceneCoreProps) {
  const [useGLB, setUseGLB] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/model.glb", { method: "HEAD" })
      .then((r) => {
        if (!cancelled) setUseGLB(r.ok);
      })
      .catch(() => {
        if (!cancelled) setUseGLB(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <Lighting progressRef={progressRef} prefersReducedMotion={performance.prefersReducedMotion} />
      <CameraRig progressRef={progressRef} prefersReducedMotion={performance.prefersReducedMotion} />
      <Effects />

      {useGLB ? (
        <Suspense fallback={null}>
          <GLBModelInner progressRef={progressRef} />
        </Suspense>
      ) : (
        <ProceduralContent progressRef={progressRef} performance={performance} />
      )}

      <SparkleField count={performance.sparkleCount} prefersReducedMotion={performance.prefersReducedMotion} />

      <ContactShadows
        position={[0, -1.8, 0]}
        opacity={performance.shadowOpacity}
        scale={SHADOWS.SCALE}
        blur={SHADOWS.BLUR}
        far={SHADOWS.FAR}
      />

      <SafeEnvironment />
    </>
  );
}
