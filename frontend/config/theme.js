// ─────────────────────────────────────────────────────────────────────────────
// CompareZ — Clear Commerce Design System
// Quiet neutral surfaces · grounded forest-green actions · clear savings
// ─────────────────────────────────────────────────────────────────────────────

export const lightColors = {
  // ── Core backgrounds ──────────────────────────────────────────────
  primary:        "#16845B",
  primaryLight:   "#4FAF86",
  brandPurple:    "#16845B",
  brandPurpleLight: "#4FAF86",
  background:     "#F7F8F7",
  backgroundDark: "#0F172A", // Fallback if used statically
  surface:        "#FFFFFF",
  surfaceDark:    "#1E293B",
  card:           "#FFFFFF",
  cardAlt:        "#F1F4F1",
  cardDark:       "#1E293B",
  border:         "#DFE6E1",
  borderDark:     "#334155",
  borderLight:    "#EBF0EC",
  divider:        "#DFE6E1",

  // ── Glassmorphism ─────────────────────────────────────────────────
  glassSurface:     "rgba(255, 255, 255, 0.45)",
  glassSurfaceDark: "rgba(15, 23, 42, 0.55)",
  glassBorder:      "rgba(255, 255, 255, 0.50)",
  glassBorderDark:  "rgba(255, 255, 255, 0.12)",
  glassHighlight:   "rgba(255, 255, 255, 0.30)",
  glassShadow:      "rgba(22, 132, 91, 0.08)",

  // ── Accent (Logo Derived) ─────────────────────────────────────────
  accent:       "#16845B",
  accentGold:   "#D97706",
  accentLight:  "rgba(22, 132, 91, 0.10)",
  accentStrong: "#116149",
  accentMuted:  "rgba(22, 132, 91, 0.06)",
  secondary:    "#059669",
  secondaryLight: "rgba(5, 150, 105, 0.10)",
  violet:       "#16845B",
  violetLight:  "rgba(22, 132, 91, 0.10)",

  // ── Semantic (Consistent across themes for safety) ────────────────
  savings:      "#059669",
  savingsLight: "rgba(5, 150, 105, 0.10)",
  savingsDark:  "#047857",
  warning:      "#F59E0B",
  warningLight: "rgba(245, 158, 11, 0.08)",
  error:        "#EF4444",
  errorLight:   "rgba(239, 68, 68, 0.08)",
  info:         "#3B82F6",
  infoLight:    "rgba(59, 130, 246, 0.08)",

  // ── Platform accent colors ────────────────────────────────────────
  platformBlinkit:   "#F8CB46",
  platformZepto:     "#5901C9",
  platformBigBasket: "#84C225",
  platformAmazon:    "#FF9900",
  platformFlipkart:  "#2874F0",

  // ── Text ──────────────────────────────────────────────────────────
  textPrimary:   "#18201C",
  textSecondary: "#66706A",
  textTertiary:  "#929B95",
  textOnDark:    "#FFFFFF",
  textOnDarkSec: "rgba(255,255,255,0.70)",
  textOnDarkTer: "rgba(255,255,255,0.45)",
  textInverse:   "#FFFFFF",
  textAccent:    "#16845B",

  // ── Gradients ─────────────────────────────────────────────────────
  gradientHero:     ["#0D4F3C", "#16845B", "#3A9D76"],
  gradientCard:     ["#FFFFFF", "#FAFCFA"],
  gradientCardDark: ["rgba(30,41,59,0.98)", "rgba(15,23,42,0.98)"],
  gradientAccent:   ["#116149", "#16845B"],
  gradientSavings:  ["#059669", "#047857"],
  gradientGlass:    ["rgba(255,255,255,0.95)", "rgba(248,250,252,0.90)"],
  gradientGold:     ["#F97316", "#FB923C"],
  gradientWarm:     ["#F97316", "#EC4899"],
  gradientCool:     ["#0EA5A8", "#16845B"],

  // ── CompareZ Redesign Tokens (Additive) ───────────────────────────
  paper:          "#F7F8F7",
  paperDim:       "#EDF2EE",
  headerSurface:  "#EAF5EF",
  ink:            "#18201C",
  inkSoft:        "#66706A",
  inkFaint:       "#929B95",
  line:           "#DFE6E1",
  lineStrong:     "#C9D5CD",
  aubergine:      "#16845B",
  aubergineDeep:  "#0D4F3C",
  aubergineSoft:  "#E3F3EA",
  coriander:      "#059669",
  corianderSoft:  "#E7F7F1",
  turmeric:       "#D97706",
  turmericSoft:   "#FFF4D9",
  tomato:         "#DC4C3E",
  tomatoSoft:     "#FDECEA",
};

export const darkColors = {
  ...lightColors,
  // ── Core backgrounds ──────────────────────────────────────────────
  primary:        "#65C99C",
  primaryLight:   "#8AD9B5",
  background:     "#0E1511",
  surface:        "#17201B",
  card:           "#17201B",
  cardAlt:        "#202B25",
  border:         "#304038",
  borderLight:    "#26342D",
  divider:        "#304038",

  // ── Text ──────────────────────────────────────────────────────────
  textPrimary:   "#F7F8FA",
  textSecondary: "#B4BDB7",
  textTertiary:  "#77827B",
  textInverse:   "#FFFFFF", // White text on primary buttons for better contrast

  // ── Gradients ─────────────────────────────────────────────────────
  gradientCard:     ["rgba(30,41,59,0.98)", "rgba(15,23,42,0.98)"],
  gradientGlass:    ["rgba(15,23,42,0.95)", "rgba(30,41,59,0.90)"],

  // ── CompareZ Redesign Tokens (Dark overrides) ─────────────────────
  paper:          "#0E1511",
  paperDim:       "#151E19",
  headerSurface:  "#17251E",
  ink:            "#F7F8FA",
  inkSoft:        "#B4BDB7",
  inkFaint:       "#77827B",
  line:           "#304038",
  lineStrong:     "#42564B",
  aubergine:      "#65C99C",
  aubergineDeep:  "#09110D",
  aubergineSoft:  "#203B2E",
};

// Fallback for static usage
export const COLORS = lightColors;

const SPACING = {
  xs:   4,
  sm:   8,
  md:   16,        // Normalized from 12
  lg:   16,
  xl:   24,        // Normalized from 20
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
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  md: {
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  lg: {
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.09,
    shadowRadius: 28,
    elevation: 7,
  },
  navbar: {
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 24,
    elevation: 6,
  },
  glow: {
    shadowColor: "#5B5AE6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  glowSoft: {
    shadowColor: "#16845B",
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
  cardSoft: {
    shadowColor: "#211C2B",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
  },
  cardPop: {
    shadowColor: "#281A3B",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.35,
    shadowRadius: 60,
    elevation: 20,
  },
};

const FONTS = {
  h1: {
    fontFamily: "FrauncesBold",
    fontSize: 32,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  h1Dark: {
    fontFamily: "FrauncesBold",
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  h2: {
    fontFamily: "FrauncesBold",
    fontSize: 24,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  h2Dark: {
    fontFamily: "FrauncesBold",
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  h3: {
    fontFamily: "FrauncesMedium",
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  h3Dark: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  body: {
    fontFamily: "Inter",
    fontSize: 15,
    fontWeight: "400",
    color: "#475569",
    lineHeight: 22,
    letterSpacing: -0.1,
  },
  bodyDark: {
    fontSize: 14,
    fontWeight: "400",
    color: "rgba(255,255,255,0.70)",
    lineHeight: 20,
  },
  bodyBold: {
    fontFamily: "InterSemiBold",
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  bodyBoldDark: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 20,
  },
  caption: {
    fontFamily: "Inter",
    fontSize: 12,
    fontWeight: "400",
    color: "#94A3B8",
    lineHeight: 16,
  },
  captionDark: {
    fontSize: 12,
    fontWeight: "400",
    color: "rgba(255,255,255,0.45)",
    lineHeight: 16,
  },
  captionBold: {
    fontFamily: "InterSemiBold",
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    letterSpacing: 0.2,
  },
  captionBoldDark: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.70)",
    letterSpacing: 0.2,
  },
  price: {
    fontFamily: "FrauncesBold",
    fontSize: 30,
    fontWeight: "900",
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
    fontFamily: "FrauncesBold",
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  badge: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  luxury: {
    fontFamily: "FrauncesBold",
    fontSize: 38,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.8,
  },
  luxurySub: {
    fontSize: 16,
    fontWeight: "400",
    color: "rgba(255,255,255,0.65)",
    letterSpacing: 0.2,
    lineHeight: 24,
  },
  eyebrow: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 2.5,
    textTransform: "uppercase",
    color: "#FFFFFF", // Brighter on gradients
  },
  // ── CompareZ Redesign Fonts (Additive) ────────────────────────────
  heading: {
    fontFamily: "FrauncesBold",
    fontWeight: "600",
    color: "#211C2B",
  },
  uiBody: {
    fontFamily: "Inter",
    fontWeight: "400",
    color: "#211C2B",
  },
  uiBodyMedium: {
    fontFamily: "InterMedium",
    fontWeight: "500",
    color: "#211C2B",
  },
  uiBodyBold: {
    fontFamily: "InterSemiBold",
    fontWeight: "600",
    color: "#211C2B",
  },
  editorial: {
    fontFamily: "FrauncesSemiBold",
    fontWeight: "600",
    color: "#18201C",
  },
  editorialBold: {
    fontFamily: "FrauncesBold",
    fontWeight: "700",
    color: "#18201C",
  },
  mono: {
    fontFamily: "InterMedium",
    fontWeight: "500",
    color: "#211C2B",
  },
  monoBold: {
    fontFamily: "InterSemiBold",
    fontWeight: "600",
    color: "#211C2B",
  },
};

export { SPACING, RADIUS, SHADOWS, FONTS };
