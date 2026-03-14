// CompareX Design System - production-grade mobile tokens

export const COLORS = {
  primary: "#0F172A",
  primaryLight: "#1E293B",
  accent: "#06B6D4",
  accentStrong: "#0891B2",
  accentMuted: "rgba(6, 182, 212, 0.16)",

  savings: "#22C55E",
  savingsLight: "rgba(34, 197, 94, 0.16)",
  warning: "#F59E0B",
  warningLight: "rgba(245, 158, 11, 0.16)",
  error: "#EF4444",
  errorLight: "rgba(239, 68, 68, 0.14)",

  background: "#020617",
  surface: "#0B1220",
  card: "#111B2E",
  cardAlt: "#142238",
  border: "#233450",
  borderLight: "#355070",
  divider: "#1B2A42",

  textPrimary: "#F8FAFC",
  textSecondary: "#CBD5E1",
  textTertiary: "#94A3B8",
  textInverse: "#020617",
  textAccent: "#67E8F9",

  gradientHero: ["#0B1220", "#0E7490"],
  gradientCard: ["#142238", "#0F172A"],
  gradientAccent: ["#06B6D4", "#0EA5E9"],
  gradientSavings: ["#22C55E", "#16A34A"],
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
};

export const RADIUS = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  full: 999,
};

export const SHADOWS = {
  none: {},
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 3,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: 9,
  },
  glow: {
    shadowColor: "#06B6D4",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },
};

export const FONTS = {
  h1: {
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.textPrimary,
    letterSpacing: -0.9,
  },
  h2: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.textPrimary,
    letterSpacing: -0.4,
  },
  h3: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 15,
    fontWeight: "400",
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  caption: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.textTertiary,
    lineHeight: 18,
  },
  captionBold: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textSecondary,
    letterSpacing: 0.2,
  },
  price: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.textPrimary,
    letterSpacing: -0.4,
  },
  priceSmall: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  badge: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },
};
