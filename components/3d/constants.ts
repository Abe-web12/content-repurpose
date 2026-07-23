export const CAMERA = {
  POSITION: [0, 0, 5.5] as const,
  FOV: 45,
  NEAR: 0.1,
  FAR: 100,
  IDLE_AMPLITUDE_X: 0.15,
  IDLE_AMPLITUDE_Y: 0.08,
  IDLE_FREQUENCY_X: 0.12,
  IDLE_FREQUENCY_Y: 0.08,
  SCROLL_TILT_AMPLITUDE: 0.12,
  SCROLL_DOLLY_STRENGTH: 0.5,
  MOUSE_PARALLAX_STRENGTH: 0.03,
  LERP_POSITION: 0.03,
  LERP_TARGET: 0.025,
  FOV_BREATHE_AMPLITUDE: 0.3,
  FOV_BREATHE_SPEED: 0.15,
} as const;

export const TORUS_KNOT = {
  RADIUS: 0.5,
  TUBE: 0.18,
  RADIAL_SEGMENTS: 100,
  TUBULAR_SEGMENTS: 20,
  BASE_EMISSIVE_INTENSITY: 0.4,
  HOVER_EMISSIVE_INTENSITY: 1.2,
  BASE_SCALE: 1,
  MIN_SCALE: 0.15,
  HOVER_SCALE: 1.3,
  BREATHE_AMPLITUDE: 0.03,
  LERP_SPEED: 0.08,
  COLOR_LERP_SPEED: 0.04,
  EMISSIVE_LERP_SPEED: 0.08,
  FLOAT_AMPLITUDE_Y: 0.08,
  FLOAT_SPEED_Y: 0.6,
  FLOAT_AMPLITUDE_X: 0.04,
  FLOAT_SPEED_X: 0.4,
  FLOAT_ROTATION_Z: 0.02,
  FLOAT_ROTATION_SPEED: 0.3,
  CLEARCOAT: 0.4,
  CLEARCOAT_ROUGHNESS: 0.2,
  METALNESS: 0.9,
  ROUGHNESS: 0.1,
  ENV_MAP_INTENSITY: 1.2,
} as const;

export const MATERIALS = {
  CLEARCOAT: 0.3,
  CLEARCOAT_ROUGHNESS: 0.25,
  ENV_MAP_INTENSITY: 1.0,
  STANDARD_ROUGHNESS: 0.25,
  STANDARD_METALNESS: 0.6,
} as const;

export const FRAGMENTS = {
  LINKEDIN: { count: 8, radius: 0.7, color: "#818cf8", type: "flat" as const },
  TWITTER: { count: 10, radius: 1.0, color: "#22d3ee", type: "box" as const },
  CAROUSEL: { count: 8, radius: 1.3, color: "#e879f9", type: "tube" as const },
  TABLET_MULTIPLIER: 0.6,
  EMERGE_START_BASE: 0.08,
  EMERGE_DELAY_PER_INDEX: 0.06,
  EMERGE_DURATION: 0.4,
  ORBIT_SPEED_BASE: 0.3,
  ORBIT_SPEED_VARIANCE: 0.15,
  RADIUS_SCROLL_GROWTH: 1.8,
  HOVER_SCALE: 2.0,
  BASE_SCALE: 0.12,
  Y_DRIFT_AMPLITUDE: 0.4,
  Y_DRIFT_SPEED: 0.7,
  Z_DRIFT_AMPLITUDE: 0.3,
  Z_DRIFT_SPEED: 0.5,
} as const;

export const SATELLITES = {
  MICROPHONE: { orbitRadius: 2.2, speed: 0.3, position: [-2.2, 0.8, -1] as [number, number, number] },
  DOCUMENT: { orbitRadius: 1.8, speed: 0.25, position: [1.8, -0.3, -1.5] as [number, number, number] },
  SPEECH: { orbitRadius: 2.0, speed: 0.2, position: [2.0, 1.2, -2.5] as [number, number, number] },
  FADE_OUT_PROGRESS: 0.7,
  POINTER_INFLUENCE: 0.15,
  Y_BOB_AMPLITUDE: 0.25,
  Y_BOB_SPEED: 0.4,
} as const;

export const PARTICLES = {
  BACKGROUND_COUNT: 400,
  HERO_COUNT: 300,
  BACKGROUND_SIZE: 0.08,
  HERO_SIZE: 0.06,
  OPACITY: 0.6,
  SPREAD: { x: 30, y: 30, z: 20 },
  DRIFT_SPEED: 0.05,
  DRIFT_AMPLITUDE: 0.3,
  SCROLL_RESPONSE: 0.15,
} as const;

export const SPARKLES = {
  DESKTOP_COUNT: 80,
  TABLET_COUNT: 30,
  SCALE: 10,
  SIZE: 0.03,
  SPEED: 0.4,
  COLOR: "#a5b4fc",
  OPACITY: 0.6,
} as const;

export const SHADOWS = {
  DESKTOP_OPACITY: 0.4,
  TABLET_OPACITY: 0.25,
  SCALE: 10,
  BLUR: 4,
  FAR: 4,
} as const;

export const LIGHTS = {
  AMBIENT_INTENSITY: 0.12,
  HEMISPHERE_SKY: "#1a1040",
  HEMISPHERE_GROUND: "#050510",
  HEMISPHERE_INTENSITY: 0.4,
  DIRECTIONAL_INTENSITY: 0.35,
  DIRECTIONAL_COLOR: "#e0e7ff",
  DIRECTIONAL_POSITION: [5, 5, 5] as [number, number, number],
  POINT1: { position: [-3, 2, 2] as [number, number, number], intensity: 0.6, color: "#7c3aed" },
  POINT2: { position: [3, -1, 3] as [number, number, number], intensity: 0.4, color: "#6366f1" },
  POINT3: { position: [0, -3, 1] as [number, number, number], intensity: 0.3, color: "#06b6d4" },
  RIM_BACK_LEFT: { position: [-4, 2, -4] as [number, number, number], intensity: 0.5, color: "#818cf8" },
  RIM_BACK_RIGHT: { position: [4, 1, -4] as [number, number, number], intensity: 0.4, color: "#c084fc" },
  SCROLL_LIGHT_SHIFT: 0.3,
} as const;

export const ENVIRONMENT = {
  MAP_SIZE: 2048,
  STAR_COUNT: 500,
  NEBULA_COUNT: 30,
  STAR_MAX_RADIUS: 2.5,
  NEBULA_MAX_RADIUS: 40,
  STAR_ALPHA_MAX: 0.8,
  NEBULA_ALPHA_MAX: 0.12,
  INTENSITY: 0.8,
  BG_COLOR: 0x070714,
} as const;

export const FLOAT = {
  CORE_SPEED: 1.2,
  CORE_ROTATION_INTENSITY: 0.15,
  CORE_FLOAT_INTENSITY: 0.4,
  HERO_SPEED: 1.8,
  HERO_ROTATION_INTENSITY: 0.3,
  HERO_FLOAT_INTENSITY: 0.6,
  HERO2_SPEED: 1.5,
  HERO2_ROTATION_INTENSITY: 0.4,
  HERO2_FLOAT_INTENSITY: 0.8,
  HERO3_SPEED: 2.0,
  HERO3_ROTATION_INTENSITY: 0.2,
  HERO3_FLOAT_INTENSITY: 0.7,
} as const;

export const PERFORMANCE = {
  DESKTOP_DPR: [1, 1.5] as [number, number],
  TABLET_DPR: [1, 1.2] as [number, number],
  DESKTOP_BREAKPOINT: 1024,
  TABLET_BREAKPOINT: 768,
  LOW_END_PARTICLE_MULTIPLIER: 0.5,
} as const;

export const SCROLL = {
  SECTION_TRIGGER_START: "top 75%",
  SECTION_TRIGGER_END: "bottom 25%",
  COLOR_TRANSITION_DURATION: 0.8,
  COLOR_EASE: "power2.out",
} as const;

export const EFFECTS = {
  TONE_MAPPING_EXPOSURE: 1.2,
} as const;

export const ATMOSPHERE = {
  BASE_FOG_DENSITY: 0.035,
  BASE_FOG_COLOR: "#070714",
  SECTION_FOG_DENSITY: 0.025,
  TRANSITION_DURATION: 0.8,
} as const;

export const COLOR_CONFIGS = [
  { id: "hero", accent: "#818cf8", bg: "10,10,30", emissive: "#4f46e5", fogColor: "#070714", rimColor: "#818cf8" },
  { id: "social-proof", accent: "#c084fc", bg: "15,8,26", emissive: "#7c3aed", fogColor: "#0a0614", rimColor: "#c084fc" },
  { id: "how-it-works", accent: "#22d3ee", bg: "8,15,26", emissive: "#0891b2", fogColor: "#060d14", rimColor: "#22d3ee" },
  { id: "features", accent: "#818cf8", bg: "10,10,26", emissive: "#4f46e5", fogColor: "#070714", rimColor: "#818cf8" },
  { id: "pricing", accent: "#e879f9", bg: "15,10,26", emissive: "#a21caf", fogColor: "#0c0614", rimColor: "#e879f9" },
  { id: "faq", accent: "#f472b6", bg: "10,8,20", emissive: "#db2777", fogColor: "#08040e", rimColor: "#f472b6" },
  { id: "cta", accent: "#6366f1", bg: "8,8,22", emissive: "#4338ca", fogColor: "#05050e", rimColor: "#6366f1" },
] as const;
