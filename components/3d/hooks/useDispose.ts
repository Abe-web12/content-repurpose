import { useEffect, useRef } from "react";
import * as THREE from "three";

export function useDispose() {
  const disposables = useRef<THREE.Object3D[]>([]);

  useEffect(() => {
    return () => {
      disposables.current.forEach((obj) => {
        obj.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
      });
      disposables.current = [];
    };
  }, []);

  return (obj: THREE.Object3D) => {
    disposables.current.push(obj);
  };
}

export function useGeometryDisposal() {
  const geometries = useRef<THREE.BufferGeometry[]>([]);

  useEffect(() => {
    return () => {
      geometries.current.forEach((g) => g.dispose());
      geometries.current = [];
    };
  }, []);

  return (geo: THREE.BufferGeometry) => {
    geometries.current.push(geo);
  };
}
