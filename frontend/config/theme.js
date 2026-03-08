// CompareX Design System — Clean & Minimal

export const COLORS = {
  // Primary (Deep Dark Slate)
  primary: '#0B0F19',
  primaryLight: '#1A233A',
  accent: '#6366F1', // Indigo
  accentLight: '#3730A3',

  // Semantic
  savings: '#10B981', // Emerald green
  savingsLight: 'rgba(16, 185, 129, 0.15)',
  warning: '#F59E0B',
  warningLight: 'rgba(245, 158, 11, 0.15)',
  error: '#EF4444',
  errorLight: 'rgba(239, 68, 68, 0.15)',

  // Neutrals / Structural
  background: '#0B0F19',
  surface: '#111827',
  card: '#1F2937', 
  border: '#374151',
  borderLight: '#4B5563',
  divider: '#374151',

  // Text
  textPrimary: '#F9FAFB',
  textSecondary: '#9CA3AF',
  textTertiary: '#6B7280',
  textInverse: '#0B0F19', // for text on very light/accent backgrounds
  textAccent: '#818CF8',

  // Gradients (To be used with linear-gradient)
  gradientAccent: ['#6366F1', '#4F46E5'],
  gradientSavings: ['#10B981', '#059669'],
  gradientCard: ['#1F2937', '#111827'],
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const RADIUS = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

export const SHADOWS = {
  none: {},
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  glow: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  }
};

export const FONTS = {
  h1: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -1,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 15,
    fontWeight: '400',
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  caption: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textTertiary,
  },
  captionBold: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 0.2,
  },
  price: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  priceSmall: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  badge: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
};
