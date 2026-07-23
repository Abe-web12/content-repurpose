
export const ROUTES = {
  // Marketing
  HOME: "/",
  PRICING: "/pricing",
  BLOG: "/blog",
  CHANGELOG: "/changelog",
  PRIVACY: "/legal/privacy",
  TERMS: "/legal/terms",

  // Auth
  LOGIN: "/login",
  SIGNUP: "/signup",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
  AUTH_CALLBACK: "/callback",

  // App
  DASHBOARD: "/dashboard",
  GENERATE: "/generate",
  HISTORY: "/history",
  VOICE: "/voice",
  SETTINGS: "/settings",
  UPGRADE: "/upgrade",
} as const;

export const PUBLIC_ROUTES = [
  ROUTES.HOME,
  ROUTES.PRICING,
  ROUTES.BLOG,
  ROUTES.CHANGELOG,
  ROUTES.PRIVACY,
  ROUTES.TERMS,
  ROUTES.LOGIN,
  ROUTES.SIGNUP,
  ROUTES.FORGOT_PASSWORD,
  ROUTES.RESET_PASSWORD,
  ROUTES.AUTH_CALLBACK,
];

export const AUTH_ROUTES = [
  ROUTES.LOGIN,
  ROUTES.SIGNUP,
  ROUTES.FORGOT_PASSWORD,
  ROUTES.RESET_PASSWORD,
];

export const PROTECTED_ROUTES = [
  ROUTES.DASHBOARD,
  ROUTES.GENERATE,
  ROUTES.HISTORY,
  ROUTES.VOICE,
  ROUTES.SETTINGS,
  ROUTES.UPGRADE,
];

export const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: ROUTES.DASHBOARD,
    icon: "LayoutDashboard",
  },
  {
    label: "Generate",
    href: ROUTES.GENERATE,
    icon: "Sparkles",
  },
  {
    label: "History",
    href: ROUTES.HISTORY,
    icon: "Clock",
  },
  {
    label: "Voice Profiles",
    href: ROUTES.VOICE,
    icon: "Mic",
  },
  {
    label: "Settings",
    href: ROUTES.SETTINGS,
    icon: "Settings",
  },
] as const;