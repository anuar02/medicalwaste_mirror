import React, { useMemo } from 'react';
import {
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInUp, FadeInRight, SlideInLeft } from 'react-native-reanimated';

import { useActiveCollection, useCollectionHistory } from '../../hooks/useCollections';
import { useHandoffs } from '../../hooks/useHandoffs';
import { useAuthStore } from '../../stores/authStore';
import { dark, spacing, typography } from '../../theme';
import { DriverTabParamList } from '../../types/navigation';
import { Handoff } from '../../types/models';
import { formatRelativeTime } from '../../utils/formatTime';

function formatDuration(startTime?: string) {
  if (!startTime) return '--';
  const start = new Date(startTime).getTime();
  if (Number.isNaN(start)) return '--';
  const diffMs = Date.now() - start;
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  if (hours > 0) {
    return `${hours}ч ${remMinutes}м`;
  }
  return `${remMinutes}м`;
}

function getGreetingKey(hour: number) {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

function getCompanyName(company: unknown, fallback: string) {
  if (!company) return fallback;
  if (typeof company === 'string') return company;
  if (typeof company === 'object' && company && 'name' in company) {
    const name = (company as { name?: string }).name;
    if (typeof name === 'string' && name.trim().length) return name;
  }
  return fallback;
}

function getSessionHandoffs(handoffs: Handoff[] | undefined, sessionId?: string, sessionMongoId?: string) {
  if (!handoffs || (!sessionId && !sessionMongoId)) return [];
  return handoffs.filter((handoff) => (
    handoff.session?.sessionId === sessionId || handoff.session?._id === sessionMongoId
  ));
}

export default function DriverHome() {
  const { t } = useTranslation();
  const navigation = useNavigation<BottomTabNavigationProp<DriverTabParamList>>();
  const { user } = useAuthStore();
  const { data: session } = useActiveCollection();
  const { data: history, isLoading: historyLoading, refetch: refetchHistory } = useCollectionHistory();
  const { data: handoffs, isFetching, refetch } = useHandoffs({ enabled: true });

  const sessionHandoffs = useMemo(
    () => getSessionHandoffs(handoffs, session?.sessionId, session?._id),
    [handoffs, session?.sessionId, session?._id],
  );

  const facilityPending = useMemo(() => (
    sessionHandoffs.filter((handoff) => (
      handoff.type === 'facility_to_driver' &&
      !['completed', 'disputed', 'resolved', 'expired'].includes(handoff.status)
    ))
  ), [sessionHandoffs]);

  const incinerationExists = sessionHandoffs.some((handoff) => handoff.type === 'driver_to_incinerator');
  const visitedCount = session?.selectedContainers?.filter((item) => item.visited).length ?? 0;
  const totalContainers = session?.selectedContainers?.length ?? 0;
  const canCreateIncineration =
    Boolean(session) &&
    facilityPending.length === 0 &&
    sessionHandoffs.some((handoff) => handoff.type === 'facility_to_driver') &&
    visitedCount > 0 &&
    !incinerationExists;

  const pendingActions = useMemo(() => {
    const items = facilityPending.map((handoff) => ({
      id: handoff._id,
      title: handoff.sender?.name ?? t('handoff.card.facilityFallback'),
      subtitle: t('driver.home.pendingConfirm'),
      meta: t('driver.home.pendingMeta', {
        containers: handoff.totalContainers ?? handoff.containers?.length ?? 0,
        weight: handoff.totalDeclaredWeight ?? 0,
      }),
    }));
    if (canCreateIncineration) {
      items.push({
        id: 'incineration',
        title: t('driver.home.pendingIncineration'),
        subtitle: t('driver.home.pendingCreate'),
        meta: t('driver.home.pendingMeta', {
          containers: visitedCount,
          weight: session?.selectedContainers?.reduce((sum, item) => sum + (item.collectedWeight ?? 0), 0) ?? 0,
        }),
      });
    }
    return items;
  }, [facilityPending, canCreateIncineration, t, visitedCount, session?.selectedContainers]);

  const todaySummary = useMemo(() => {
    const today = new Date();
    const isToday = (value?: string) => {
      if (!value) return false;
      const date = new Date(value);
      return date.toDateString() === today.toDateString();
    };
    const sessions = (history ?? []).filter((item) => isToday(item.endTime));
    const totalSessions = sessions.length;
    const totalContainersToday = sessions.reduce(
      (sum, item) => sum + (item.selectedContainers?.length ?? 0),
      0,
    );
    const totalWeightToday = sessions.reduce(
      (sum, item) => sum + (item.selectedContainers?.reduce((acc, container) => acc + (container.collectedWeight ?? 0), 0) ?? 0),
      0,
    );
    return { totalSessions, totalContainersToday, totalWeightToday };
  }, [history]);

  const notifications = useMemo(() => {
    const items: Array<{ id: string; icon: string; text: string; time?: string }> = [];
    (handoffs ?? []).forEach((handoff) => {
      if (handoff.type === 'facility_to_driver' && handoff.status === 'pending') {
        items.push({
          id: `pending-${handoff._id}`,
          icon: 'clipboard-text-outline',
          text: t('driver.home.notifyFacility', { name: handoff.sender?.name ?? t('handoff.card.facilityFallback') }),
          time: handoff.createdAt,
        });
      }
      if (handoff.type === 'driver_to_incinerator' && handoff.status === 'completed') {
        items.push({
          id: `completed-${handoff._id}`,
          icon: 'check-circle-outline',
          text: t('driver.home.notifyConfirmed'),
          time: handoff.completedAt ?? handoff.createdAt,
        });
      }
      if (handoff.status === 'disputed') {
        items.push({
          id: `disputed-${handoff._id}`,
          icon: 'alert-circle-outline',
          text: t('driver.home.notifyDisputed'),
          time: handoff.createdAt,
        });
      }
      if (handoff.status === 'expired') {
        items.push({
          id: `expired-${handoff._id}`,
          icon: 'clock-outline',
          text: t('driver.home.notifyExpired'),
          time: handoff.tokenExpiresAt ?? handoff.createdAt,
        });
      }
    });
    return items
      .sort((a, b) => (b.time ?? '').localeCompare(a.time ?? ''))
      .slice(0, 5);
  }, [handoffs, t]);

  const greetingKey = getGreetingKey(new Date().getHours());
  const greeting = t(`driver.home.greeting.${greetingKey}`);
  const name = user?.username || t('driver.home.driver');
  const company = getCompanyName(user?.company, t('driver.home.company'));

  const sessionNeedsAttention = pendingActions.length > 0 && Boolean(session);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={isFetching || historyLoading}
            onRefresh={() => {
              refetch();
              refetchHistory();
            }}
            tintColor={dark.teal}
          />
        }
      >
        {/* Ambient glow blobs */}
        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />

        <View style={styles.greetingRow}>
          <View>
            <Text style={styles.greeting}>{greeting} {name}</Text>
            <Text style={styles.subGreeting}>{t('driver.home.roleCompany', { role: t('roles.driver'), company })}</Text>
          </View>
        </View>

        <Animated.View
          entering={FadeInUp.springify()}
          style={[
            styles.sessionCard,
            sessionNeedsAttention ? styles.sessionCardWarning : null,
          ]}
        >
          {!session ? (
            <>
              <Text style={styles.sessionTitle}>{t('driver.home.noSession')}</Text>
              <TouchableOpacity
                style={styles.sessionButton}
                onPress={() => navigation.navigate('DriverSession', { initialTab: 'route' })}
              >
                <Text style={styles.sessionButtonText}>{t('driver.home.startSession')}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.sessionTitle}>
                {t('driver.home.sessionActive', { id: session.sessionId, time: formatDuration(session.startTime) })}
              </Text>
              <Text style={styles.sessionMeta}>
                {t('driver.home.sessionProgress', { visited: visitedCount, total: totalContainers })}
              </Text>
              <Text style={styles.sessionMeta}>
                {t('driver.home.sessionPending', { count: pendingActions.length })}
              </Text>
              <TouchableOpacity
                style={styles.sessionButton}
                onPress={() => navigation.navigate('DriverSession', { initialTab: 'route' })}
              >
                <Text style={styles.sessionButtonText}>{t('driver.home.continue')}</Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('driver.home.infographicsTitle')}</Text>
          <View style={styles.infographicCard}>
            <View style={styles.infographicHeader}>
              <Text style={styles.infographicTitle}>
                {session ? t('driver.home.infographicSession') : t('driver.home.infographicToday')}
              </Text>
              <Text style={styles.infographicValue}>
                {session ? `${visitedCount}/${totalContainers}` : todaySummary.totalContainersToday}
              </Text>
            </View>
            {session ? (
              <View style={styles.barGroup}>
                <View style={styles.barRow}>
                  <Text style={styles.barLabel}>{t('driver.home.infographicVisited')}</Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${totalContainers ? Math.round((visitedCount / totalContainers) * 100) : 0}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.barValue}>{visitedCount}</Text>
                </View>
                <View style={styles.barRow}>
                  <Text style={styles.barLabel}>{t('driver.home.infographicRemaining')}</Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFillMuted,
                        {
                          width: `${totalContainers ? Math.round(((totalContainers - visitedCount) / totalContainers) * 100) : 0}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.barValue}>{Math.max(0, totalContainers - visitedCount)}</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.infographicBody}>{t('driver.home.infographicEmpty')}</Text>
            )}
          </View>
        </View>

        {pendingActions.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('driver.home.pendingTitle')}</Text>
            {pendingActions.map((item, i) => (
              <Animated.View key={item.id} entering={SlideInLeft.delay(i * 100).springify()}>
                <TouchableOpacity
                  style={styles.pendingCard}
                  onPress={() => navigation.navigate('DriverSession', {
                    initialTab: 'handoffs',
                    focusHandoffId: item.id === 'incineration' ? undefined : item.id,
                  })}
                >
                  <View style={styles.pendingDot} />
                  <View style={styles.pendingContent}>
                    <Text style={styles.pendingTitle}>{item.title}</Text>
                    <Text style={styles.pendingSubtitle}>{item.subtitle}</Text>
                    <Text style={styles.pendingMeta}>{item.meta}</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={dark.muted} />
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('driver.home.todayTitle')}</Text>
          <View style={styles.statsRow}>
            {[
              { value: todaySummary.totalSessions, label: t('driver.home.statSessions') },
              { value: todaySummary.totalContainersToday, label: t('driver.home.statContainers') },
              { value: Math.round(todaySummary.totalWeightToday), label: t('driver.home.statWeight') },
            ].map((stat, i) => (
              <Animated.View
                key={stat.label}
                entering={FadeInUp.delay(i * 80).springify()}
                style={[styles.statPill, i === 2 && styles.statPillLast]}
              >
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </Animated.View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{t('driver.home.notificationsTitle')}</Text>
            <Text style={styles.sectionAction}>{t('driver.home.showAll')}</Text>
          </View>
          {notifications.length ? (
            notifications.map((note, i) => (
              <Animated.View key={note.id} entering={FadeInRight.delay(i * 60)} style={styles.notificationRow}>
                <MaterialCommunityIcons name={note.icon as never} size={18} color={dark.muted} />
                <View style={styles.notificationContent}>
                  <Text style={styles.notificationText}>{note.text}</Text>
                  <Text style={styles.notificationTime}>{formatRelativeTime(note.time, t)}</Text>
                </View>
              </Animated.View>
            ))
          ) : (
            <Text style={styles.emptyText}>{t('driver.home.noNotifications')}</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: dark.bg,
  },
  container: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  glowTop: {
    position: 'absolute',
    top: -80,
    left: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: dark.tealGlow,
    opacity: 0.5,
  },
  glowBottom: {
    position: 'absolute',
    bottom: -60,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    opacity: 0.5,
  },
  greetingRow: {
    marginBottom: spacing.lg,
  },
  greeting: {
    ...typography.title,
    color: dark.text,
  },
  subGreeting: {
    ...typography.caption,
    color: dark.textSecondary,
    marginTop: spacing.xs,
  },
  sessionCard: {
    backgroundColor: dark.surface,
    borderRadius: 20,
    padding: spacing.xl,
    borderWidth: 2,
    borderColor: dark.teal,
    marginBottom: spacing.xl,
    shadowColor: dark.teal,
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  sessionCardWarning: {
    borderColor: dark.amber,
    shadowColor: dark.amber,
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  sessionTitle: {
    ...typography.title,
    color: dark.text,
    marginBottom: spacing.md,
  },
  sessionMeta: {
    ...typography.caption,
    color: dark.textSecondary,
    marginBottom: spacing.xs,
  },
  sessionButton: {
    marginTop: spacing.md,
    backgroundColor: dark.teal,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    shadowColor: dark.teal,
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  sessionButtonText: {
    color: dark.text,
    fontWeight: '700',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.body,
    fontWeight: '700',
    color: dark.text,
    marginBottom: spacing.md,
  },
  sectionAction: {
    ...typography.caption,
    color: dark.muted,
  },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: dark.surface,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: dark.amberBorder,
    borderLeftWidth: 3,
    borderLeftColor: dark.amber,
    marginBottom: spacing.md,
  },
  pendingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: dark.amber,
    marginRight: spacing.md,
  },
  pendingContent: {
    flex: 1,
  },
  pendingTitle: {
    ...typography.body,
    fontWeight: '600',
    color: dark.text,
  },
  pendingSubtitle: {
    ...typography.caption,
    color: dark.amber,
  },
  pendingMeta: {
    ...typography.caption,
    color: dark.textSecondary,
    marginTop: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statPill: {
    flex: 1,
    backgroundColor: dark.surface,
    borderRadius: 14,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: dark.border,
    marginRight: spacing.sm,
    alignItems: 'center',
  },
  statPillLast: {
    marginRight: 0,
  },
  statValue: {
    ...typography.title,
    fontSize: 18,
    color: dark.teal,
  },
  statLabel: {
    ...typography.caption,
    color: dark.textSecondary,
    marginTop: spacing.xs,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  notificationContent: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  notificationText: {
    ...typography.body,
    color: dark.text,
  },
  notificationTime: {
    ...typography.caption,
    color: dark.muted,
    marginTop: spacing.xs,
  },
  infographicCard: {
    backgroundColor: dark.surface,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: dark.border,
  },
  infographicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  infographicTitle: {
    ...typography.body,
    fontWeight: '600',
    color: dark.text,
  },
  infographicValue: {
    ...typography.body,
    fontWeight: '700',
    color: dark.teal,
  },
  infographicBody: {
    ...typography.caption,
    color: dark.textSecondary,
  },
  barGroup: {
    marginTop: spacing.sm,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  barLabel: {
    ...typography.caption,
    color: dark.textSecondary,
    width: 90,
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: dark.barTrack,
    borderRadius: 999,
    marginHorizontal: spacing.sm,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: dark.teal,
    borderRadius: 999,
  },
  barFillMuted: {
    height: '100%',
    backgroundColor: dark.muted,
    borderRadius: 999,
  },
  barValue: {
    ...typography.caption,
    color: dark.text,
    width: 32,
    textAlign: 'right',
  },
  emptyText: {
    ...typography.caption,
    color: dark.textSecondary,
  },
});
