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

import { useHandoffs } from '../../hooks/useHandoffs';
import { dark, spacing, typography } from '../../theme';

function formatHandoffType(type: string) {
  return type.replace('_', ' ');
}

export default function DriverHandoffHistoryScreen() {
  const { data: handoffs, isLoading, isFetching, refetch } = useHandoffs();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={dark.teal} />}
      >
        <Text style={styles.title}>Handoff History</Text>
        {isLoading ? (
          <ActivityIndicator color={dark.teal} />
        ) : handoffs?.length ? (
          handoffs.map((handoff) => (
            <View key={handoff._id} style={styles.card}>
              <Text style={styles.itemTitle}>{handoff.handoffId ?? handoff._id}</Text>
              <Text style={styles.itemSubtitle}>Type: {formatHandoffType(handoff.type)}</Text>
              <Text style={styles.itemSubtitle}>Status: {handoff.status}</Text>
              {handoff.session?.sessionId ? (
                <Text style={styles.itemSubtitle}>Session: {handoff.session.sessionId}</Text>
              ) : null}
              {handoff.totalDeclaredWeight != null ? (
                <Text style={styles.itemSubtitle}>
                  Declared weight: {handoff.totalDeclaredWeight} kg
                </Text>
              ) : null}
              {handoff.createdAt ? (
                <Text style={styles.itemSubtitle}>
                  Created: {new Date(handoff.createdAt).toLocaleString()}
                </Text>
              ) : null}
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No handoffs yet.</Text>
        )}
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
  },
  title: {
    ...typography.title,
    color: dark.text,
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: dark.surface,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: dark.border,
    marginBottom: spacing.lg,
  },
  itemTitle: {
    ...typography.body,
    fontWeight: '600',
    color: dark.text,
  },
  itemSubtitle: {
    ...typography.caption,
    color: dark.textSecondary,
  },
  emptyText: {
    ...typography.body,
    color: dark.textSecondary,
  },
});
