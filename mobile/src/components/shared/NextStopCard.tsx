import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Animated, { SlideInUp } from 'react-native-reanimated';

import { dark, spacing, typography } from '../../theme';
import { getUrgencyColor } from '../../utils/urgency';
import AnimatedProgressBar from './AnimatedProgressBar';

interface NextStopCardProps {
  binId?: string;
  fullness?: number;
  distanceText?: string;
  durationText?: string;
  onNavigate: () => void;
  onMarkVisited: () => void;
}

export default function NextStopCard({
  binId,
  fullness,
  distanceText,
  durationText,
  onNavigate,
  onMarkVisited,
}: NextStopCardProps) {
  const { t } = useTranslation();
  const urgencyColor = getUrgencyColor(fullness);

  return (
    <Animated.View entering={SlideInUp.springify()} style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.label}>{t('driver.route.nextStop')}</Text>
          <Text style={styles.binId}>{binId ?? t('driver.route.container')}</Text>
        </View>
        {(distanceText || durationText) && (
          <View style={styles.metaBadge}>
            <Text style={styles.metaText}>
              {[distanceText, durationText].filter(Boolean).join(' · ')}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.barRow}>
        <AnimatedProgressBar fullness={fullness ?? 0} color={urgencyColor} height={6} />
        <Text style={[styles.barValue, { color: urgencyColor }]}>{fullness ?? 0}%</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.navButton} onPress={onNavigate}>
          <MaterialCommunityIcons name="navigation-variant" size={16} color={dark.text} />
          <Text style={styles.navButtonText}>{t('driver.containerDetail.navigate')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.visitButton} onPress={onMarkVisited}>
          <MaterialCommunityIcons name="check-circle-outline" size={16} color={dark.teal} />
          <Text style={styles.visitButtonText}>{t('driver.route.markVisited')}</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    backgroundColor: dark.surface,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: dark.border,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.caption,
    color: dark.muted,
    textTransform: 'uppercase',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  binId: {
    ...typography.body,
    fontWeight: '700',
    color: dark.text,
  },
  metaBadge: {
    backgroundColor: 'rgba(13, 148, 136, 0.15)',
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
    color: dark.teal,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  barValue: {
    fontSize: 12,
    fontWeight: '700',
    width: 36,
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dark.teal,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  navButtonText: {
    color: dark.text,
    fontWeight: '600',
    fontSize: 13,
  },
  visitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(13, 148, 136, 0.15)',
    borderRadius: 10,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  visitButtonText: {
    color: dark.teal,
    fontWeight: '600',
    fontSize: 13,
  },
});
