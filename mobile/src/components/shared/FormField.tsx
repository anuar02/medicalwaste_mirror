import React, { useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { dark, radius, spacing, typography } from '../../theme';

export interface FormFieldProps extends Omit<TextInputProps, 'style'> {
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  label?: string;
  hint?: string;
  errorText?: string;
  style?: ViewStyle;
  secureTextEntry?: boolean;
}

export default function FormField({
  icon,
  label,
  hint,
  errorText,
  style,
  secureTextEntry,
  onFocus,
  onBlur,
  ...rest
}: FormFieldProps) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const focus = useSharedValue(0);

  const hasError = Boolean(errorText);

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: hasError
      ? dark.danger
      : interpolateColor(focus.value, [0, 1], [dark.border, dark.teal]),
  }));

  return (
    <View style={[styles.wrapper, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Animated.View
        style={[
          styles.row,
          borderStyle,
          focused && !hasError && styles.focusShadow,
        ]}
      >
        {icon ? (
          <MaterialCommunityIcons
            name={icon}
            size={20}
            color={hasError ? dark.danger : focused ? dark.teal : dark.muted}
            style={styles.icon}
          />
        ) : null}
        <TextInput
          placeholderTextColor={dark.muted}
          style={styles.input}
          autoCorrect={false}
          secureTextEntry={secureTextEntry && !visible}
          onFocus={(e) => {
            setFocused(true);
            focus.value = withTiming(1, { duration: 180 });
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            focus.value = withTiming(0, { duration: 180 });
            onBlur?.(e);
          }}
          {...rest}
        />
        {secureTextEntry ? (
          <TouchableOpacity
            onPress={() => setVisible((v) => !v)}
            hitSlop={8}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons
              name={visible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={dark.muted}
            />
          </TouchableOpacity>
        ) : null}
      </Animated.View>
      {errorText ? (
        <Text style={styles.error}>{errorText}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.label,
    color: dark.textSecondary,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: dark.surface,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    minHeight: 48,
  },
  focusShadow: {
    shadowColor: dark.teal,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  icon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: dark.text,
    padding: 0,
  },
  hint: {
    ...typography.caption,
    color: dark.textSecondary,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
  error: {
    ...typography.caption,
    color: dark.dangerText,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
});
