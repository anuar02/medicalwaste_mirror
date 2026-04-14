import React, { useCallback, useMemo } from 'react';
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
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useCollectionHistory } from '../../hooks/useCollections';
import { useHandoffs } from '../../hooks/useHandoffs';
import { dark, elevation, spacing, typography } from '../../theme';
import { DriverHistoryStackParamList } from '../../types/navigation';
import { CollectionSession, Handoff } from '../../types/models';
import Card from '../../components/shared/Card';
import Chip from '../../components/shared/Chip';
import EmptyState from '../../components/shared/EmptyState';
import SectionHeader from '../../components/shared/SectionHeader';
import StatTile from '../../components/shared/StatTile';

function formatSessionDate(iso?: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatDuration(start?: string, end?: string): string | null {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms <= 0 || Number.isNaN(ms)) return null;
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 60) return `${totalMin}m`;
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

function formatSessionTime(iso?: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DriverHistoryScreen() {
  const { t } = useTranslation();
  const { data, isLoading, isFetching, refetch } = useCollectionHistory();
  const { data: handoffs } = useHandoffs({ enabled: true });
  const navigation =
    useNavigation<NativeStackNavigationProp<DriverHistoryStackParamList>>();

  const sessions = data ?? [];

  const getSessionHandoffs = useCallback(
    (session: CollectionSession): Handoff[] =>
      (handoffs ?? [])
        .filter(
          (handoff) =>
            handoff.session?._id === session._id ||
            handoff.session?.sessionId === session.sessionId,
        )
        .sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? '')),
    [handoffs],
  );

  const summary = useMemo(() => {
    return sessions.reduce(
      (acc, session) => {
        const sessionHandoffs = getSessionHandoffs(session);
        const sessionWeight =
          session.totalWeightCollected ??
          session.selectedContainers?.reduce(
            (sum, container) => sum + (container.collectedWeight ?? 0),
            0,
          ) ??
          0;
        acc.sessions += 1;
        acc.containers += session.selectedContainers?.length ?? 0;
        acc.weight += sessionWeight;
        if (sessionHandoffs.some((handoff) => handoff.status === 'disputed')) {
          acc.disputes += 1;
        }
        return acc;
      },
      { sessions: 0, containers: 0, weight: 0, disputes: 0 },
    );
  }, [getSessionHandoffs, sessions]);

  const renderItem = useCallback(
    ({ item: session, index }: { item: CollectionSession; index: number }) => {
      const sessionHandoffs = getSessionHandoffs(session);
      const hasDispute = sessionHandoffs.some(
        (handoff) => handoff.status === 'disputed',
      );
      const isCompleted = session.status === 'completed' && !hasDispute;
      const duration = formatDuration(session.startTime, session.endTime);
      const containerCount = session.selectedContainers?.length ?? 0;
      const weightCollected =
        session.totalWeightCollected ??
        session.selectedContainers?.reduce(
          (sum, container) => sum + (container.collectedWeight ?? 0),
          0,
        ) ??
        0;
      const distance = session.totalDistance;
      const visitedCount =
        session.containersCollected ??
        session.selectedContainers?.filter((container) => container.visited)
          .length ??
        0;
      const timePerBin =
        session.totalDuration && visitedCount > 0
          ? Math.round(session.totalDuration / visitedCount)
          : null;

      return (
        <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={!session.sessionId}
            onPress={() => {
              if (!session.sessionId) return;
              navigation.navigate('DriverSessionTimeline', {
                sessionId: session.sessionId,
              });
            }}
          >
            <Card variant="elevated" padding="lg" style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.cardTitleWrap}>
                  <Text style={styles.sessionId} numberOfLines={1}>
                    {t('driver.history.sessionLabel')}
                  </Text>
                  <Text style={styles.sessionDate}>
                    {formatSessionDate(session.startTime)} · {formatSessionTime(session.startTime)}
                  </Text>
                </View>
                <Chip
                  label={
                    hasDispute
                      ? t('driver.history.statusDisputed')
                      : isCompleted
                        ? t('driver.history.statusCompleted')
                        : t('driver.history.statusActive')
                  }
                  tone={
                    hasDispute
                      ? 'danger'
                      : isCompleted
                        ? 'success'
                        : 'neutral'
                  }
                  icon={
                    hasDispute
                      ? 'alert-circle-outline'
                      : isCompleted
                        ? 'check-circle-outline'
                        : 'clock-outline'
                  }
                />
              </View>

              <View style={styles.metaRow}>
                {duration ? (
                  <View style={styles.metaItem}>
                    <MaterialCommunityIcons
                      name="timer-outline"
                      size={14}
                      color={dark.muted}
                    />
                    <Text style={styles.metaText}>{duration}</Text>
                  </View>
                ) : null}
                <View style={styles.metaItem}>
                  <MaterialCommunityIcons
                    name="trash-can-outline"
                    size={14}
                    color={dark.muted}
                  />
                  <Text style={styles.metaText}>
                    {t('driver.history.containers', { count: containerCount })}
                  </Text>
                </View>
              </View>

              <View style={styles.metricRow}>
                <Chip
                  label={t('driver.history.weightTotal', {
                    value: weightCollected.toFixed(1),
                  })}
                  tone="teal"
                  icon="scale-bathroom"
                />
                {distance != null && distance > 0 ? (
                  <Chip
                    label={t('driver.history.kmDriven', {
                      value: distance.toFixed(1),
                    })}
                    tone="info"
                    icon="map-marker-distance"
                  />
                ) : null}
                {timePerBin != null ? (
                  <Chip
                    label={t('driver.history.timePerBin', { value: timePerBin })}
                    tone="neutral"
                    icon="timer-sand"
                  />
                ) : null}
              </View>

              {sessionHandoffs.length ? (
                <View style={styles.previewWrap}>
                  <SectionHeader
                    title={t('driver.home.notificationsTitle')}
                    style={styles.previewHeader}
                  />
                  {sessionHandoffs.slice(0, 3).map((handoff, handoffIndex) => {
                    const tone =
                      handoff.status === 'disputed'
                        ? 'danger'
                        : handoff.status === 'completed'
                          ? 'success'
                          : 'warning';
                    return (
                      <View
                        key={handoff._id}
                        style={[
                          styles.previewRow,
                          handoffIndex < sessionHandoffs.slice(0, 3).length - 1 &&
                            styles.previewDivider,
                        ]}
                      >
                        <View style={styles.previewDotWrap}>
                          <Chip
                            label={
                              handoff.type === 'facility_to_driver'
                                ? t('driver.history.previewFacility', {
                                    name:
                                      handoff.sender?.name ??
                                      t('handoff.card.facilityFallback'),
                                  })
                                : t('driver.history.previewIncineration')
                            }
                            tone={tone}
                            icon={
                              handoff.type === 'facility_to_driver'
                                ? 'warehouse'
                                : 'fire'
                            }
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </Card>
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
        data={sessions}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={dark.teal} />
        }
        ListHeaderComponent={
          <>
            <Animated.View entering={FadeInDown.springify()}>
              <Text style={styles.title}>{t('driver.history.title')}</Text>
              <Text style={styles.subtitle}>
                {sessions.length
                  ? t('driver.history.containers', {
                      count: summary.containers,
                    })
                  : t('driver.history.empty')}
              </Text>
            </Animated.View>

            <Animated.View entering={FadeIn.delay(80)} style={styles.statsRow}>
              <StatTile
                label={t('driver.history.title')}
                value={summary.sessions}
                icon="clipboard-text-clock-outline"
                tone="teal"
                style={styles.statTile}
              />
              <StatTile
                label={t('driver.home.statWeight')}
                value={Math.round(summary.weight)}
                unit="kg"
                icon="scale-bathroom"
                style={styles.statTile}
              />
              <StatTile
                label={t('driver.history.statusDisputed')}
                value={summary.disputes}
                icon="alert-circle-outline"
                style={styles.statTile}
              />
            </Animated.View>

            <SectionHeader title={t('driver.history.title')} />
          </>
        }
        renderItem={renderItem}
        ListEmptyComponent={
          <Animated.View entering={FadeIn} style={styles.emptyWrap}>
            <Card variant="outlined" padding="none">
              <EmptyState
                icon="history"
                title={t('driver.history.empty')}
                body={t('handoff.emptyState.body')}
              />
            </Card>
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
    ...typography.heading,
    color: dark.text,
  },
  subtitle: {
    ...typography.body,
    color: dark.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statTile: {
    minHeight: 128,
  },
  card: {
    marginBottom: spacing.md,
    ...elevation.sm,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardTitleWrap: {
    flex: 1,
    gap: 2,
  },
  sessionId: {
    ...typography.title,
    color: dark.text,
  },
  sessionDate: {
    ...typography.caption,
    color: dark.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    ...typography.caption,
    color: dark.textSecondary,
  },
  metricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  previewWrap: {
    marginTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: dark.divider,
    paddingTop: spacing.md,
  },
  previewHeader: {
    marginBottom: spacing.sm,
    paddingHorizontal: 0,
  },
  previewRow: {
    paddingVertical: spacing.xs,
  },
  previewDivider: {
    borderBottomWidth: 1,
    borderBottomColor: dark.divider,
  },
  previewDotWrap: {
    alignSelf: 'flex-start',
  },
  emptyWrap: {
    marginTop: spacing.lg,
  },
});
