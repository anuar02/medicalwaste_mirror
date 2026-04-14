import React, { useMemo } from 'react';
import * as Location from 'expo-location';
import {
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInUp, SlideInLeft } from 'react-native-reanimated';

import {
  useActiveCollection,
  useCollectionHistory,
  useStartCollection,
} from '../../hooks/useCollections';
import { useHandoffs } from '../../hooks/useHandoffs';
import { useAuthStore } from '../../stores/authStore';
import { dark, elevation, radius, spacing, typography } from '../../theme';
import { DriverTabParamList } from '../../types/navigation';
import { Handoff } from '../../types/models';
import { formatRelativeTime } from '../../utils/formatTime';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import SectionHeader from '../../components/shared/SectionHeader';
import StatTile from '../../components/shared/StatTile';
import ListItem from '../../components/shared/ListItem';
import EmptyState from '../../components/shared/EmptyState';
import Chip from '../../components/shared/Chip';

function formatDuration(startTime?: string) {
  if (!startTime) return '--';
  const start = new Date(startTime).getTime();
  if (Number.isNaN(start)) return '--';
  const minutes = Math.max(0, Math.floor((Date.now() - start) / 60000));
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return hours > 0 ? `${hours}ч ${rem}м` : `${rem}м`;
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

function getSessionHandoffs(
  handoffs: Handoff[] | undefined,
  sessionId?: string,
  sessionMongoId?: string,
) {
  if (!handoffs || (!sessionId && !sessionMongoId)) return [];
  return handoffs.filter(
    (h) =>
      h.session?.sessionId === sessionId || h.session?._id === sessionMongoId,
  );
}

export default function DriverHome() {
  const { t } = useTranslation();
  const navigation =
    useNavigation<BottomTabNavigationProp<DriverTabParamList>>();
  const { user } = useAuthStore();
  const { data: session } = useActiveCollection();
  const {
    data: history,
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useCollectionHistory();
  const {
    data: handoffs,
    isFetching,
    refetch,
    error: handoffsError,
  } = useHandoffs({ enabled: true });
  const startMutation = useStartCollection();

  const currentUserId = String((user as any)?._id || (user as any)?.id || '');

  const pendingHandoffs = useMemo(() => {
    if (session) return [];
    const openStatuses = new Set([
      'created',
      'pending',
      'confirmedBySender',
      'confirmed_by_sender',
    ]);
    return (handoffs ?? []).filter((h) => {
      if (h.type !== 'facility_to_driver') return false;
      if (!openStatuses.has(String(h.status))) return false;
      const receiver: any = h.receiver?.user;
      const receiverId = String(
        receiver?._id || receiver?.id || receiver || '',
      );
      if (!receiverId || !currentUserId) return true;
      return receiverId === currentUserId;
    });
  }, [session, handoffs, currentUserId]);

  const handleStartFromHandoff = async () => {
    if (session || startMutation.isPending) return;
    let startLocation:
      | { type: 'Point'; coordinates: [number, number] }
      | undefined;
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status === 'granted') {
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        startLocation = {
          type: 'Point',
          coordinates: [position.coords.longitude, position.coords.latitude],
        };
      }
    } catch {
      // backend accepts sessions without a start location
    }
    startMutation.mutate({ startLocation });
  };

  const sessionHandoffs = useMemo(
    () => getSessionHandoffs(handoffs, session?.sessionId, session?._id),
    [handoffs, session?.sessionId, session?._id],
  );

  const facilityPending = useMemo(
    () =>
      sessionHandoffs.filter(
        (h) =>
          h.type === 'facility_to_driver' &&
          !['completed', 'disputed', 'resolved', 'expired'].includes(h.status),
      ),
    [sessionHandoffs],
  );

  const incinerationExists = sessionHandoffs.some(
    (h) => h.type === 'driver_to_incinerator',
  );
  const visitedCount =
    session?.selectedContainers?.filter((i) => i.visited).length ?? 0;
  const totalContainers = session?.selectedContainers?.length ?? 0;
  const canCreateIncineration =
    Boolean(session) &&
    facilityPending.length === 0 &&
    sessionHandoffs.some((h) => h.type === 'facility_to_driver') &&
    visitedCount > 0 &&
    !incinerationExists;

  const pendingActions = useMemo(() => {
    const items = facilityPending.map((h) => ({
      id: h._id,
      title: h.sender?.name ?? t('handoff.card.facilityFallback'),
      subtitle: t('driver.home.pendingConfirm'),
      meta: t('driver.home.pendingMeta', {
        containers: h.totalContainers ?? h.containers?.length ?? 0,
        weight: h.totalDeclaredWeight ?? 0,
      }),
    }));
    if (canCreateIncineration) {
      items.push({
        id: 'incineration',
        title: t('driver.home.pendingIncineration'),
        subtitle: t('driver.home.pendingCreate'),
        meta: t('driver.home.pendingMeta', {
          containers: visitedCount,
          weight:
            session?.selectedContainers?.reduce(
              (s, i) => s + (i.collectedWeight ?? 0),
              0,
            ) ?? 0,
        }),
      });
    }
    return items;
  }, [
    facilityPending,
    canCreateIncineration,
    t,
    visitedCount,
    session?.selectedContainers,
  ]);

  const todaySummary = useMemo(() => {
    const today = new Date();
    const isToday = (v?: string) =>
      v ? new Date(v).toDateString() === today.toDateString() : false;
    const sessions = (history ?? []).filter((i) => isToday(i.endTime));
    return {
      totalSessions: sessions.length,
      totalContainersToday: sessions.reduce(
        (s, i) => s + (i.selectedContainers?.length ?? 0),
        0,
      ),
      totalWeightToday: sessions.reduce(
        (s, i) =>
          s +
          (i.selectedContainers?.reduce(
            (a, c) => a + (c.collectedWeight ?? 0),
            0,
          ) ?? 0),
        0,
      ),
    };
  }, [history]);

  const notifications = useMemo(() => {
    const items: Array<{
      id: string;
      icon: string;
      text: string;
      time?: string;
    }> = [];
    (handoffs ?? []).forEach((h) => {
      if (h.type === 'facility_to_driver' && h.status === 'pending') {
        items.push({
          id: `pending-${h._id}`,
          icon: 'clipboard-text-outline',
          text: t('driver.home.notifyFacility', {
            name: h.sender?.name ?? t('handoff.card.facilityFallback'),
          }),
          time: h.createdAt,
        });
      }
      if (h.type === 'driver_to_incinerator' && h.status === 'completed') {
        items.push({
          id: `completed-${h._id}`,
          icon: 'check-circle-outline',
          text: t('driver.home.notifyConfirmed'),
          time: h.completedAt ?? h.createdAt,
        });
      }
      if (h.status === 'disputed') {
        items.push({
          id: `disputed-${h._id}`,
          icon: 'alert-circle-outline',
          text: t('driver.home.notifyDisputed'),
          time: h.createdAt,
        });
      }
      if (h.status === 'expired') {
        items.push({
          id: `expired-${h._id}`,
          icon: 'clock-outline',
          text: t('driver.home.notifyExpired'),
          time: h.tokenExpiresAt ?? h.createdAt,
        });
      }
    });
    return items
      .sort((a, b) => (b.time ?? '').localeCompare(a.time ?? ''))
      .slice(0, 5);
  }, [handoffs, t]);

  const greeting = t(`driver.home.greeting.${getGreetingKey(new Date().getHours())}`);
  const name = user?.firstName || t('driver.home.driver');
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
        <View style={styles.greetingRow}>
          <Text style={styles.greeting}>
            {greeting}, {name}!
          </Text>
          <Text style={styles.subGreeting}>
            {t('driver.home.roleCompany', {
              role: t('roles.driver'),
              company,
            })}
          </Text>
        </View>

        <Animated.View entering={FadeInUp.springify()}>
          <Card
            variant="elevated"
            style={
              sessionNeedsAttention
                ? [styles.sessionCard, styles.sessionCardWarning]
                : styles.sessionCard
            }
          >
            {!session ? (
              <>
                <Text style={styles.sessionTitle}>
                  {t('driver.route.waitingTitle')}
                </Text>
                <Text style={styles.sessionMeta}>
                  {t('driver.route.waitingBody')}
                </Text>

                <View style={styles.waitingStatusRow}>
                  <Chip
                    label={
                      isFetching
                        ? t('common.loading')
                        : t('driver.route.waitingTitle')
                    }
                    tone="neutral"
                    icon={isFetching ? 'sync' : 'clock-outline'}
                  />
                  {pendingHandoffs.length > 0 ? (
                    <Chip
                      label={t('driver.home.sessionPending', {
                        count: pendingHandoffs.length,
                      })}
                      tone="warning"
                      icon="clipboard-alert-outline"
                    />
                  ) : null}
                </View>

                {handoffsError ? (
                  <Text style={styles.errorText}>
                    {String((handoffsError as Error)?.message ?? handoffsError)}
                  </Text>
                ) : null}

                {pendingHandoffs.length > 0 ? (
                  <View style={styles.handoffList}>
                    {pendingHandoffs.map((h) => {
                      const count =
                        h.totalContainers ?? h.containers?.length ?? 0;
                      const weight = h.totalDeclaredWeight ?? 0;
                      const senderName =
                        h.sender?.name || h.sender?.user?.username || '—';
                      return (
                        <View key={h._id} style={styles.handoffCard}>
                          <View style={styles.handoffContent}>
                            <Text style={styles.handoffTitle}>
                              {h.handoffId || '#'}
                            </Text>
                            <Text style={styles.handoffMeta}>
                              {senderName} · {count} конт. · {weight} кг
                            </Text>
                          </View>
                          <Button
                            label={t('driver.route.startSession')}
                            size="sm"
                            loading={startMutation.isPending}
                            onPress={handleStartFromHandoff}
                          />
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </>
            ) : (
              <>
                <View style={styles.sessionHeader}>
                  <Text style={styles.sessionTitle}>
                    {t('driver.home.sessionActive', {
                      time: formatDuration(session.startTime),
                    })}
                  </Text>
                  <Chip
                    label={
                      sessionNeedsAttention
                        ? t('driver.home.sessionPending', {
                            count: pendingActions.length,
                          })
                        : t('driver.route.statusValue.active')
                    }
                    tone={sessionNeedsAttention ? 'warning' : 'success'}
                    icon={
                      sessionNeedsAttention
                        ? 'clipboard-alert-outline'
                        : 'check-circle-outline'
                    }
                  />
                </View>
                <Text style={styles.sessionMeta}>
                  {t('driver.home.sessionProgress', {
                    visited: visitedCount,
                    total: totalContainers,
                  })}
                </Text>
                <Button
                  label={t('driver.home.continue')}
                  onPress={() =>
                    navigation.navigate('DriverSession', {
                      initialTab: 'route',
                    })
                  }
                  icon="arrow-right"
                  iconPosition="right"
                  style={styles.sessionButton}
                  fullWidth
                />
              </>
            )}
          </Card>
        </Animated.View>

        <View style={styles.section}>
          <SectionHeader title={t('driver.home.todayTitle')} />
          <View style={styles.statsRow}>
            <StatTile
              label={t('driver.home.statSessions')}
              value={todaySummary.totalSessions}
              icon="playlist-check"
              tone="teal"
            />
            <StatTile
              label={t('driver.home.statContainers')}
              value={todaySummary.totalContainersToday}
              icon="package-variant"
            />
            <StatTile
              label={t('driver.home.statWeight')}
              value={Math.round(todaySummary.totalWeightToday)}
              unit="кг"
              icon="weight-kilogram"
            />
          </View>
        </View>

        {pendingActions.length ? (
          <View style={styles.section}>
            <SectionHeader title={t('driver.home.pendingTitle')} />
            <View style={styles.pendingList}>
              {pendingActions.map((item, i) => (
                <Animated.View
                  key={item.id}
                  entering={SlideInLeft.delay(i * 80).springify()}
                >
                  <ListItem
                    title={item.title}
                    subtitle={item.subtitle}
                    meta={item.meta}
                    leadingIcon="clipboard-alert-outline"
                    leadingIconColor={dark.warning}
                    showChevron
                    onPress={() =>
                      navigation.navigate('DriverSession', {
                        initialTab: 'handoffs',
                        focusHandoffId:
                          item.id === 'incineration' ? undefined : item.id,
                      })
                    }
                  />
                </Animated.View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <SectionHeader title={t('driver.home.notificationsTitle')} />
          {notifications.length ? (
            <Card variant="outlined" padding="md">
              {notifications.map((note, i) => (
                <View
                  key={note.id}
                  style={[
                    styles.notificationRow,
                    i < notifications.length - 1 && styles.notificationDivider,
                  ]}
                >
                  <ListItem
                    title={note.text}
                    subtitle={formatRelativeTime(note.time, t)}
                    leadingIcon={note.icon as never}
                    leadingIconColor={dark.muted}
                    style={styles.notificationItem}
                  />
                </View>
              ))}
            </Card>
          ) : (
            <EmptyState
              icon="bell-outline"
              title={t('driver.home.noNotifications')}
            />
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
  greetingRow: {
    marginBottom: spacing.lg,
  },
  greeting: {
    ...typography.heading,
    color: dark.text,
  },
  subGreeting: {
    ...typography.body,
    color: dark.textSecondary,
    marginTop: spacing.xs,
  },
  sessionCard: {
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: dark.tealBorder,
    ...elevation.md,
  },
  sessionCardWarning: {
    borderColor: dark.warningBorder,
    backgroundColor: dark.warningBg,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sessionTitle: {
    ...typography.title,
    color: dark.text,
    flex: 1,
  },
  sessionMeta: {
    ...typography.body,
    color: dark.textSecondary,
    marginBottom: spacing.xs,
  },
  sessionButton: {
    marginTop: spacing.md,
  },
  waitingStatusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  errorText: {
    ...typography.caption,
    color: dark.dangerText,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  handoffList: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  handoffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: dark.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: dark.border,
  },
  handoffContent: {
    flex: 1,
  },
  handoffTitle: {
    ...typography.bodyStrong,
    color: dark.text,
  },
  handoffMeta: {
    ...typography.caption,
    color: dark.textSecondary,
    marginTop: 2,
  },
  section: {
    marginBottom: spacing.xl,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pendingList: {
    gap: spacing.sm,
  },
  notificationRow: {
    paddingHorizontal: 0,
  },
  notificationDivider: {
    borderBottomWidth: 1,
    borderBottomColor: dark.divider,
  },
  notificationItem: {
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
  },
});
