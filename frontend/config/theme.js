const COLORS = {
  // ── Core backgrounds ──────────────────────────────────────────────
  primary:      "#0A0A0A",
  primaryLight: "#141414",
  background:   "#F5F5F3",   // warm off-white (collection screens)
  backgroundDark: "#0A0A0A", // dark hero screens
  surface:      "#FFFFFF",
  surfaceDark:  "#141414",
  card:         "#FFFFFF",
  cardAlt:      "#F0EFED",
  cardDark:     "#1A1A1A",
  border:       "#E5E5E3",
  borderDark:   "#2A2A2A",
  borderLight:  "#EBEBEB",
  divider:      "#E8E8E6",

  // ── Glassmorphism ─────────────────────────────────────────────────
  glassSurface:   "rgba(255, 255, 255, 0.85)",
  glassSurfaceDark: "rgba(20, 20, 20, 0.90)",
  glassBorder:    "rgba(0, 0, 0, 0.06)",
  glassBorderDark: "rgba(255, 255, 255, 0.08)",
  glassHighlight: "rgba(0, 0, 0, 0.03)",

  // ── Accent ────────────────────────────────────────────────────────
  accent:      "#1A1A1A",   // near-black CTA
  accentGold:  "#C4A265",   // warm gold luxury accent
  accentLight: "rgba(196, 162, 101, 0.12)",
  accentStrong:"#0A0A0A",
  accentMuted: "rgba(26, 26, 26, 0.08)",

  // ── Semantic ──────────────────────────────────────────────────────
  savings:      "#2D8C5A",
  savingsLight: "rgba(45, 140, 90, 0.08)",
  warning:      "#D4A853",
  warningLight: "rgba(212, 168, 83, 0.08)",
  error:        "#C45454",
  errorLight:   "rgba(196, 84, 84, 0.08)",

  // ── Platform accent colors ─────────────────────────────────────────
  platformBlinkit:   "#D4A853",
  platformZepto:     "#7B6BA5",
  platformBigBasket: "#8B9A6B",
  platformAmazon:    "#C4A265",
  platformFlipkart:  "#6B7B9A",

  // ── Text ──────────────────────────────────────────────────────────
  textPrimary:   "#1A1A1A",
  textSecondary: "#6B6B6B",
  textTertiary:  "#9B9B9B",
  textOnDark:    "#FFFFFF",
  textOnDarkSec: "rgba(255,255,255,0.65)",
  textOnDarkTer: "rgba(255,255,255,0.40)",
  textInverse:   "#FFFFFF",
  textAccent:    "#C4A265",

  // ── Gradients ─────────────────────────────────────────────────────
  gradientHero:    ["#0A0A0A", "#111111", "#1A1A1A"],
  gradientCard:    ["#FFFFFF", "#FAFAF8"],
  gradientCardDark:["rgba(26,26,26,0.98)", "rgba(14,14,14,0.98)"],
  gradientAccent:  ["#1A1A1A", "#2A2A2A"],
  gradientSavings: ["#2D8C5A", "#237A4A"],
  gradientGlass:   ["rgba(255,255,255,0.95)", "rgba(245,245,243,0.90)"],
  gradientGold:    ["#C4A265", "#D4B275"],
};

const SPACING = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
  xxxl: 32,
  huge: 40,
};

const RADIUS = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  24,
  xxl: 32,
  full: 999,
};

const SHADOWS = {
  none: {},
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
  },
  glow: {
    shadowColor: "#C4A265",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.20,
    shadowRadius: 16,
    elevation: 8,
  },
  glowSoft: {
    shadowColor: "#C4A265",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 4,
  },
  dark: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 12,
    elevation: 8,
  },
};

const FONTS = {
  h1: {
    fontSize: 34,
    fontWeight: "300",
    color: "#1A1A1A",
    letterSpacing: -0.5,
  },
  h1Dark: {
    fontSize: 34,
    fontWeight: "300",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 24,
    fontWeight: "400",
    color: "#1A1A1A",
    letterSpacing: -0.3,
  },
  h2Dark: {
    fontSize: 24,
    fontWeight: "400",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 18,
    fontWeight: "500",
    color: "#1A1A1A",
    letterSpacing: -0.2,
  },
  h3Dark: {
    fontSize: 18,
    fontWeight: "500",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 15,
    fontWeight: "400",
    color: "#6B6B6B",
    lineHeight: 22,
  },
  bodyDark: {
    fontSize: 15,
    fontWeight: "400",
    color: "rgba(255,255,255,0.65)",
    lineHeight: 22,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    lineHeight: 22,
  },
  bodyBoldDark: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    lineHeight: 22,
  },
  caption: {
    fontSize: 13,
    fontWeight: "400",
    color: "#9B9B9B",
    lineHeight: 18,
  },
  captionDark: {
    fontSize: 13,
    fontWeight: "400",
    color: "rgba(255,255,255,0.40)",
    lineHeight: 18,
  },
  captionBold: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B6B6B",
    letterSpacing: 0.2,
  },
  captionBoldDark: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.65)",
    letterSpacing: 0.2,
  },
  price: {
    fontSize: 28,
    fontWeight: "300",
    color: "#1A1A1A",
    letterSpacing: -0.5,
  },
  priceDark: {
    fontSize: 28,
    fontWeight: "300",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  priceSmall: {
    fontSize: 18,
    fontWeight: "400",
    color: "#1A1A1A",
  },
  badge: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  luxury: {
    fontSize: 42,
    fontWeight: "200",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  luxurySub: {
    fontSize: 16,
    fontWeight: "300",
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 0.8,
    lineHeight: 24,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 3,
    textTransform: "uppercase",
    color: "#C4A265",
  },
};

export { COLORS, SPACING, RADIUS, SHADOWS, FONTS };
