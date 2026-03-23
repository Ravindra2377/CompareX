// ─────────────────────────────────────────────────────────────────────────────
// CompareZ — Aurora Design System v2
// Modern vibrant palette · clean surfaces · scalable tokens
// ─────────────────────────────────────────────────────────────────────────────

const COLORS = {
  // ── Core backgrounds ──────────────────────────────────────────────
  primary:        "#5B5AE6",        // brand purple
  primaryLight:   "#7A6CF6",        // brand purple light
  brandPurple:    "#5B5AE6",
  brandPurpleLight: "#7A6CF6",
  background:     "#F8FAFC",        // slate-50 — cool off-white
  backgroundDark: "#0F172A",        // slate-900 — rich dark
  surface:        "#FFFFFF",
  surfaceDark:    "#1E293B",        // slate-800
  card:           "#FFFFFF",
  cardAlt:        "#F1F5F9",        // slate-100
  cardDark:       "#1E293B",
  border:         "#E2E8F0",        // slate-200
  borderDark:     "#334155",        // slate-700
  borderLight:    "#F1F5F9",        // slate-100
  divider:        "#E2E8F0",

  // ── Glassmorphism ─────────────────────────────────────────────────
  glassSurface:     "rgba(255, 255, 255, 0.80)",
  glassSurfaceDark: "rgba(15, 23, 42, 0.85)",
  glassBorder:      "rgba(148, 163, 184, 0.15)",
  glassBorderDark:  "rgba(255, 255, 255, 0.10)",
  glassHighlight:   "rgba(255, 255, 255, 0.60)",

  // ── Accent ────────────────────────────────────────────────────────
  accent:       "#4F46E5",          // indigo primary CTA
  accentGold:   "#4F46E5",         // mapped to primary for compat
  accentLight:  "rgba(79, 70, 229, 0.10)",
  accentStrong: "#3730A3",
  accentMuted:  "rgba(79, 70, 229, 0.06)",
  secondary:    "#0EA5E9",          // sky-500
  secondaryLight: "rgba(14, 165, 233, 0.10)",
  violet:       "#7C3AED",          // violet-600
  violetLight:  "rgba(124, 58, 237, 0.10)",

  // ── Semantic ──────────────────────────────────────────────────────
  savings:      "#10B981",          // emerald-500
  savingsLight: "rgba(16, 185, 129, 0.08)",
  savingsDark:  "#059669",
  warning:      "#F59E0B",          // amber-500
  warningLight: "rgba(245, 158, 11, 0.08)",
  error:        "#EF4444",          // red-500
  errorLight:   "rgba(239, 68, 68, 0.08)",
  info:         "#3B82F6",          // blue-500
  infoLight:    "rgba(59, 130, 246, 0.08)",

  // ── Platform accent colors ────────────────────────────────────────
  platformBlinkit:   "#EAB308",     // yellow-500
  platformZepto:     "#8B5CF6",     // violet-500
  platformBigBasket: "#22C55E",     // green-500
  platformAmazon:    "#F97316",     // orange-500
  platformFlipkart:  "#3B82F6",     // blue-500

  // ── Text ──────────────────────────────────────────────────────────
  textPrimary:   "#0F172A",         // slate-900
  textSecondary: "#64748B",         // slate-500
  textTertiary:  "#94A3B8",         // slate-400
  textOnDark:    "#FFFFFF",
  textOnDarkSec: "rgba(255,255,255,0.70)",
  textOnDarkTer: "rgba(255,255,255,0.45)",
  textInverse:   "#FFFFFF",
  textAccent:    "#4F46E5",

  // ── Gradients ─────────────────────────────────────────────────────
  gradientHero:     ["#312E81", "#4F46E5", "#6366F1"],       // indigo depth
  gradientCard:     ["#FFFFFF", "#F8FAFC"],
  gradientCardDark: ["rgba(30,41,59,0.98)", "rgba(15,23,42,0.98)"],
  gradientAccent:   ["#4F46E5", "#7C3AED"],                  // indigo → violet
  gradientSavings:  ["#10B981", "#059669"],
  gradientGlass:    ["rgba(255,255,255,0.95)", "rgba(248,250,252,0.90)"],
  gradientGold:     ["#4F46E5", "#6366F1"],
  gradientWarm:     ["#F97316", "#EAB308"],                   // orange → yellow
  gradientCool:     ["#0EA5E9", "#6366F1"],                   // sky → indigo
};

const SPACING = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
  xxxl: 32,
  huge: 48,
};

const RADIUS = {
  xs:  6,
  sm:  10,
  md:  14,
  lg:  18,
  xl:  24,
  xxl: 32,
  full: 999,
};

const SHADOWS = {
  none: {},
  sm: {
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  lg: {
    shadowColor: "#5B5AE6",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 10,
  },
  navbar: {
    shadowColor: "#5B5AE6",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 8,
  },
  glow: {
    shadowColor: "#5B5AE6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  glowSoft: {
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  dark: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  colored: (color) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.20,
    shadowRadius: 12,
    elevation: 6,
  }),
};

const FONTS = {
  h1: {
    fontSize: 32,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.8,
  },
  h1Dark: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.8,
  },
  h2: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.4,
  },
  h2Dark: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.4,
  },
  h3: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  h3Dark: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 15,
    fontWeight: "400",
    color: "#64748B",
    lineHeight: 22,
  },
  bodyDark: {
    fontSize: 15,
    fontWeight: "400",
    color: "rgba(255,255,255,0.70)",
    lineHeight: 22,
  },
  bodyBold: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
    lineHeight: 22,
  },
  bodyBoldDark: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
    lineHeight: 22,
  },
  caption: {
    fontSize: 13,
    fontWeight: "400",
    color: "#94A3B8",
    lineHeight: 18,
  },
  captionDark: {
    fontSize: 13,
    fontWeight: "400",
    color: "rgba(255,255,255,0.45)",
    lineHeight: 18,
  },
  captionBold: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
    letterSpacing: 0.2,
  },
  captionBoldDark: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.70)",
    letterSpacing: 0.2,
  },
  price: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  priceDark: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  priceSmall: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A",
  },
  badge: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  luxury: {
    fontSize: 40,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -1,
  },
  luxurySub: {
    fontSize: 16,
    fontWeight: "400",
    color: "rgba(255,255,255,0.65)",
    letterSpacing: 0.2,
    lineHeight: 24,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "#6366F1",
  },
};

export { COLORS, SPACING, RADIUS, SHADOWS, FONTS };
