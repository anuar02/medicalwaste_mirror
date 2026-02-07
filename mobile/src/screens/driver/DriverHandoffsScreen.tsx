import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useActiveCollection } from '../../hooks/useCollections';
import { useConfirmHandoff, useCreateIncineratorHandoff, useHandoffs } from '../../hooks/useHandoffs';
import { useIncinerationPlants } from '../../hooks/useIncinerationPlants';
import { colors, spacing, typography } from '../../theme';

export default function DriverHandoffsScreen() {
  const { data: handoffs, isLoading: isHandoffsLoading, refetch } = useHandoffs();
  const confirmMutation = useConfirmHandoff();
  const createMutation = useCreateIncineratorHandoff();
  const { data: session } = useActiveCollection();
  const { data: plants, isLoading: isPlantsLoading } = useIncinerationPlants();

  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);

  const pendingHandoffs = useMemo(() => {
    return (handoffs ?? []).filter((handoff) =>
      ['pending', 'confirmed_by_sender', 'confirmed_by_receiver'].includes(handoff.status)
    );
  }, [handoffs]);

  const visitedContainers = session?.selectedContainers?.filter((item) => item.visited) ?? [];

  const handleConfirm = (handoffId: string) => {
    if (confirmMutation.isPending) return;
    confirmMutation.mutate(handoffId, {
      onSuccess: () => {
        refetch();
      },
    });
  };

  const handleCreateIncinerator = () => {
    if (!session?.sessionId || !selectedPlantId || visitedContainers.length === 0) return;
    if (createMutation.isPending) return;

    const containerIds = visitedContainers.map((item) => item.container._id);

    createMutation.mutate({
      sessionId: session.sessionId,
      containerIds,
      incinerationPlant: selectedPlantId,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Handoffs</Text>
        {isHandoffsLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : pendingHandoffs.length ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Pending Confirmations</Text>
            {pendingHandoffs.map((handoff) => (
              <View key={handoff._id} style={styles.listItem}>
                <Text style={styles.itemTitle}>{handoff.handoffId ?? handoff._id}</Text>
                <Text style={styles.itemSubtitle}>{handoff.type.replace('_', ' ')}</Text>
                <Text style={styles.itemSubtitle}>Status: {handoff.status}</Text>
                <TouchableOpacity style={styles.actionButton} onPress={() => handleConfirm(handoff._id)}>
                  <Text style={styles.actionButtonText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No pending handoffs.</Text>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Create Incineration Handoff</Text>
          {session ? (
            <>
              <Text style={styles.itemSubtitle}>Session: {session.sessionId}</Text>
              {visitedContainers.length ? (
                <>
                  <Text style={styles.itemSubtitle}>Visited containers: {visitedContainers.length}</Text>
                  <Text style={styles.sectionSubtitle}>Select incineration plant</Text>
                  {isPlantsLoading ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (plants ?? []).length ? (
                    <View style={styles.plantList}>
                      {plants?.map((plant) => (
                        <TouchableOpacity
                          key={plant._id}
                          style={
                            selectedPlantId === plant._id
                              ? styles.plantButtonSelected
                              : styles.plantButton
                          }
                          onPress={() => setSelectedPlantId(plant._id)}
                        >
                          <Text
                            style={
                              selectedPlantId === plant._id
                                ? styles.plantButtonTextSelected
                                : styles.plantButtonText
                            }
                          >
                            {plant.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.emptyText}>No plants available.</Text>
                  )}
                  <TouchableOpacity style={styles.primaryButton} onPress={handleCreateIncinerator}>
                    {createMutation.isPending ? (
                      <ActivityIndicator color={colors.surface} />
                    ) : (
                      <Text style={styles.primaryButtonText}>Create Handoff</Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={styles.emptyText}>No visited containers yet.</Text>
              )}
            </>
          ) : (
            <Text style={styles.emptyText}>No active session.</Text>
          )}
        </View>
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
  sectionTitle: {
    ...typography.title,
    fontSize: 16,
    marginBottom: spacing.md,
  },
  sectionSubtitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  listItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  plantList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  plantButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  plantButtonSelected: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  plantButtonText: {
    fontSize: 12,
    color: colors.textPrimary,
  },
  plantButtonTextSelected: {
    fontSize: 12,
    color: colors.surface,
    fontWeight: '600',
  },
  primaryButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.surface,
    fontWeight: '600',
  },
});
