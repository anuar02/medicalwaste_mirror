import { TextStyle } from 'react-native';

// Typography spreads do NOT include color — add `color: dark.text` at the
// site of use so the same scale works on any surface. Weights are bumped
// vs a typical desktop scale because drivers read these outdoors.

export const typography = {
  display: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    lineHeight: 34,
  } satisfies TextStyle,
  heading: {
    fontSize: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
    lineHeight: 30,
  } satisfies TextStyle,
  title: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 26,
  } satisfies TextStyle,
  subtitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    lineHeight: 22,
  } satisfies TextStyle,
  body: {
    fontSize: 15,
    fontWeight: '500' as const,
    lineHeight: 20,
  } satisfies TextStyle,
  bodyStrong: {
    fontSize: 15,
    fontWeight: '600' as const,
    lineHeight: 20,
  } satisfies TextStyle,
  caption: {
    fontSize: 13,
    fontWeight: '500' as const,
    lineHeight: 18,
  } satisfies TextStyle,
  label: {
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 0.4,
    textTransform: 'uppercase' as const,
    lineHeight: 16,
  } satisfies TextStyle,
  button: {
    fontSize: 16,
    fontWeight: '700' as const,
    letterSpacing: 0.1,
    lineHeight: 20,
  } satisfies TextStyle,
} as const;
