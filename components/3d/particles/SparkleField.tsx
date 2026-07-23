import { Sparkles } from "@react-three/drei";
import { SPARKLES } from "../constants";

interface SparkleFieldProps {
  count: number;
  prefersReducedMotion?: boolean;
}

export function SparkleField({ count, prefersReducedMotion = false }: SparkleFieldProps) {
  if (prefersReducedMotion || count === 0) return null;

  return (
    <Sparkles
      count={count}
      scale={SPARKLES.SCALE}
      size={SPARKLES.SIZE}
      speed={SPARKLES.SPEED}
      color={SPARKLES.COLOR}
      opacity={SPARKLES.OPACITY}
    />
  );
}
