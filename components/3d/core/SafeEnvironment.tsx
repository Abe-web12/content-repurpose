"use client";
import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { ENVIRONMENT } from "../constants";

export function SafeEnvironment() {
  const { scene, gl } = useThree();
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    try {
      const pmremGenerator = new THREE.PMREMGenerator(gl);
      pmremGenerator.compileEquirectangularShader();

      const size = ENVIRONMENT.MAP_SIZE;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size / 2;
      const ctx = canvas.getContext("2d")!;

      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, "#020208");
      gradient.addColorStop(0.15, "#060620");
      gradient.addColorStop(0.3, "#0a0a30");
      gradient.addColorStop(0.45, "#150e40");
      gradient.addColorStop(0.5, "#1a1045");
      gradient.addColorStop(0.55, "#150e40");
      gradient.addColorStop(0.7, "#0a0a30");
      gradient.addColorStop(0.85, "#060620");
      gradient.addColorStop(1, "#020208");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < ENVIRONMENT.STAR_COUNT; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height * 0.7;
        const r = Math.random() * ENVIRONMENT.STAR_MAX_RADIUS + 0.3;
        const alpha = Math.random() * ENVIRONMENT.STAR_ALPHA_MAX + 0.1;

        const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
        glow.addColorStop(0, `rgba(220, 220, 255, ${alpha})`);
        glow.addColorStop(0.3, `rgba(180, 180, 255, ${alpha * 0.5})`);
        glow.addColorStop(1, `rgba(100, 100, 200, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, r * 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 1.5})`;
        ctx.beginPath();
        ctx.arc(x, y, r * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }

      const nebulaColors = [
        { r: 100, g: 80, b: 200 },
        { r: 150, g: 60, b: 180 },
        { r: 80, g: 120, b: 220 },
        { r: 60, g: 40, b: 140 },
      ];

      for (let i = 0; i < ENVIRONMENT.NEBULA_COUNT; i++) {
        const x = Math.random() * canvas.width;
        const y = canvas.height * 0.3 + Math.random() * canvas.height * 0.4;
        const r = Math.random() * ENVIRONMENT.NEBULA_MAX_RADIUS + 15;
        const nc = nebulaColors[i % nebulaColors.length];

        const nebula = ctx.createRadialGradient(x, y, 0, x, y, r);
        nebula.addColorStop(0, `rgba(${nc.r}, ${nc.g}, ${nc.b}, ${ENVIRONMENT.NEBULA_ALPHA_MAX})`);
        nebula.addColorStop(0.5, `rgba(${nc.r}, ${nc.g}, ${nc.b}, ${ENVIRONMENT.NEBULA_ALPHA_MAX * 0.4})`);
        nebula.addColorStop(1, `rgba(${nc.r}, ${nc.g}, ${nc.b}, 0)`);
        ctx.fillStyle = nebula;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.mapping = THREE.EquirectangularReflectionMapping;

      const envMap = pmremGenerator.fromEquirectangular(texture);

      if (mounted.current) {
        scene.environment = envMap.texture;
        scene.environmentIntensity = ENVIRONMENT.INTENSITY;
        scene.background = new THREE.Color(ENVIRONMENT.BG_COLOR);
      }

      texture.dispose();
      pmremGenerator.dispose();
    } catch (err) {
      console.warn("[SafeEnvironment]", err);
    }

    return () => {
      mounted.current = false;
      scene.environment = null;
      scene.background = null;
    };
  }, [scene, gl]);

  return null;
}
