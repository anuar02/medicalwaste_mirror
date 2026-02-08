import { ViewStyle } from 'react-native';

export const dark = {
  bg: '#0f172a',
  surface: 'rgba(30, 41, 59, 0.8)',
  card: 'rgba(30, 41, 59, 0.6)',
  border: 'rgba(51, 65, 85, 0.5)',
  teal: '#0d9488',
  tealGlow: 'rgba(13, 148, 136, 0.35)',
  muted: '#64748b',
  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  amber: '#f59e0b',
  amberMuted: 'rgba(245, 158, 11, 0.15)',
  amberBorder: 'rgba(245, 158, 11, 0.3)',
  success: 'rgba(16, 185, 129, 0.15)',
  successText: '#10b981',
  danger: 'rgba(239, 68, 68, 0.15)',
  dangerText: '#ef4444',
  barTrack: 'rgba(51, 65, 85, 0.5)',
  urgencyCritical: '#ef4444',
  urgencyWarning: '#f59e0b',
  urgencyNormal: '#10b981',
} as const;

export const darkCard: ViewStyle = {
  backgroundColor: dark.surface,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: dark.border,
};

export const darkInput: ViewStyle = {
  backgroundColor: dark.card,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: dark.border,
};
