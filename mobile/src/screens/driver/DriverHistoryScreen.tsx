import React from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useCollectionHistory } from '../../hooks/useCollections';
import { colors, spacing, typography } from '../../theme';

export default function DriverHistoryScreen() {
  const { data, isLoading } = useCollectionHistory();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Session History</Text>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : data?.length ? (
          data.map((session) => (
            <View key={session._id} style={styles.card}>
              <Text style={styles.itemTitle}>{session.sessionId}</Text>
              <Text style={styles.itemSubtitle}>Status: {session.status}</Text>
              <Text style={styles.itemSubtitle}>Start: {session.startTime ?? 'n/a'}</Text>
              <Text style={styles.itemSubtitle}>End: {session.endTime ?? 'n/a'}</Text>
              <Text style={styles.itemSubtitle}>
                Containers: {session.selectedContainers?.length ?? 0}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No past sessions.</Text>
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
