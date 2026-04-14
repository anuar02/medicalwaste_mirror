import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { dark, radius, spacing, typography } from '../../theme';

type Tone = 'neutral' | 'teal' | 'success' | 'warning' | 'danger' | 'info';

interface ChipProps {
  label: string;
  tone?: Tone;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  style?: ViewStyle;
}

export default function Chip({ label, tone = 'neutral', icon, style }: ChipProps) {
  const palette = tonePalette[tone];
  return (
    <View style={[styles.base, { backgroundColor: palette.bg, borderColor: palette.border }, style]}>
      {icon ? (
        <MaterialCommunityIcons name={icon} size={14} color={palette.fg} />
      ) : null}
      <Text style={[styles.label, { color: palette.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  label: {
    ...typography.caption,
    fontWeight: '600',
  },
});

const tonePalette: Record<Tone, { fg: string; bg: string; border: string }> = {
  neutral: { fg: dark.muted, bg: dark.surfaceMuted, border: dark.borderStrong },
  teal: { fg: dark.teal, bg: dark.tealMuted, border: dark.tealBorder },
  success: { fg: dark.successText, bg: dark.successBg, border: dark.successBorder },
  warning: { fg: dark.warningText, bg: dark.warningBg, border: dark.warningBorder },
  danger: { fg: dark.dangerText, bg: dark.dangerBg, border: dark.dangerBorder },
  info: { fg: dark.infoText, bg: dark.infoBg, border: dark.infoBorder },
};
