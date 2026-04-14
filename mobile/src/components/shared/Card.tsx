import React from 'react';
import { StyleSheet, View, ViewProps, ViewStyle } from 'react-native';

import { dark, elevation, radius, spacing } from '../../theme';

type Variant = 'elevated' | 'outlined' | 'muted';

interface CardProps extends ViewProps {
  variant?: Variant;
  padding?: keyof typeof spacing | 'none';
  style?: ViewStyle | ViewStyle[];
}

export default function Card({
  variant = 'elevated',
  padding = 'lg',
  style,
  children,
  ...rest
}: CardProps) {
  const pad = padding === 'none' ? 0 : spacing[padding];
  return (
    <View
      {...rest}
      style={[
        styles.base,
        variant === 'elevated' && styles.elevated,
        variant === 'outlined' && styles.outlined,
        variant === 'muted' && styles.muted,
        { padding: pad },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    backgroundColor: dark.surface,
  },
  elevated: {
    backgroundColor: dark.surface,
    borderWidth: 1,
    borderColor: dark.border,
    ...elevation.sm,
  },
  outlined: {
    backgroundColor: dark.surface,
    borderWidth: 1,
    borderColor: dark.border,
  },
  muted: {
    backgroundColor: dark.surfaceMuted,
  },
});
