import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CAMERA, COLOR_CONFIGS } from "../constants";

interface CameraRigProps {
  progressRef?: { current: number };
  prefersReducedMotion?: boolean;
}

export function CameraRig({ progressRef, prefersReducedMotion = false }: CameraRigProps) {
  const { camera } = useThree();
  const origin = useRef(new THREE.Vector3(...CAMERA.POSITION));
  const idleAngle = useRef(0);
  const lookTarget = useRef(new THREE.Vector3(0, 0, 0));
  const baseFov = useRef(CAMERA.FOV);

  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = CAMERA.FOV;
      camera.near = CAMERA.NEAR;
      camera.far = CAMERA.FAR;
      camera.position.copy(origin.current);
      baseFov.current = CAMERA.FOV;
      camera.lookAt(0, 0, 0);
    }
  }, [camera]);

  useFrame(({ clock, pointer }, delta) => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const t = clock.getElapsedTime();
    const p = progressRef?.current ?? 0;

    idleAngle.current += delta * CAMERA.IDLE_FREQUENCY_X;

    const scrollTiltX = Math.sin(p * Math.PI * 2) * CAMERA.SCROLL_TILT_AMPLITUDE;
    const scrollTiltY = Math.cos(p * Math.PI) * CAMERA.SCROLL_TILT_AMPLITUDE * 0.3;

    const idleX = Math.sin(idleAngle.current) * CAMERA.IDLE_AMPLITUDE_X;
    const idleY = Math.cos(idleAngle.current * 0.6) * CAMERA.IDLE_AMPLITUDE_Y;

    const mouseX = pointer.x * CAMERA.MOUSE_PARALLAX_STRENGTH;
    const mouseY = pointer.y * CAMERA.MOUSE_PARALLAX_STRENGTH * 0.4;

    const idleMotion = prefersReducedMotion ? 0 : 1;

    const targetX = origin.current.x + (idleX + scrollTiltX + mouseX) * idleMotion;
    const targetY = origin.current.y + (idleY + scrollTiltY + mouseY) * idleMotion;
    const targetZ = origin.current.z - p * CAMERA.SCROLL_DOLLY_STRENGTH;

    camera.position.x += (targetX - camera.position.x) * CAMERA.LERP_POSITION;
    camera.position.y += (targetY - camera.position.y) * CAMERA.LERP_POSITION;
    camera.position.z += (targetZ - camera.position.z) * CAMERA.LERP_POSITION * 0.5;

    const sectionIndex = Math.min(Math.floor(p * COLOR_CONFIGS.length), COLOR_CONFIGS.length - 1);
    const config = COLOR_CONFIGS[sectionIndex];
    const color = new THREE.Color(config.accent);

    const lookY = 0.2 - p * 0.4 + pointer.y * 0.05 * idleMotion;
    const lookX = pointer.x * 0.05 * idleMotion;
    lookTarget.current.lerp(new THREE.Vector3(lookX, lookY, 0), CAMERA.LERP_TARGET);
    camera.lookAt(lookTarget.current);

    const fovBreathe = Math.sin(t * CAMERA.FOV_BREATHE_SPEED) * CAMERA.FOV_BREATHE_AMPLITUDE * idleMotion;
    const fovTarget = baseFov.current + fovBreathe - p * 0.5;
    camera.fov += (fovTarget - camera.fov) * 0.02;
    camera.updateProjectionMatrix();
  });

  return null;
}
