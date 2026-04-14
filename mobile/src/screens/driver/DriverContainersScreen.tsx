import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import Animated, {
  FadeIn,
  FadeInDown,
  LinearTransition,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useActiveCollection } from '../../hooks/useCollections';
import { useWasteBins } from '../../hooks/useWasteBins';
import {
  dark,
  elevation,
  radius,
  spacing,
  typography,
} from '../../theme';
import { DriverContainersStackParamList } from '../../types/navigation';
import { formatRelativeTime } from '../../utils/formatTime';
import Card from '../../components/shared/Card';
import Chip from '../../components/shared/Chip';
import ContainerCard from '../../components/shared/ContainerCard';
import EmptyState from '../../components/shared/EmptyState';
import SectionHeader from '../../components/shared/SectionHeader';
import StatTile from '../../components/shared/StatTile';

type SortMode = 'urgency' | 'name';

export default function DriverContainersScreen() {
  const { t } = useTranslation();
  const { data, isLoading, isFetching, refetch, dataUpdatedAt } =
    useActiveCollection();
  const {
    data: bins,
    isLoading: binsLoading,
    isFetching: binsFetching,
    refetch: refetchBins,
    dataUpdatedAt: binsUpdatedAt,
  } = useWasteBins();
  const navigation =
    useNavigation<NativeStackNavigationProp<DriverContainersStackParamList>>();
  const [sortMode, setSortMode] = useState<SortMode>('urgency');

  const sortFn = useCallback(
    (
      a: { fullness?: number; binId?: string },
      b: { fullness?: number; binId?: string },
    ) => {
      if (sortMode === 'name') {
        return (a.binId ?? '').localeCompare(b.binId ?? '');
      }
      return (b.fullness ?? 0) - (a.fullness ?? 0);
    },
    [sortMode],
  );

  const sortedSessionContainers = useMemo(() => {
    if (!data?.selectedContainers?.length) return [];
    const validEntries = data.selectedContainers.filter(
      (entry) =>
        Boolean(
          entry?.container &&
            typeof entry.container._id === 'string' &&
            entry.container._id.length > 0,
        ),
    );
    return [...validEntries].sort((a, b) => sortFn(a.container, b.container));
  }, [data?.selectedContainers, sortFn]);

  const sortedBins = useMemo(() => {
    if (!bins?.length) return [];
    return [...bins].sort(sortFn);
  }, [bins, sortFn]);

  const listData = useMemo(
    () => [
      ...sortedSessionContainers.map((entry) => ({
        _type: 'session' as const,
        ...entry,
      })),
      ...sortedBins.map((bin) => ({ _type: 'bin' as const, ...bin })),
    ],
    [sortedBins, sortedSessionContainers],
  );

  const visitedCount = sortedSessionContainers.filter((entry) => entry.visited)
    .length;
  const totalCount = sortedSessionContainers.length;
  const criticalCount =
    sortedSessionContainers.filter(
      (entry) => (entry.container.fullness ?? 0) >= 85,
    ).length + sortedBins.filter((bin) => (bin.fullness ?? 0) >= 85).length;
  const lastUpdate = dataUpdatedAt || binsUpdatedAt;
  const lastUpdateText = lastUpdate
    ? formatRelativeTime(new Date(lastUpdate).toISOString(), t)
    : null;

  if (isLoading && binsLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator color={dark.teal} />
        </View>
      </SafeAreaView>
    );
  }

  const renderSessionItem = ({
    item: entry,
    index,
  }: {
    item: (typeof sortedSessionContainers)[0];
    index: number;
  }) => (
    <ContainerCard
      binId={entry.container.binId}
      fullness={entry.container.fullness}
      temperature={entry.container.temperature}
      wasteType={entry.container.wasteType}
      lastUpdate={entry.container.lastUpdate}
      visited={entry.visited}
      index={index}
      onPress={() =>
        navigation.navigate('DriverContainerDetail', {
          containerId: entry.container._id,
        })
      }
    />
  );

  const renderBinItem = ({
    item: bin,
    index,
  }: {
    item: (typeof sortedBins)[0];
    index: number;
  }) => (
    <ContainerCard
      binId={bin.binId}
      fullness={bin.fullness}
      temperature={bin.temperature}
      wasteType={bin.wasteType}
      lastUpdate={bin.lastUpdate}
      index={index}
      onPress={() =>
        navigation.navigate('DriverContainerDetail', { containerId: bin._id })
      }
    />
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.FlatList
        data={listData}
        keyExtractor={(item) =>
          item._type === 'session'
            ? `session-${item.container._id}`
            : `bin-${item._id}`
        }
        contentContainerStyle={styles.container}
        itemLayoutAnimation={LinearTransition.springify()}
        refreshControl={
          <RefreshControl
            refreshing={isFetching || binsFetching}
            onRefresh={() => {
              refetch();
              refetchBins();
            }}
            tintColor={dark.teal}
          />
        }
        ListHeaderComponent={
          <>
            <Animated.View entering={FadeInDown.springify()}>
              <Text style={styles.title}>{t('driver.containers.title')}</Text>
              <Text style={styles.subtitle}>
                {data?.sessionId
                  ? t('driver.containers.progress', {
                      visited: visitedCount,
                      total: totalCount,
                    })
                  : t('driver.containers.noActive')}
              </Text>
            </Animated.View>

            <Animated.View entering={FadeIn.delay(80)} style={styles.infoRow}>
              <Chip
                label={
                  lastUpdateText
                    ? t('driver.containers.lastUpdated', {
                        time: lastUpdateText,
                      })
                    : t('driver.containers.noActive')
                }
                tone="neutral"
                icon="clock-outline"
              />
              <Chip
                label={
                  sortMode === 'urgency'
                    ? t('driver.containers.sortUrgency')
                    : t('driver.containers.sortName')
                }
                tone="teal"
                icon="swap-vertical"
              />
            </Animated.View>

            <Animated.View entering={FadeIn.delay(120)} style={styles.statsRow}>
              <StatTile
                label={t('driver.containers.activeSession')}
                value={totalCount}
                unit={t('driver.home.statContainers')}
                icon="map-marker-path"
                tone="teal"
                style={styles.statTile}
              />
              <StatTile
                label={t('driver.containers.companyContainers')}
                value={sortedBins.length}
                unit={t('driver.home.statContainers')}
                icon="office-building"
                style={styles.statTile}
              />
              <StatTile
                label={t('driver.containers.sortUrgency')}
                value={criticalCount}
                unit={t('driver.home.statContainers')}
                icon="alert-circle-outline"
                style={styles.statTile}
              />
            </Animated.View>

            <Animated.View entering={FadeIn.delay(180)}>
              <Card variant="outlined" padding="md" style={styles.controlsCard}>
                <View style={styles.controlsHeader}>
                  <View style={styles.controlsIcon}>
                    <MaterialCommunityIcons
                      name="tune-variant"
                      size={18}
                      color={dark.teal}
                    />
                  </View>
                  <View style={styles.controlsCopy}>
                    <Text style={styles.controlsTitle}>
                      {t('driver.containers.sortUrgency')}
                    </Text>
                    <Text style={styles.controlsBody}>
                      {t('driver.containers.lastUpdated', {
                        time: lastUpdateText ?? '--',
                      })}
                    </Text>
                  </View>
                </View>
                <View style={styles.sortRow}>
                  {(['urgency', 'name'] as const).map((mode) => {
                    const active = sortMode === mode;
                    return (
                      <TouchableOpacity
                        key={mode}
                        style={[
                          styles.sortPill,
                          active && styles.sortPillActive,
                        ]}
                        onPress={() => setSortMode(mode)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.sortText,
                            active && styles.sortTextActive,
                          ]}
                        >
                          {mode === 'urgency'
                            ? t('driver.containers.sortUrgency')
                            : t('driver.containers.sortName')}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </Card>
            </Animated.View>

            <SectionHeader
              title={t('driver.containers.activeSession')}
              style={styles.sectionHeader}
            />
          </>
        }
        renderItem={({ item, index }) => {
          if (item._type === 'bin' && index === sortedSessionContainers.length) {
            return (
              <>
                <SectionHeader
                  title={t('driver.containers.companyContainers')}
                  style={styles.sectionHeader}
                />
                {renderBinItem({ item, index: 0 })}
              </>
            );
          }

          if (item._type === 'session') {
            return renderSessionItem({
              item: item as (typeof sortedSessionContainers)[0],
              index,
            });
          }

          return renderBinItem({
            item: item as (typeof sortedBins)[0],
            index: index - sortedSessionContainers.length,
          });
        }}
        ListEmptyComponent={
          <Animated.View entering={FadeIn} style={styles.emptyWrap}>
            <Card variant="outlined" padding="none">
              <EmptyState
                icon="trash-can-outline"
                title={t('driver.containers.noActive')}
                body={t('driver.containers.lastUpdated', { time: '--' })}
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
  container: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.heading,
    color: dark.text,
  },
  subtitle: {
    ...typography.body,
    color: dark.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statTile: {
    minHeight: 130,
  },
  controlsCard: {
    marginBottom: spacing.lg,
    ...elevation.sm,
  },
  controlsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  controlsIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: dark.tealMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlsCopy: {
    flex: 1,
  },
  controlsTitle: {
    ...typography.bodyStrong,
    color: dark.text,
  },
  controlsBody: {
    ...typography.caption,
    color: dark.textSecondary,
    marginTop: 2,
  },
  sortRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  sortPill: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  sortPillActive: {
    backgroundColor: dark.tealMuted,
    borderColor: dark.tealBorder,
  },
  sortText: {
    ...typography.bodyStrong,
    color: dark.textSecondary,
  },
  sortTextActive: {
    color: dark.teal,
  },
  sectionHeader: {
    marginTop: spacing.xs,
  },
  emptyWrap: {
    marginTop: spacing.xl,
  },
});
