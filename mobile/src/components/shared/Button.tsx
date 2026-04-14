import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
  ViewStyle,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { dark, radius, spacing, touch, typography } from '../../theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle | ViewStyle[];
}

export default function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const containerStyle: ViewStyle[] = [
    styles.base,
    sizeStyles[size].container,
    variantStyles[variant].container,
  ];
  if (fullWidth) containerStyle.push(styles.fullWidth);
  if (isDisabled) containerStyle.push(styles.disabled);
  if (style) {
    if (Array.isArray(style)) containerStyle.push(...style);
    else containerStyle.push(style);
  }

  const textStyle: TextStyle[] = [
    styles.label,
    sizeStyles[size].label,
    variantStyles[variant].label,
    isDisabled && styles.disabledLabel,
  ];

  const iconColor = variantStyles[variant].label.color as string;
  const iconNode = icon ? (
    <MaterialCommunityIcons
      name={icon}
      size={sizeStyles[size].iconSize}
      color={iconColor}
    />
  ) : null;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      {...rest}
      style={containerStyle}
    >
      {loading ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : (
        <View style={styles.row}>
          {iconPosition === 'left' && iconNode}
          <Text style={textStyle} numberOfLines={1}>
            {label}
          </Text>
          {iconPosition === 'right' && iconNode}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    ...typography.button,
  },
  disabled: {
    opacity: 0.45,
  },
  disabledLabel: {},
});

const sizeStyles: Record<
  Size,
  { container: ViewStyle; label: TextStyle; iconSize: number }
> = {
  sm: {
    container: { minHeight: 36, paddingHorizontal: spacing.md },
    label: { fontSize: 14 },
    iconSize: 16,
  },
  md: {
    container: { minHeight: touch.button },
    label: { fontSize: 16 },
    iconSize: 18,
  },
  lg: {
    container: { minHeight: 56, paddingHorizontal: spacing.xl },
    label: { fontSize: 17 },
    iconSize: 20,
  },
};

const variantStyles: Record<Variant, { container: ViewStyle; label: TextStyle }> = {
  primary: {
    container: { backgroundColor: dark.teal },
    label: { color: dark.textOnTeal },
  },
  secondary: {
    container: {
      backgroundColor: dark.tealMuted,
      borderWidth: 1,
      borderColor: dark.tealBorder,
    },
    label: { color: dark.teal },
  },
  ghost: {
    container: {
      backgroundColor: dark.surface,
      borderWidth: 1,
      borderColor: dark.border,
    },
    label: { color: dark.text },
  },
  danger: {
    container: { backgroundColor: dark.danger },
    label: { color: dark.textInverse },
  },
};
