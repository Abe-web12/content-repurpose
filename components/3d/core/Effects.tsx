import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { EFFECTS } from "../constants";

export function Effects() {
  const { gl } = useThree();

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = EFFECTS.TONE_MAPPING_EXPOSURE;
    gl.outputColorSpace = "srgb";
  }, [gl]);

  return null;
}
