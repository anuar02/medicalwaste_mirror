import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { dark, spacing, typography } from '../../theme';

interface Segment {
  key: string;
  label: string;
  badge?: number;
}

interface SegmentedControlProps {
  segments: Segment[];
  activeKey: string;
  onSelect: (key: string) => void;
}

export default function SegmentedControl({
  segments,
  activeKey,
  onSelect,
}: SegmentedControlProps) {
  const activeIndex = segments.findIndex((s) => s.key === activeKey);
  const indicatorPosition = useSharedValue(activeIndex >= 0 ? activeIndex : 0);

  useEffect(() => {
    const idx = segments.findIndex((s) => s.key === activeKey);
    if (idx >= 0) {
      indicatorPosition.value = withSpring(idx, { damping: 20, stiffness: 200 });
    }
  }, [activeKey, segments, indicatorPosition]);

  const indicatorStyle = useAnimatedStyle(() => ({
    left: `${(indicatorPosition.value / segments.length) * 100}%`,
    width: `${100 / segments.length}%`,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.indicator, indicatorStyle]} />
      {segments.map((segment) => (
        <TouchableOpacity
          key={segment.key}
          style={styles.button}
          onPress={() => onSelect(segment.key)}
          activeOpacity={0.7}
        >
          <View style={styles.labelRow}>
            <Text
              style={[
                styles.text,
                segment.key === activeKey && styles.textActive,
              ]}
            >
              {segment.label}
            </Text>
            {segment.badge != null && segment.badge > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{segment.badge}</Text>
              </View>
            ) : null}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 999,
    backgroundColor: dark.card,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    borderRadius: 999,
    backgroundColor: dark.teal,
    shadowColor: dark.teal,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 1,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    alignItems: 'center',
    zIndex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    ...typography.body,
    color: dark.muted,
    fontWeight: '600',
  },
  textActive: {
    color: dark.text,
  },
  badge: {
    marginLeft: spacing.xs,
    backgroundColor: dark.amber,
    borderRadius: 999,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 11,
    color: '#fff7ed',
    fontWeight: '700',
  },
});
