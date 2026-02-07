import React from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useActiveCollection, useMarkVisited, useStopCollection } from '../../hooks/useCollections';
import { colors, spacing, typography } from '../../theme';

export default function ActiveCollectionScreen() {
  const { data, isLoading, refetch, isFetching } = useActiveCollection();
  const stopMutation = useStopCollection();
  const markVisitedMutation = useMarkVisited();

  const handleStop = () => {
    if (!data?.sessionId || stopMutation.isPending) return;
    stopMutation.mutate(data.sessionId, {
      onSuccess: () => {
        refetch();
      },
    });
  };

  const handleMarkVisited = (containerId?: string) => {
    if (!containerId || !data?.sessionId || markVisitedMutation.isPending) return;
    markVisitedMutation.mutate({ sessionId: data.sessionId, containerId });
  };

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
        <Text style={styles.title}>Active Collection</Text>
        {data ? (
          <View style={styles.card}>
            <Text style={styles.label}>Session ID</Text>
            <Text style={styles.value}>{data.sessionId}</Text>
            <Text style={styles.label}>Status</Text>
            <Text style={styles.value}>{data.status}</Text>
            {data.selectedContainers?.length ? (
              <View style={styles.list}>
                <Text style={styles.sectionTitle}>Containers</Text>
                {data.selectedContainers.map((entry) => (
                  <View key={entry.container._id} style={styles.listItem}>
                    <Text style={styles.itemTitle}>{entry.container.binId ?? 'Container'}</Text>
                    <Text style={styles.itemSubtitle}>
                      Fill: {entry.container.fullness ?? 'n/a'}%
                    </Text>
                    <Text style={styles.itemSubtitle}>
                      Visited: {entry.visited ? 'Yes' : 'No'}
                    </Text>
                    {!entry.visited ? (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleMarkVisited(entry.container._id)}
                      >
                        <Text style={styles.actionButtonText}>Mark Visited</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>No containers assigned.</Text>
            )}
            <TouchableOpacity style={styles.button} onPress={handleStop}>
              {stopMutation.isPending ? (
                <ActivityIndicator color={colors.surface} />
              ) : (
                <Text style={styles.buttonText}>End Session</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.emptyText}>No active collection session.</Text>
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
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: spacing.md,
  },
  value: {
    ...typography.body,
    color: colors.textPrimary,
  },
  sectionTitle: {
    ...typography.title,
    fontSize: 16,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  list: {
    marginTop: spacing.md,
  },
  listItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionButton: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.accent,
  },
  actionButtonText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '600',
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
    marginTop: spacing.md,
  },
  button: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.surface,
    fontWeight: '600',
  },
});
