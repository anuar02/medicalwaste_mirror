import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { dark, elevation, radius, spacing, typography } from '../../theme';

interface StatTileProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  tone?: 'teal' | 'neutral';
  style?: ViewStyle;
}

export default function StatTile({
  label,
  value,
  unit,
  icon,
  tone = 'neutral',
  style,
}: StatTileProps) {
  return (
    <View style={[styles.container, style]}>
      {icon ? (
        <View
          style={[
            styles.iconWrap,
            tone === 'teal' && { backgroundColor: dark.tealMuted },
          ]}
        >
          <MaterialCommunityIcons
            name={icon}
            size={18}
            color={tone === 'teal' ? dark.teal : dark.textSecondary}
          />
        </View>
      ) : null}
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.valueRow}>
        <Text style={styles.value}>{value}</Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: dark.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: dark.border,
    padding: spacing.lg,
    gap: spacing.xs,
    ...elevation.sm,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: dark.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    ...typography.label,
    color: dark.muted,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  value: {
    ...typography.heading,
    color: dark.text,
  },
  unit: {
    ...typography.caption,
    color: dark.textSecondary,
  },
});
