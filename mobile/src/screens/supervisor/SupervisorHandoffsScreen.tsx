import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useHandoffs, useCreateFacilityHandoff } from '../../hooks/useHandoffs';
import { useWasteBins } from '../../hooks/useWasteBins';
import { colors, spacing, typography } from '../../theme';

export default function SupervisorHandoffsScreen() {
  const { data: handoffs, isLoading: handoffsLoading } = useHandoffs();
  const { data: bins, isLoading: binsLoading } = useWasteBins();
  const createMutation = useCreateFacilityHandoff();

  const [receiverUserId, setReceiverUserId] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const toggleBin = (binId: string) => {
    setSelectedIds((prev) =>
      prev.includes(binId) ? prev.filter((id) => id !== binId) : [...prev, binId]
    );
  };

  const canSubmit = receiverUserId.trim().length > 0 && selectedIds.length > 0;

  const handleCreate = () => {
    if (!canSubmit) {
      setError('Driver user ID and containers required');
      return;
    }
    setError(null);
    createMutation.mutate({
      receiverUserId: receiverUserId.trim(),
      containerIds: selectedIds,
    });
  };

  const recentHandoffs = useMemo(() => {
    return (handoffs ?? []).slice(0, 5);
  }, [handoffs]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Create Handoff</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Driver User ID</Text>
          <TextInput
            placeholder="Driver user id"
            style={styles.input}
            value={receiverUserId}
            onChangeText={setReceiverUserId}
          />
          <Text style={styles.label}>Select containers</Text>
          {binsLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : bins?.length ? (
            bins.map((bin) => (
              <TouchableOpacity
                key={bin._id}
                style={selectedIds.includes(bin._id) ? styles.selectRowActive : styles.selectRow}
                onPress={() => toggleBin(bin._id)}
              >
                <Text style={styles.itemTitle}>{bin.binId ?? 'Container'}</Text>
                <Text style={styles.itemSubtitle}>Fill: {bin.fullness ?? 'n/a'}%</Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>No containers available.</Text>
          )}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity
            style={[styles.primaryButton, !canSubmit && styles.primaryButtonDisabled]}
            onPress={handleCreate}
            disabled={!canSubmit || createMutation.isPending}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={styles.primaryButtonText}>Create Facility Handoff</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Recent Handoffs</Text>
        {handoffsLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : recentHandoffs.length ? (
          recentHandoffs.map((handoff) => (
            <View key={handoff._id} style={styles.card}>
              <Text style={styles.itemTitle}>{handoff.handoffId ?? handoff._id}</Text>
              <Text style={styles.itemSubtitle}>{handoff.type.replace('_', ' ')}</Text>
              <Text style={styles.itemSubtitle}>Status: {handoff.status}</Text>
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
    backgroundColor: colors.background,
  },
  container: {
    padding: spacing.xl,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
    color: colors.textPrimary,
  },
  selectRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectRowActive: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
    backgroundColor: '#ecfdf5',
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
  error: {
    color: colors.danger,
    marginVertical: spacing.md,
  },
  primaryButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: colors.surface,
    fontWeight: '600',
  },
});
