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

import { colors, spacing, typography } from '../../theme';
import { useScheduleCollection, useWasteBins } from '../../hooks/useWasteBins';

export default function SupervisorHome() {
  const { data, isLoading, isFetching, refetch } = useWasteBins();
  const scheduleMutation = useScheduleCollection();

  const scheduleWithOffset = (binId: string, hours: number, priority: 'low' | 'medium' | 'high' | 'critical') => {
    const scheduledFor = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    scheduleMutation.mutate({ binId, scheduledFor, priority });
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
        <Text style={styles.title}>Supervisor Dashboard</Text>
        {data?.length ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Containers</Text>
            {data.map((container) => (
              <View key={container._id} style={styles.listItem}>
                <Text style={styles.itemTitle}>{container.binId ?? 'Container'}</Text>
                <Text style={styles.itemSubtitle}>
                  Fill: {container.fullness ?? 'n/a'}%
                </Text>
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => scheduleWithOffset(container._id, 4, 'high')}
                  >
                    <Text style={styles.actionButtonText}>Schedule 4h</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButtonSecondary}
                    onPress={() => scheduleWithOffset(container._id, 24, 'medium')}
                  >
                    <Text style={styles.actionButtonTextSecondary}>Schedule 24h</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.body}>No containers available.</Text>
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
    flex: 1,
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
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.title,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  listItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  actionButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    marginRight: spacing.sm,
  },
  actionButtonSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
  },
  actionButtonText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtonTextSecondary: {
    color: colors.primary,
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
  body: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
