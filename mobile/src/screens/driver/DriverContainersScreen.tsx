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
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useActiveCollection } from '../../hooks/useCollections';
import { useWasteBins } from '../../hooks/useWasteBins';
import { dark, spacing, typography } from '../../theme';
import { DriverContainersStackParamList } from '../../types/navigation';
import { formatRelativeTime } from '../../utils/formatTime';
import ContainerCard from '../../components/shared/ContainerCard';

type SortMode = 'urgency' | 'name';

export default function DriverContainersScreen() {
  const { t } = useTranslation();
  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useActiveCollection();
  const { data: bins, isLoading: binsLoading, isFetching: binsFetching, refetch: refetchBins, dataUpdatedAt: binsUpdatedAt } = useWasteBins();
  const navigation = useNavigation<NativeStackNavigationProp<DriverContainersStackParamList>>();
  const [sortMode, setSortMode] = useState<SortMode>('urgency');

  const sortFn = useCallback(
    (a: { fullness?: number; binId?: string }, b: { fullness?: number; binId?: string }) => {
      if (sortMode === 'name') {
        return (a.binId ?? '').localeCompare(b.binId ?? '');
      }
      return (b.fullness ?? 0) - (a.fullness ?? 0);
    },
    [sortMode],
  );

  const sortedSessionContainers = useMemo(() => {
    if (!data?.selectedContainers?.length) return [];
    return [...data.selectedContainers].sort((a, b) =>
      sortFn(a.container, b.container),
    );
  }, [data?.selectedContainers, sortFn]);

  const sortedBins = useMemo(() => {
    if (!bins?.length) return [];
    return [...bins].sort(sortFn);
  }, [bins, sortFn]);

  const visitedCount = data?.selectedContainers?.filter((e) => e.visited).length ?? 0;
  const totalCount = data?.selectedContainers?.length ?? 0;

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

  const renderSessionItem = ({ item: entry, index }: { item: (typeof sortedSessionContainers)[0]; index: number }) => (
    <ContainerCard
      binId={entry.container.binId}
      fullness={entry.container.fullness}
      temperature={entry.container.temperature}
      wasteType={entry.container.wasteType}
      lastUpdate={entry.container.lastUpdate}
      visited={entry.visited}
      index={index}
      onPress={() => navigation.navigate('DriverContainerDetail', { containerId: entry.container._id })}
    />
  );

  const renderBinItem = ({ item: bin, index }: { item: (typeof sortedBins)[0]; index: number }) => (
    <ContainerCard
      binId={bin.binId}
      fullness={bin.fullness}
      temperature={bin.temperature}
      wasteType={bin.wasteType}
      lastUpdate={bin.lastUpdate}
      index={index}
      onPress={() => navigation.navigate('DriverContainerDetail', { containerId: bin._id })}
    />
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.FlatList
        data={[...sortedSessionContainers.map((e) => ({ _type: 'session' as const, ...e })), ...sortedBins.map((b) => ({ _type: 'bin' as const, ...b }))]}
        keyExtractor={(item) =>
          item._type === 'session' ? `session-${item.container._id}` : `bin-${item._id}`
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
            <Text style={styles.title}>{t('driver.containers.title')}</Text>

            {/* Updated banner */}
            {lastUpdateText && (
              <Animated.View entering={FadeIn} style={styles.updatedBanner}>
                <MaterialCommunityIcons name="clock-outline" size={14} color={dark.muted} />
                <Text style={styles.updatedText}>
                  {t('driver.containers.lastUpdated', { time: lastUpdateText })}
                </Text>
              </Animated.View>
            )}

            {/* Sort pills */}
            <View style={styles.sortRow}>
              <TouchableOpacity
                style={[styles.sortPill, sortMode === 'urgency' && styles.sortPillActive]}
                onPress={() => setSortMode('urgency')}
              >
                <Text style={[styles.sortText, sortMode === 'urgency' && styles.sortTextActive]}>
                  {t('driver.containers.sortUrgency')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sortPill, sortMode === 'name' && styles.sortPillActive]}
                onPress={() => setSortMode('name')}
              >
                <Text style={[styles.sortText, sortMode === 'name' && styles.sortTextActive]}>
                  {t('driver.containers.sortName')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Active Session section */}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <MaterialCommunityIcons name="map-marker-path" size={18} color={dark.teal} />
              </View>
              <Text style={styles.sectionTitle}>{t('driver.containers.activeSession')}</Text>
              {totalCount > 0 && (
                <Text style={styles.progressText}>
                  {t('driver.containers.progress', { visited: visitedCount, total: totalCount })}
                </Text>
              )}
            </View>
          </>
        }
        renderItem={({ item, index }) => {
          // Render section divider before company containers
          if (item._type === 'bin' && index === sortedSessionContainers.length) {
            return (
              <>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIcon}>
                    <MaterialCommunityIcons name="office-building" size={18} color={dark.teal} />
                  </View>
                  <Text style={styles.sectionTitle}>{t('driver.containers.companyContainers')}</Text>
                </View>
                {renderBinItem({ item, index: 0 })}
              </>
            );
          }

          if (item._type === 'session') {
            return renderSessionItem({
              item: item as typeof sortedSessionContainers[0],
              index,
            });
          }

          return renderBinItem({
            item: item as typeof sortedBins[0],
            index: index - sortedSessionContainers.length,
          });
        }}
        ListEmptyComponent={
          <Animated.View entering={FadeIn} style={styles.emptyCard}>
            <MaterialCommunityIcons name="information-outline" size={18} color={dark.muted} />
            <Text style={styles.emptyText}>{t('driver.containers.noActive')}</Text>
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
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.title,
    color: dark.text,
    marginBottom: spacing.sm,
  },
  updatedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  updatedText: {
    ...typography.caption,
    color: dark.muted,
  },
  sortRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  sortPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: dark.card,
    borderWidth: 1,
    borderColor: dark.border,
  },
  sortPillActive: {
    backgroundColor: 'rgba(13, 148, 136, 0.15)',
    borderColor: dark.teal,
  },
  sortText: {
    ...typography.caption,
    color: dark.muted,
    fontWeight: '600',
  },
  sortTextActive: {
    color: dark.teal,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(13, 148, 136, 0.15)',
    marginRight: spacing.sm,
  },
  sectionTitle: {
    ...typography.body,
    fontWeight: '600',
    color: dark.text,
    flex: 1,
  },
  progressText: {
    ...typography.caption,
    color: dark.teal,
    fontWeight: '600',
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: dark.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: dark.border,
    marginBottom: spacing.lg,
  },
  emptyText: {
    ...typography.body,
    color: dark.textSecondary,
    marginLeft: spacing.sm,
  },
});
