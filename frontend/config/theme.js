// CompareX Design System — Clean & Minimal

export const COLORS = {
  // Primary
  primary: '#111827',
  primaryLight: '#374151',
  accent: '#4F46E5',
  accentLight: '#EEF2FF',

  // Semantic
  savings: '#059669',
  savingsLight: '#ECFDF5',
  warning: '#D97706',
  warningLight: '#FFFBEB',
  error: '#DC2626',
  errorLight: '#FEF2F2',

  // Neutrals
  background: '#FFFFFF',
  surface: '#FFFFFF',
  card: '#F9FAFB',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  divider: '#F3F4F6',

  // Text
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',
  textAccent: '#4F46E5',
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
};

export const FONTS = {
  h1: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  body: {
    fontSize: 15,
    fontWeight: '400',
    color: '#6B7280',
    lineHeight: 22,
  },
  bodyBold: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  caption: {
    fontSize: 13,
    fontWeight: '400',
    color: '#9CA3AF',
  },
  captionBold: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  priceSmall: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  badge: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
};
