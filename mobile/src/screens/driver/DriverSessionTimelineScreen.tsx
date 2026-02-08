import React, { useMemo } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { DriverHistoryStackParamList } from '../../types/navigation';
import { useCollectionHistory } from '../../hooks/useCollections';
import { useHandoffs } from '../../hooks/useHandoffs';
import DriverHandoffTimeline from '../../components/DriverHandoffTimeline';
import { dark, typography } from '../../theme';

export default function DriverSessionTimelineScreen() {
  const { t } = useTranslation();
  const route = useRoute<RouteProp<DriverHistoryStackParamList, 'DriverSessionTimeline'>>();
  const { data: sessions, isLoading: sessionsLoading } = useCollectionHistory();
  const { data: handoffs, isLoading: handoffsLoading, refetch, isFetching } = useHandoffs({
    enabled: true,
  });

  const session = useMemo(
    () => sessions?.find((item) => item.sessionId === route.params.sessionId) ?? null,
    [sessions, route.params.sessionId],
  );

  const sessionHandoffs = useMemo(() => {
    if (!session) return [];
    return (handoffs ?? []).filter((handoff) => (
      handoff.session?._id === session._id || handoff.session?.sessionId === session.sessionId
    ));
  }, [handoffs, session]);

  if (sessionsLoading || handoffsLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator color={dark.teal} />
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>{t('handoff.history.notFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <DriverHandoffTimeline
        session={session}
        handoffs={sessionHandoffs}
        isLoading={false}
        isFetching={isFetching}
        onRefresh={refetch}
        readOnly
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: dark.bg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...typography.body,
    color: dark.textSecondary,
  },
});
