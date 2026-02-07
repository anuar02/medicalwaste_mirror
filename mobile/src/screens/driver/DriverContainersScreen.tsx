import React from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useActiveCollection } from '../../hooks/useCollections';
import { colors, spacing, typography } from '../../theme';

export default function DriverContainersScreen() {
  const { data, isLoading, isFetching, refetch } = useActiveCollection();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
      >
        <Text style={styles.title}>Containers</Text>
        {data?.selectedContainers?.length ? (
          data.selectedContainers.map((entry) => (
            <View key={entry.container._id} style={styles.card}>
              <Text style={styles.itemTitle}>{entry.container.binId ?? 'Container'}</Text>
              <Text style={styles.itemSubtitle}>Fill: {entry.container.fullness ?? 'n/a'}%</Text>
              <Text style={styles.itemSubtitle}>Temp: {entry.container.temperature ?? 'n/a'}</Text>
              <Text style={styles.itemSubtitle}>Visited: {entry.visited ? 'Yes' : 'No'}</Text>
              {entry.container.location?.coordinates ? (
                <Text style={styles.itemSubtitle}>
                  Location: {entry.container.location.coordinates[1]},{' '}
                  {entry.container.location.coordinates[0]}
                </Text>
              ) : null}
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No active session containers.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  itemTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  itemSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
