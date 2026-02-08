import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useCollectionHistory } from '../../hooks/useCollections';
import { useHandoffs } from '../../hooks/useHandoffs';
import { dark, spacing, typography } from '../../theme';
import { DriverHistoryStackParamList } from '../../types/navigation';
import { CollectionSession, Handoff } from '../../types/models';

function formatSessionDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatDuration(start?: string, end?: string): string | null {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms <= 0 || isNaN(ms)) return null;
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function DriverHistoryScreen() {
  const { t } = useTranslation();
  const { data, isLoading, isFetching, refetch } = useCollectionHistory();
  const { data: handoffs } = useHandoffs({ enabled: true });
  const navigation = useNavigation<NativeStackNavigationProp<DriverHistoryStackParamList>>();

  const getSessionHandoffs = useCallback(
    (session: CollectionSession): Handoff[] =>
      (handoffs ?? [])
        .filter((h) => h.session?._id === session._id || h.session?.sessionId === session.sessionId)
        .sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? '')),
    [handoffs],
  );

  const renderItem = useCallback(
    ({ item: session, index }: { item: CollectionSession; index: number }) => {
      const sHandoffs = getSessionHandoffs(session);
      const hasDispute = sHandoffs.some((h) => h.status === 'disputed');

      const statusKey = hasDispute ? 'disputed' : session.status;
      const chipLabel = hasDispute
        ? t('driver.history.statusDisputed')
        : session.status === 'completed'
          ? t('driver.history.statusCompleted')
          : t('driver.history.statusActive');

      const chipBg =
        statusKey === 'disputed'
          ? styles.chipDanger
          : statusKey === 'completed'
            ? styles.chipSuccess
            : styles.chipNeutral;
      const chipTextColor =
        statusKey === 'disputed'
          ? dark.dangerText
          : statusKey === 'completed'
            ? dark.successText
            : dark.text;

      const containerCount = session.selectedContainers?.length ?? 0;
      const duration = formatDuration(session.startTime, session.endTime);

      return (
        <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('DriverSessionTimeline', { sessionId: session.sessionId })}
          >
            {/* Header: ID + status chip */}
            <View style={styles.cardHeader}>
              <Text style={styles.sessionId} numberOfLines={1}>
                #{session.sessionId}
              </Text>
              <View style={[styles.chip, chipBg]}>
                <Text style={[styles.chipText, { color: chipTextColor }]}>{chipLabel}</Text>
              </View>
            </View>

            {/* Meta: date · duration · containers */}
            <View style={styles.metaRow}>
              <Text style={styles.dateText}>{formatSessionDate(session.startTime)}</Text>
              {duration && (
                <>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={styles.durationText}>{duration}</Text>
                </>
              )}
              {containerCount > 0 && (
                <>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={styles.containerCount}>
                    {t('driver.history.containers', { count: containerCount })}
                  </Text>
                </>
              )}
            </View>

            {/* Handoff previews */}
            {sHandoffs.length > 0 && (
              <View style={styles.previews}>
                {sHandoffs.slice(0, 3).map((handoff) => {
                  const isCompleted = handoff.status === 'completed';
                  const isDisputed = handoff.status === 'disputed';
                  return (
                    <View key={handoff._id} style={styles.previewRow}>
                      <View
                        style={[
                          styles.previewDot,
                          isDisputed
                            ? styles.dotDanger
                            : isCompleted
                              ? styles.dotSuccess
                              : styles.dotNeutral,
                        ]}
                      />
                      <Text style={styles.previewText} numberOfLines={1}>
                        {handoff.type === 'facility_to_driver'
                          ? t('driver.history.previewFacility', {
                              name: handoff.sender?.name ?? t('handoff.card.facilityFallback'),
                            })
                          : t('driver.history.previewIncineration')}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      );
    },
    [getSessionHandoffs, navigation, t],
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator color={dark.teal} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={dark.teal} />
        }
        ListHeaderComponent={<Text style={styles.title}>{t('driver.history.title')}</Text>}
        renderItem={renderItem}
        ListEmptyComponent={
          <Animated.View entering={FadeInDown} style={styles.emptyCard}>
            <Text style={styles.emptyText}>{t('driver.history.empty')}</Text>
          </Animated.View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: dark.bg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  title: {
    ...typography.title,
    color: dark.text,
    marginBottom: spacing.lg,
  },
  /* Card */
  card: {
    backgroundColor: dark.surface,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: dark.border,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionId: {
    ...typography.body,
    fontWeight: '700',
    color: dark.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 999,
  },
  chipSuccess: {
    backgroundColor: dark.success,
  },
  chipDanger: {
    backgroundColor: dark.danger,
  },
  chipNeutral: {
    backgroundColor: 'rgba(100, 116, 139, 0.2)',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  /* Meta row */
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  dateText: {
    ...typography.caption,
    color: dark.textSecondary,
  },
  metaDot: {
    ...typography.caption,
    color: dark.muted,
    marginHorizontal: 6,
  },
  durationText: {
    ...typography.caption,
    color: dark.teal,
    fontWeight: '600',
  },
  containerCount: {
    ...typography.caption,
    color: dark.muted,
  },
  /* Handoff previews */
  previews: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: dark.border,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  previewDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.sm,
  },
  dotSuccess: {
    backgroundColor: dark.successText,
  },
  dotDanger: {
    backgroundColor: dark.dangerText,
  },
  dotNeutral: {
    backgroundColor: dark.muted,
  },
  previewText: {
    ...typography.caption,
    color: dark.textSecondary,
    flex: 1,
  },
  /* Empty */
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    ...typography.body,
    color: dark.textSecondary,
  },
});
