/**
 * Central design tokens for CollabMe.
 *
 * Keep all colors, spacing, typography and radii here so the UI stays
 * consistent and is trivial to re-theme (e.g. dark mode) later.
 */

export const colors = {
  primary: '#6C5CE7',
  primaryDark: '#5848C2',
  primaryLight: '#A29BFE',

  accent: '#00CEC9',
  success: '#00B894',
  warning: '#FDCB6E',
  danger: '#FF6B6B',

  background: '#FFFFFF',
  surface: '#F5F6FA',
  surfaceAlt: '#EDEFF5',

  text: '#2D3436',
  textMuted: '#636E72',
  textInverse: '#FFFFFF',

  border: '#DFE4EA',
  overlay: 'rgba(45, 52, 54, 0.45)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  title: { fontSize: 28, fontWeight: '700' as const },
  heading: { fontSize: 22, fontWeight: '700' as const },
  subheading: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
  button: { fontSize: 16, fontWeight: '600' as const },
} as const;

export const theme = { colors, spacing, radius, typography };

export type Theme = typeof theme;
