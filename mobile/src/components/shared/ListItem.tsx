import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { dark, radius, spacing, touch, typography } from '../../theme';

interface ListItemProps {
  title: string;
  subtitle?: string;
  meta?: string;
  leadingIcon?: keyof typeof MaterialCommunityIcons.glyphMap;
  leadingIconColor?: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  showChevron?: boolean;
}

export default function ListItem({
  title,
  subtitle,
  meta,
  leadingIcon,
  leadingIconColor,
  trailing,
  onPress,
  disabled,
  style,
  showChevron = false,
}: ListItemProps) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole={onPress ? 'button' : undefined}
      style={[styles.row, disabled && styles.disabled, style]}
    >
      {leadingIcon ? (
        <View style={styles.leading}>
          <MaterialCommunityIcons
            name={leadingIcon}
            size={22}
            color={leadingIconColor ?? dark.teal}
          />
        </View>
      ) : null}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      {trailing}
      {showChevron ? (
        <MaterialCommunityIcons
          name="chevron-right"
          size={22}
          color={dark.muted}
        />
      ) : null}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touch.row,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: dark.surface,
    borderRadius: radius.lg,
  },
  disabled: {
    opacity: 0.5,
  },
  leading: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: dark.tealMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.bodyStrong,
    color: dark.text,
  },
  subtitle: {
    ...typography.caption,
    color: dark.textSecondary,
  },
  meta: {
    ...typography.caption,
    color: dark.muted,
  },
});
