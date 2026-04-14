import { ViewStyle } from 'react-native';

// NOTE: File is historically named `dark.ts` and the export is `dark` so that
// the 40+ files already importing it keep working. The actual palette is the
// new "Daylight Clinical" light theme — clean, high-contrast, built for
// outdoor phone readability.

export const dark = {
  // Surfaces
  bg: '#F6F8FA',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  surfaceMuted: '#EEF2F6',
  border: '#E4E8EE',
  borderStrong: '#CBD2DB',
  divider: '#EDF1F5',

  // Brand
  teal: '#0F9B8E',
  tealMuted: '#E6F4F2',
  tealBorder: '#BEE3DE',
  tealGlow: 'rgba(15, 155, 142, 0.18)',
  tealPressed: '#0C7F74',

  // Text
  text: '#0B1F33',
  textSecondary: '#5A6B7C',
  muted: '#8A97A6',
  textInverse: '#FFFFFF',
  textOnTeal: '#FFFFFF',

  // Status — foreground + soft background pairs
  success: '#15A34A',
  successText: '#0F7A37',
  successBg: '#E8F7EE',
  successBorder: '#BDE7CC',

  warning: '#D97706',
  warningText: '#8A4A04',
  warningBg: '#FEF3E6',
  warningBorder: '#F6D9AF',
  amber: '#D97706',
  amberMuted: '#FEF3E6',
  amberBorder: '#F6D9AF',

  danger: '#DC2626',
  dangerText: '#B01717',
  dangerBg: '#FCEAEA',
  dangerBorder: '#F2BFBF',

  info: '#2563EB',
  infoText: '#1E4CB3',
  infoBg: '#EAF1FE',
  infoBorder: '#BFD2F7',

  // Urgency scale (bin fullness) — aliased to status so drivers learn one language
  urgencyNormal: '#15A34A',
  urgencyWarning: '#D97706',
  urgencyCritical: '#DC2626',

  // Utility
  barTrack: '#E4E8EE',
  overlay: 'rgba(11, 31, 51, 0.45)',
  shadow: 'rgba(11, 31, 51, 0.08)',
  shadowStrong: 'rgba(11, 31, 51, 0.14)',
} as const;

// Radii scale
export const radius = {
  xs: 6,
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  pill: 999,
} as const;

// Elevation presets — subtle, not heavy
export const elevation = {
  none: {
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  } satisfies ViewStyle,
  sm: {
    shadowColor: '#0B1F33',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  } satisfies ViewStyle,
  md: {
    shadowColor: '#0B1F33',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  } satisfies ViewStyle,
  lg: {
    shadowColor: '#0B1F33',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  } satisfies ViewStyle,
} as const;

// Tap target sizes (iOS HIG minimum is 44, Android is 48 — we use 48 for primary)
export const touch = {
  row: 44,
  button: 48,
  fab: 56,
} as const;

// Common composed styles, kept for backwards compat with existing imports
export const darkCard: ViewStyle = {
  backgroundColor: dark.surface,
  borderRadius: radius.lg,
  borderWidth: 1,
  borderColor: dark.border,
  ...elevation.sm,
};

export const darkInput: ViewStyle = {
  backgroundColor: dark.surface,
  borderRadius: radius.md,
  borderWidth: 1,
  borderColor: dark.border,
};
