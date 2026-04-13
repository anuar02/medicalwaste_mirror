import React, { useMemo } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import MapView, { Marker, Polyline } from 'react-native-maps';

import { DriverHistoryStackParamList } from '../../types/navigation';
import { useCollectionHistory, useSessionRoute } from '../../hooks/useCollections';
import { useHandoffs } from '../../hooks/useHandoffs';
import DriverHandoffTimeline from '../../components/DriverHandoffTimeline';
import { dark, spacing, typography } from '../../theme';
import { toValidCoordinate } from '../../utils/coordinates';

export default function DriverSessionTimelineScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
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

  const sessionRouteQuery = useSessionRoute(session?._id ?? session?.sessionId, {
    enabled: Boolean(session),
    refetchInterval: session?.status === 'active' ? 15000 : false,
  });

  const routePath = useMemo(() => {
    const points = sessionRouteQuery.data?.route ?? [];
    return points
      .map((point) => {
        return toValidCoordinate(point.location?.coordinates);
      })
      .filter((point): point is { latitude: number; longitude: number } => Boolean(point));
  }, [sessionRouteQuery.data?.route]);

  const startCoordinate = useMemo(
    () => toValidCoordinate(session?.startLocation?.coordinates),
    [session?.startLocation?.coordinates],
  );

  const endCoordinate = useMemo(
    () => toValidCoordinate(session?.endLocation?.coordinates),
    [session?.endLocation?.coordinates],
  );

  const mapRegion = useMemo(() => {
    if (startCoordinate) {
      return {
        latitude: startCoordinate.latitude,
        longitude: startCoordinate.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
    }
    if (routePath.length) {
      const first = routePath[0];
      return {
        latitude: first.latitude,
        longitude: first.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
    }
    return null;
  }, [routePath, startCoordinate]);

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
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <MaterialCommunityIcons name="arrow-left" size={22} color={dark.text} />
      </TouchableOpacity>
      <View style={styles.mapWrapper}>
        {sessionRouteQuery.isLoading ? (
          <View style={styles.mapLoading}>
            <ActivityIndicator color={dark.teal} />
          </View>
        ) : mapRegion ? (
          <MapView style={styles.map} region={mapRegion}>
            {startCoordinate ? (
              <Marker
                coordinate={startCoordinate}
                pinColor={dark.teal}
                title={t('driver.route.startTitle')}
              />
            ) : null}
            {endCoordinate ? (
              <Marker
                coordinate={endCoordinate}
                pinColor={dark.dangerText}
                title={t('driver.route.endSession')}
              />
            ) : null}
            {routePath.length ? (
              <Polyline
                coordinates={routePath}
                strokeWidth={4}
                strokeColor={dark.amber}
              />
            ) : null}
          </MapView>
        ) : (
          <View style={styles.mapEmpty}>
            <Text style={styles.emptyText}>{t('driver.route.noMap')}</Text>
          </View>
        )}
      </View>
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
  backButton: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    alignSelf: 'flex-start',
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
  mapWrapper: {
    height: 220,
    borderBottomWidth: 1,
    borderBottomColor: dark.border,
  },
  map: {
    flex: 1,
  },
  mapLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dark.bg,
  },
  mapEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    backgroundColor: dark.bg,
  },
});
