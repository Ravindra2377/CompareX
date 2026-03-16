// CompareX Design System — AMOLED Black Edition
// True #000000 base for OLED pixel-off battery savings + infinite contrast.

export const COLORS = {
  // ── Core backgrounds ──────────────────────────────────────────────
  primary:      "#000000",   // true black
  primaryLight: "#0A0A0A",
  background:   "#000000",   // AMOLED base
  surface:      "#0D0D0D",   // nav bar / modal floors
  card:         "#121212",   // elevated bento tile (8% white)
  cardAlt:      "#1B1B1B",   // secondary tile / list row
  border:       "#1F1F1F",
  borderLight:  "#2C2C2C",
  divider:      "#161616",

  // ── Glassmorphism ─────────────────────────────────────────────────
  glassSurface:   "rgba(18, 18, 18, 0.80)",
  glassBorder:    "rgba(44, 44, 44, 0.70)",
  glassHighlight: "rgba(6, 182, 212, 0.07)",

  // ── Accent ────────────────────────────────────────────────────────
  accent:      "#06B6D4",   // cyan — primary CTA
  accentStrong:"#0891B2",
  accentMuted: "rgba(6, 182, 212, 0.15)",

  // ── Semantic ──────────────────────────────────────────────────────
  savings:      "#22C55E",
  savingsLight: "rgba(34, 197, 94, 0.14)",
  warning:      "#F59E0B",
  warningLight: "rgba(245, 158, 11, 0.14)",
  error:        "#EF4444",
  errorLight:   "rgba(239, 68, 68, 0.12)",

  // ── Platform accent colors ─────────────────────────────────────────
  platformBlinkit:   "#FAC82A",   // Blinkit yellow
  platformZepto:     "#8B5CF6",   // Zepto purple
  platformBigBasket: "#F97316",   // BigBasket orange
  platformAmazon:    "#FF9900",   // Amazon orange
  platformFlipkart:  "#2874F0",   // Flipkart blue

  // ── Text (halation-safe off-whites) ───────────────────────────────
  // Using 87 / 60 / 38% opacity off-white instead of hard #FFF
  textPrimary:   "rgba(245,245,245,0.87)",  // headlines
  textSecondary: "rgba(245,245,245,0.60)",  // body
  textTertiary:  "rgba(245,245,245,0.38)",  // captions / hints
  textInverse:   "#000000",
  textAccent:    "#67E8F9",

  // ── Gradients ─────────────────────────────────────────────────────
  gradientHero:    ["#000000", "#070707", "#0A0A0A"],
  gradientCard:    ["rgba(27,27,27,0.95)", "rgba(10,10,10,0.98)"],
  gradientAccent:  ["#06B6D4", "#0EA5E9"],
  gradientSavings: ["#22C55E", "#16A34A"],
  gradientGlass:   ["rgba(6,182,212,0.10)", "rgba(14,165,233,0.03)"],
};

export const SPACING = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
  xxxl: 32,
  huge: 40,
};

export const RADIUS = {
  xs:  6,
  sm:  10,
  md:  14,
  lg:  18,
  xl:  24,
  xxl: 32,
  full: 999,
};

export const SHADOWS = {
  none: {},
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.40,
    shadowRadius: 6,
    elevation: 4,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 10,
  },
  glow: {
    shadowColor: "#06B6D4",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.40,
    shadowRadius: 16,
    elevation: 12,
  },
  glowSoft: {
    shadowColor: "#06B6D4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 8,
  },
};

export const FONTS = {
  h1: {
    fontSize: 32,
    fontWeight: "800",
    color: "rgba(245,245,245,0.87)",
    letterSpacing: -0.9,
  },
  h2: {
    fontSize: 24,
    fontWeight: "700",
    color: "rgba(245,245,245,0.87)",
    letterSpacing: -0.4,
  },
  h3: {
    fontSize: 18,
    fontWeight: "700",
    color: "rgba(245,245,245,0.87)",
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 15,
    fontWeight: "400",
    color: "rgba(245,245,245,0.60)",
    lineHeight: 22,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: "600",
    color: "rgba(245,245,245,0.87)",
    lineHeight: 22,
  },
  caption: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(245,245,245,0.38)",
    lineHeight: 18,
  },
  captionBold: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(245,245,245,0.60)",
    letterSpacing: 0.2,
  },
  price: {
    fontSize: 24,
    fontWeight: "800",
    color: "rgba(245,245,245,0.87)",
    letterSpacing: -0.4,
  },
  priceSmall: {
    fontSize: 18,
    fontWeight: "700",
    color: "rgba(245,245,245,0.87)",
  },
  badge: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },
};
