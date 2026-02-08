import React, { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { dark, spacing, typography } from '../../theme';
import { getUrgencyColor, getUrgencyBg } from '../../utils/urgency';
import { formatRelativeTime, getDataFreshness } from '../../utils/formatTime';
import AnimatedProgressBar from './AnimatedProgressBar';
import PulsingDot from './PulsingDot';

interface ContainerCardProps {
  binId?: string;
  fullness?: number;
  temperature?: number;
  wasteType?: string;
  lastUpdate?: string;
  visited?: boolean;
  isPending?: boolean;
  distanceText?: string;
  index?: number;
  onPress?: () => void;
}

export default function ContainerCard({
  binId,
  fullness,
  temperature,
  wasteType,
  lastUpdate,
  visited,
  isPending,
  distanceText,
  index = 0,
  onPress,
}: ContainerCardProps) {
  const { t } = useTranslation();
  const scale = useSharedValue(1);
  const urgencyColor = getUrgencyColor(fullness);
  const urgencyBg = getUrgencyBg(fullness);
  const freshness = getDataFreshness(lastUpdate);

  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
    })
    .onFinalize(() => {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    })
    .onEnd(() => {
      if (onPress) onPress();
    })
    .runOnJS(true);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View
        entering={FadeInDown.delay(index * 50).springify()}
        style={[styles.card, pressStyle]}
      >
        {/* Left urgency stripe */}
        <View style={[styles.stripe, { backgroundColor: urgencyColor }]} />

        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.binId}>{binId ?? t('driver.route.container')}</Text>
            <View style={styles.badgeRow}>
              {visited != null && (
                <View style={[styles.badge, { backgroundColor: visited ? dark.success : dark.amberMuted }]}>
                  <Text style={[styles.badgeText, { color: visited ? dark.successText : dark.amber }]}>
                    {visited ? t('driver.containers.visited') : t('driver.containers.pending')}
                  </Text>
                </View>
              )}
              {isPending && visited == null && (
                <View style={[styles.badge, { backgroundColor: dark.amberMuted }]}>
                  <Text style={[styles.badgeText, { color: dark.amber }]}>{t('driver.containers.pending')}</Text>
                </View>
              )}
              {distanceText ? (
                <View style={styles.distanceBadge}>
                  <Text style={styles.distanceText}>{distanceText}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Fullness bar */}
          <View style={styles.progressRow}>
            <AnimatedProgressBar
              fullness={fullness ?? 0}
              color={urgencyColor}
            />
            <View style={[styles.fullnessBadge, { backgroundColor: urgencyBg }]}>
              <Text style={[styles.fullnessText, { color: urgencyColor }]}>
                {fullness ?? 'n/a'}%
              </Text>
            </View>
          </View>

          {/* Meta row */}
          <View style={styles.metaRow}>
            {temperature != null && (
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="thermometer" size={14} color={dark.muted} />
                <Text style={styles.metaText}>{temperature}°C</Text>
              </View>
            )}
            {wasteType ? (
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="trash-can-outline" size={14} color={dark.muted} />
                <Text style={styles.metaText}>{wasteType}</Text>
              </View>
            ) : null}
          </View>

          {/* Footer — last update */}
          <View style={styles.footer}>
            <PulsingDot freshness={freshness} />
            <Text style={styles.updatedText}>
              {formatRelativeTime(lastUpdate, t)}
            </Text>
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: dark.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: dark.border,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  stripe: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  binId: {
    ...typography.body,
    fontWeight: '700',
    color: dark.text,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  distanceBadge: {
    backgroundColor: 'rgba(13, 148, 136, 0.15)',
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '600',
    color: dark.teal,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  fullnessBadge: {
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
  },
  fullnessText: {
    fontSize: 12,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...typography.caption,
    color: dark.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  updatedText: {
    ...typography.caption,
    color: dark.muted,
  },
});
