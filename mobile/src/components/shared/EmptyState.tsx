import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { dark, radius, spacing, typography } from '../../theme';
import Button from './Button';

interface EmptyStateProps {
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionLoading?: boolean;
  style?: ViewStyle;
  /**
   * Placeholder slot for a future illustration. Replace with an <Image />
   * pointing to a branded asset (e.g. empty-route.svg) when one exists.
   */
  illustration?: React.ReactNode;
}

export default function EmptyState({
  icon = 'information-outline',
  title,
  body,
  actionLabel,
  onAction,
  actionLoading,
  style,
  illustration,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      {illustration ?? (
        // TODO: replace with branded illustration asset
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name={icon} size={36} color={dark.teal} />
        </View>
      )}
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          loading={actionLoading}
          size="md"
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: dark.tealMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.subtitle,
    color: dark.text,
    textAlign: 'center',
  },
  body: {
    ...typography.body,
    color: dark.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
  },
  action: {
    marginTop: spacing.md,
    minWidth: 180,
  },
});
