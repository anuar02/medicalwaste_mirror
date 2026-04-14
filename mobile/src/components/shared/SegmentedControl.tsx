import React, { useEffect, useState } from 'react';
import {
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { dark, elevation, radius, spacing, typography } from '../../theme';

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

const TRACK_PADDING = 4;

export default function SegmentedControl({
  segments,
  activeKey,
  onSelect,
}: SegmentedControlProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const activeIndex = Math.max(
    0,
    segments.findIndex((s) => s.key === activeKey),
  );
  const progress = useSharedValue(activeIndex);

  useEffect(() => {
    progress.value = withSpring(activeIndex, {
      damping: 22,
      stiffness: 220,
      mass: 0.6,
    });
  }, [activeIndex, progress]);

  const segmentWidth =
    trackWidth > 0 ? (trackWidth - TRACK_PADDING * 2) / segments.length : 0;

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * segmentWidth }],
    width: segmentWidth,
  }));

  const onTrackLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  return (
    <View style={styles.container} onLayout={onTrackLayout}>
      {segmentWidth > 0 ? (
        <Animated.View style={[styles.indicator, indicatorStyle]} />
      ) : null}
      {segments.map((segment) => {
        const isActive = segment.key === activeKey;
        return (
          <TouchableOpacity
            key={segment.key}
            style={styles.button}
            onPress={() => onSelect(segment.key)}
            activeOpacity={0.75}
          >
            <View style={styles.labelRow}>
              <Text
                style={[styles.text, isActive && styles.textActive]}
                numberOfLines={1}
              >
                {segment.label}
              </Text>
              {segment.badge != null && segment.badge > 0 ? (
                <View style={[styles.badge, isActive && styles.badgeActive]}>
                  <Text
                    style={[
                      styles.badgeText,
                      isActive && styles.badgeTextActive,
                    ]}
                  >
                    {segment.badge}
                  </Text>
                </View>
              ) : null}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: TRACK_PADDING,
    borderRadius: radius.pill,
    backgroundColor: dark.surfaceMuted,
    borderWidth: 1,
    borderColor: dark.border,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: TRACK_PADDING,
    bottom: TRACK_PADDING,
    left: TRACK_PADDING,
    borderRadius: radius.pill,
    backgroundColor: dark.teal,
    ...elevation.sm,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    ...typography.bodyStrong,
    color: dark.textSecondary,
  },
  textActive: {
    color: dark.textOnTeal,
  },
  badge: {
    marginLeft: spacing.xs,
    backgroundColor: dark.warning,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeActive: {
    backgroundColor: dark.textOnTeal,
  },
  badgeText: {
    fontSize: 11,
    color: dark.textInverse,
    fontWeight: '700',
  },
  badgeTextActive: {
    color: dark.teal,
  },
});
