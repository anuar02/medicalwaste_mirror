import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import {
  useActiveCollection,
  useSessionRoute,
  useStartCollection,
} from '../hooks/useCollections';
import { useHandoffs } from '../hooks/useHandoffs';
import { useSessionRouteRealtime } from '../hooks/useSessionRouteRealtime';
import { useWasteBins } from '../hooks/useWasteBins';
import { useAuthStore } from '../stores/authStore';
import { dark, spacing, typography } from '../theme';
import { googleDirectionsApiKey } from '../utils/env';
import { haversineDistance, formatDistance } from '../utils/distance';
import ContainerCard from './shared/ContainerCard';
import AnimatedProgressBar from './shared/AnimatedProgressBar';
import { getUrgencyColor } from '../utils/urgency';
import { toValidCoordinate } from '../utils/coordinates';
import { CollectionContainer, WasteBin } from '../types/models';

interface DriverRoutePanelProps {
  showTitle?: boolean;
}

function decodePolyline(encoded: string): Array<{ latitude: number; longitude: number }> {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates: Array<{ latitude: number; longitude: number }> = [];

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte = null;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const deltaLat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += deltaLat;

    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const deltaLng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += deltaLng;

    coordinates.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }

  return coordinates;
}

export default function DriverRoutePanel({ showTitle = false }: DriverRoutePanelProps) {
  const { t } = useTranslation();
  const { data, isLoading, refetch, isFetching } = useActiveCollection();
  const startMutation = useStartCollection();
  const {
    data: bins,
    isFetching: binsFetching,
    refetch: refetchBins,
  } = useWasteBins({ enabled: !data });
  const currentUser = useAuthStore((s) => s.user);
  const currentUserId = String(
    (currentUser as any)?._id || (currentUser as any)?.id || '',
  );
  const handoffsQuery = useHandoffs({
    enabled: !data,
  });
  const pendingHandoffs = useMemo(() => {
    if (data) return [];
    const list = handoffsQuery.data ?? [];
    const openStatuses = new Set([
      'created',
      'pending',
      'confirmedBySender',
      'confirmed_by_sender',
    ]);
    return list.filter((h) => {
      if (h.type !== 'facility_to_driver') return false;
      if (!openStatuses.has(String(h.status))) return false;
      // Backend already scoped the list to this driver's identity as sender/receiver.
      // Accept any item where receiver.user matches or is missing.
      const receiver: any = h.receiver?.user;
      const receiverId = String(receiver?._id || receiver?.id || receiver || '');
      if (!receiverId) return true;
      if (!currentUserId) return true;
      return receiverId === currentUserId;
    });
  }, [data, handoffsQuery.data, currentUserId]);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [routeCoords, setRouteCoords] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [routeMeta, setRouteMeta] = useState<{ distance?: string; duration?: string } | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [waypointOrder, setWaypointOrder] = useState<number[]>([]);

  const sessionRouteQuery = useSessionRoute(data?._id ?? data?.sessionId, {
    enabled: Boolean(data),
  });
  useSessionRouteRealtime(data);

  const driverRouteCoords = useMemo(() => {
    const routePoints = sessionRouteQuery.data?.route ?? [];
    const path = routePoints
      .map((point) => {
        return toValidCoordinate(point.location?.coordinates);
      })
      .filter((point): point is { latitude: number; longitude: number } => Boolean(point));
    return path.length > 1 ? path : [];
  }, [sessionRouteQuery.data?.route]);

  const snapPoints = useMemo(() => ['16%', '52%', '88%'], []);
  const sheetRef = useRef<BottomSheet>(null);
  const [sheetIndex, setSheetIndex] = useState(0);
  const isSheetExpanded = sheetIndex > 0;

  const sessionItems = useMemo(() => (
    data?.selectedContainers?.filter((entry) => (
      Boolean(entry?.container && typeof entry.container._id === 'string' && entry.container._id.length > 0)
    )) ?? []
  ), [data?.selectedContainers]);

  const containerMarkers = useMemo(() => (
    sessionItems
      .map((entry) => {
        const coordinate = toValidCoordinate(entry.container.location?.coordinates);
        if (!coordinate) return null;
        return {
          id: entry.container._id,
          title: entry.container.binId ?? t('driver.route.container'),
          latitude: coordinate.latitude,
          longitude: coordinate.longitude,
          visited: entry.visited,
          fullness: entry.container.fullness,
          temperature: entry.container.temperature,
          wasteType: entry.container.wasteType,
          lastUpdate: entry.container.lastUpdate,
          binId: entry.container.binId,
        };
      })
      .filter((marker): marker is NonNullable<typeof marker> => Boolean(marker))
  ), [sessionItems, t]);

  const unvisitedMarkers = useMemo(
    () => containerMarkers.filter((m) => !m.visited),
    [containerMarkers],
  );

  const availableMarkers = useMemo(() => (
    bins
      ?.map((bin) => {
        const coordinate = toValidCoordinate(bin.location?.coordinates);
        if (!coordinate) return null;
        return {
          id: bin._id,
          title: bin.binId ?? t('driver.route.container'),
          latitude: coordinate.latitude,
          longitude: coordinate.longitude,
        };
      })
      .filter((marker): marker is NonNullable<typeof marker> => Boolean(marker)) ?? []
  ), [bins, t]);

  // Compute per-container distance from driver
  const containerDistances = useMemo(() => {
    if (!currentLocation) return {};
    const driverLat = currentLocation.coords.latitude;
    const driverLon = currentLocation.coords.longitude;
    const distances: Record<string, number> = {};
    for (const marker of containerMarkers) {
      distances[marker.id] = haversineDistance(driverLat, driverLon, marker.latitude, marker.longitude);
    }
    return distances;
  }, [currentLocation, containerMarkers]);

  // The next stop: first unvisited sorted by waypoint order, or nearest
  const nextStopMarker = useMemo(() => {
    if (!unvisitedMarkers.length) return null;
    if (waypointOrder.length && unvisitedMarkers.length > 0) {
      // waypointOrder maps to original unvisited indices; pick first
      return unvisitedMarkers[0];
    }
    // Fallback: nearest unvisited
    if (currentLocation) {
      return [...unvisitedMarkers].sort((a, b) =>
        (containerDistances[a.id] ?? Infinity) - (containerDistances[b.id] ?? Infinity),
      )[0];
    }
    return unvisitedMarkers[0];
  }, [unvisitedMarkers, waypointOrder, currentLocation, containerDistances]);

  const visitedCount = sessionItems.filter((e) => e.visited).length;
  const totalCount = sessionItems.length;

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let isMounted = true;

    const startWatching = async () => {
      if (data && data.status !== 'active') {
        setCurrentLocation(null);
        return;
      }

      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        if (isMounted) {
          setLocationError(t('driver.route.locationPermission'));
        }
        return;
      }

      setLocationError(null);
      const initial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (isMounted) {
        setCurrentLocation(initial);
      }

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10000,
          distanceInterval: 10,
        },
        (location) => {
          if (isMounted) {
            setCurrentLocation(location);
          }
        },
      );
    };

    startWatching().catch((error) => {
      console.warn('Location watch error', error);
      if (isMounted) {
        setLocationError(t('driver.route.locationError'));
      }
    });

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.remove();
      }
    };
  }, [data?.sessionId, data?.status, t]);

  const mapRegion = useMemo(() => {
    if (currentLocation) {
      const latitude = Number(currentLocation.coords.latitude);
      const longitude = Number(currentLocation.coords.longitude);
      if (
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180
      ) {
        return {
          latitude,
          longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        };
      }
    }
    if (containerMarkers.length) {
      return {
        latitude: containerMarkers[0].latitude,
        longitude: containerMarkers[0].longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    if (!data && availableMarkers.length) {
      return {
        latitude: availableMarkers[0].latitude,
        longitude: availableMarkers[0].longitude,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      };
    }
    return null;
  }, [currentLocation, containerMarkers, data, availableMarkers]);

  const currentMarkerCoordinate = useMemo(() => {
    if (!currentLocation) return null;
    const latitude = Number(currentLocation.coords.latitude);
    const longitude = Number(currentLocation.coords.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
    return { latitude, longitude };
  }, [currentLocation]);

  // Visited state is driven by handoff completion; driver has no manual override.

  // Multi-stop route: origin = driver, waypoints = all unvisited (max 8), optimizeWaypoints
  useEffect(() => {
    const fetchRoute = async () => {
      if (!currentLocation || !data) return;
      if (!unvisitedMarkers.length) {
        setRouteCoords([]);
        setRouteMeta(null);
        return;
      }
      if (!googleDirectionsApiKey) {
        setRouteError(t('driver.route.routeMissingKey'));
        return;
      }
      setRouteLoading(true);
      setRouteError(null);
      try {
        const origin = `${currentLocation.coords.latitude},${currentLocation.coords.longitude}`;
        const stops = unvisitedMarkers.slice(0, 8);
        const destination = `${stops[stops.length - 1].latitude},${stops[stops.length - 1].longitude}`;

        let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${googleDirectionsApiKey}`;

        if (stops.length > 1) {
          const waypoints = stops
            .slice(0, -1)
            .map((s) => `${s.latitude},${s.longitude}`)
            .join('|');
          url += `&waypoints=optimize:true|${waypoints}`;
        }

        const response = await fetch(url);
        const payload = await response.json();
        if (payload.status !== 'OK' || !payload.routes?.length) {
          throw new Error(payload.error_message || 'Directions unavailable');
        }
        const route = payload.routes[0];
        const points = route.overview_polyline?.points;
        if (points) {
          const decoded = decodePolyline(points).filter((point) => (
            Number.isFinite(point.latitude) &&
            Number.isFinite(point.longitude) &&
            point.latitude >= -90 &&
            point.latitude <= 90 &&
            point.longitude >= -180 &&
            point.longitude <= 180
          ));
          setRouteCoords(decoded);
        }

        // Parse total distance & duration across all legs
        const legs = route.legs ?? [];
        const totalMeters = legs.reduce((sum: number, leg: { distance?: { value?: number } }) => sum + (leg.distance?.value ?? 0), 0);
        const totalSeconds = legs.reduce((sum: number, leg: { duration?: { value?: number } }) => sum + (leg.duration?.value ?? 0), 0);
        const distKm = (totalMeters / 1000).toFixed(1);
        const durMin = Math.ceil(totalSeconds / 60);
        setRouteMeta({
          distance: `${distKm} km`,
          duration: `${durMin} min`,
        });

        // Store optimized waypoint order
        if (route.waypoint_order) {
          setWaypointOrder(route.waypoint_order);
        }
      } catch (error) {
        setRouteError(t('driver.route.routeError'));
      } finally {
        setRouteLoading(false);
      }
    };

    fetchRoute();
  }, [currentLocation, data, unvisitedMarkers, t]);

  // Driver manually picks a pending handoff to begin the session.
  // Containers come from the handoff itself — driver cannot pick ad-hoc.
  const handleStartFromHandoff = async () => {
    if (data || startMutation.isPending) return;
    let startLocation: { type: 'Point'; coordinates: [number, number] } | undefined;
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status === 'granted') {
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        startLocation = {
          type: 'Point',
          coordinates: [position.coords.longitude, position.coords.latitude],
        };
      }
    } catch {
      // fall through — backend accepts sessions without a start location
    }
    startMutation.mutate({ startLocation });
  };

  const handleOpen2Gis = (targetLat?: number, targetLng?: number) => {
    if (!currentLocation || targetLat == null || targetLng == null) return;
    const from = `${currentLocation.coords.latitude},${currentLocation.coords.longitude}`;
    const to = `${targetLat},${targetLng}`;
    const appUrl = `dgis://2gis.ru/routeSearch/rsType/car/from/${from}/to/${to}`;
    const webUrl = `https://2gis.com/routeSearch/rsType/car/from/${from}/to/${to}`;
    Linking.openURL(appUrl).catch(() => Linking.openURL(webUrl));
  };

  const handleOpenAppleMaps = (targetLat?: number, targetLng?: number) => {
    if (!currentLocation || targetLat == null || targetLng == null) return;
    const url = `http://maps.apple.com/?saddr=${currentLocation.coords.latitude},${currentLocation.coords.longitude}&daddr=${targetLat},${targetLng}`;
    Linking.openURL(url).catch(() => undefined);
  };

  // Stop number for markers (based on waypoint_order)
  const markerStopNumbers = useMemo(() => {
    const numbers: Record<string, number> = {};
    if (waypointOrder.length && unvisitedMarkers.length > 1) {
      const stops = unvisitedMarkers.slice(0, 8);
      const intermediate = stops.slice(0, -1);
      waypointOrder.forEach((origIdx, routeIdx) => {
        if (intermediate[origIdx]) {
          numbers[intermediate[origIdx].id] = routeIdx + 1;
        }
      });
      // Last stop is the destination
      numbers[stops[stops.length - 1].id] = waypointOrder.length + 1;
    } else if (unvisitedMarkers.length === 1) {
      numbers[unvisitedMarkers[0].id] = 1;
    }
    return numbers;
  }, [waypointOrder, unvisitedMarkers]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={dark.teal} />
      </View>
    );
  }

  const isNextStop = (id: string) => nextStopMarker?.id === id;
  const openSheet = () => {
    if (!isSheetExpanded) {
      sheetRef.current?.snapToIndex(1);
    }
  };

  return (
    <View style={styles.root}>
      {showTitle ? <Text style={styles.title}>{t('driver.route.title')}</Text> : null}
      {mapRegion ? (
        <MapView style={styles.map} region={mapRegion}>
          {currentMarkerCoordinate ? (
            <Marker
              coordinate={currentMarkerCoordinate}
              title={t('driver.route.you')}
              pinColor={dark.teal}
            />
          ) : null}
          {/* Shadow polyline */}
          {routeCoords.length ? (
            <Polyline
              coordinates={routeCoords}
              strokeWidth={8}
              strokeColor="rgba(13, 148, 136, 0.3)"
            />
          ) : null}
          {/* Main polyline */}
          {routeCoords.length ? (
            <Polyline
              coordinates={routeCoords}
              strokeWidth={4}
              strokeColor={dark.teal}
            />
          ) : null}
          {/* Driver GPS route */}
          {driverRouteCoords.length ? (
            <Polyline
              coordinates={driverRouteCoords}
              strokeWidth={3}
              strokeColor={dark.amber}
              lineDashPattern={[6, 6]}
            />
          ) : null}
          {containerMarkers.map((marker) => {
            const stopNum = markerStopNumbers[marker.id];
            const isVisited = marker.visited;
            return (
              <Marker
                key={marker.id}
                coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
                title={stopNum ? `#${stopNum} ${marker.title}` : marker.title}
                pinColor={
                  isNextStop(marker.id)
                    ? dark.teal
                    : (isVisited ? dark.muted : dark.successText)
                }
              />
            );
          })}
        </MapView>
      ) : (
        <View style={styles.mapFallback}>
          <Text style={styles.emptyText}>{t('driver.route.noMap')}</Text>
        </View>
      )}

      <BottomSheet
        ref={sheetRef}
        snapPoints={snapPoints}
        index={0}
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.sheetHandle}
        onChange={setSheetIndex}
        enableContentPanningGesture
        enableOverDrag={false}
      >
        {data ? (
          <BottomSheetFlatList
            data={sessionItems}
            keyExtractor={(item: CollectionContainer) => item.container._id}
            contentContainerStyle={styles.sheetContent}
            scrollEnabled={isSheetExpanded}
            showsVerticalScrollIndicator={isSheetExpanded}
            refreshControl={
              <RefreshControl
                refreshing={isFetching}
                onRefresh={() => {
                  refetch();
                }}
              />
            }
            ListHeaderComponent={
              <TouchableOpacity
                activeOpacity={0.95}
                onPress={openSheet}
                style={styles.sheetSummaryCard}
              >
                <View style={styles.sheetSummaryTop}>
                  <View style={styles.sheetSummaryCopy}>
                    <Text style={styles.peekLabel}>{t('driver.route.nextStop')}</Text>
                    <Text style={styles.peekBinId}>
                      {nextStopMarker?.binId ?? t('driver.route.container')}
                    </Text>
                  </View>
                  {nextStopMarker ? (
                    <TouchableOpacity
                      style={styles.peekNavIcon}
                      onPress={() =>
                        handleOpen2Gis(
                          nextStopMarker.latitude,
                          nextStopMarker.longitude,
                        )
                      }
                    >
                      <MaterialCommunityIcons
                        name="navigation-variant"
                        size={18}
                        color={dark.text}
                      />
                    </TouchableOpacity>
                  ) : null}
                </View>

                <View style={styles.summaryStatRow}>
                  <View style={styles.summaryStat}>
                    <Text style={styles.summaryStatValue}>
                      {visitedCount}/{totalCount}
                    </Text>
                    <Text style={styles.summaryStatLabel}>
                      {t('driver.route.containersTitle')}
                    </Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryStat}>
                    <Text style={styles.summaryStatValue}>
                      {routeMeta?.distance ?? '--'}
                    </Text>
                    <Text style={styles.summaryStatLabel}>ETA</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryStat}>
                    <Text style={styles.summaryStatValue}>
                      {routeMeta?.duration ?? '--'}
                    </Text>
                    <Text style={styles.summaryStatLabel}>
                      {t('driver.route.nextStop')}
                    </Text>
                  </View>
                </View>

                {nextStopMarker ? (
                  <>
                    <View style={styles.peekMetaRow}>
                      <Text style={styles.peekDistance}>
                        {[
                          containerDistances[nextStopMarker.id] != null
                            ? formatDistance(
                                containerDistances[nextStopMarker.id],
                              )
                            : null,
                          routeMeta?.duration,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    </View>
                    <View style={styles.peekBarRow}>
                      <View style={styles.peekBarWrap}>
                        <AnimatedProgressBar
                          fullness={nextStopMarker.fullness ?? 0}
                          color={getUrgencyColor(nextStopMarker.fullness)}
                          height={4}
                        />
                      </View>
                    </View>
                  </>
                ) : null}

                <View style={styles.routeProgress}>
                  <Text style={styles.routeProgressText}>
                    {t('driver.route.progress', {
                      visited: visitedCount,
                      total: totalCount,
                      distance: routeMeta?.distance ?? '--',
                      duration: routeMeta?.duration ?? '--',
                    })}
                  </Text>
                </View>

                <View style={styles.sheetHintRow}>
                  <MaterialCommunityIcons
                    name={isSheetExpanded ? 'chevron-down' : 'chevron-up'}
                    size={16}
                    color={dark.teal}
                  />
                  <Text style={styles.sheetHintText}>
                    {t('driver.route.containersTitle')}
                  </Text>
                </View>

                {isSheetExpanded ? (
                  <Text style={styles.sectionTitle}>
                    {t('driver.route.containersTitle')}
                  </Text>
                ) : null}
              </TouchableOpacity>
            }
            renderItem={({ item: entry, index }: { item: CollectionContainer; index: number }) => (
              <ContainerCard
                binId={entry.container.binId}
                fullness={entry.container.fullness}
                temperature={entry.container.temperature}
                wasteType={entry.container.wasteType}
                lastUpdate={entry.container.lastUpdate}
                visited={entry.visited}
                distanceText={
                  containerDistances[entry.container._id] != null
                    ? formatDistance(containerDistances[entry.container._id])
                    : undefined
                }
                index={index}
              />
            )}
            ListEmptyComponent={
              sessionItems.length === 0 ? (
                <Text style={styles.emptyText}>{t('driver.route.noContainers')}</Text>
              ) : null
            }
          />
        ) : (
          <View style={styles.waitingContainer}>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={() => {
                handoffsQuery.refetch();
                refetchBins();
              }}
              disabled={handoffsQuery.isFetching}
            >
              {handoffsQuery.isFetching ? (
                <ActivityIndicator size="small" color={dark.text} />
              ) : (
                <MaterialCommunityIcons name="refresh" size={16} color={dark.text} />
              )}
              <Text style={styles.refreshButtonText}>
                {t('common.refresh')}
                {handoffsQuery.data
                  ? ` (${pendingHandoffs.length}/${handoffsQuery.data.length})`
                  : ''}
              </Text>
            </TouchableOpacity>

            {handoffsQuery.error ? (
              <Text style={styles.errorText}>
                {String((handoffsQuery.error as Error)?.message ?? handoffsQuery.error)}
              </Text>
            ) : null}

            {startMutation.isPending ? (
              <>
                <ActivityIndicator color={dark.teal} />
                <Text style={styles.waitingTitle}>{t('driver.route.starting')}</Text>
              </>
            ) : pendingHandoffs.length > 0 ? (
              <>
                <MaterialCommunityIcons name="truck-fast-outline" size={40} color={dark.teal} />
                <Text style={styles.waitingTitle}>{t('driver.route.dispatchReceived')}</Text>
                <Text style={styles.waitingBody}>{t('driver.route.dispatchReceivedBody')}</Text>
                <View style={styles.handoffList}>
                  {pendingHandoffs.map((h) => {
                    const count = h.totalContainers ?? h.containers?.length ?? 0;
                    const weight = h.totalDeclaredWeight ?? 0;
                    const senderName = h.sender?.name || h.sender?.user?.username || '—';
                    return (
                      <View key={h._id} style={styles.handoffCard}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.handoffTitle}>
                            {h.handoffId || '#'}
                          </Text>
                          <Text style={styles.handoffMeta}>
                            {senderName} · {count} конт. · {weight} кг
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.handoffStartBtn}
                          onPress={handleStartFromHandoff}
                        >
                          <Text style={styles.handoffStartText}>
                            {t('driver.route.startSession')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              </>
            ) : (
              <>
                <MaterialCommunityIcons name="clock-outline" size={40} color={dark.muted} />
                <Text style={styles.waitingTitle}>{t('driver.route.waitingTitle')}</Text>
                <Text style={styles.waitingBody}>{t('driver.route.waitingBody')}</Text>
              </>
            )}
          </View>
        )}
      </BottomSheet>

      {locationError ? <Text style={styles.errorToast}>{locationError}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: dark.bg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: {
    ...typography.title,
    color: dark.text,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.title,
    fontSize: 16,
    color: dark.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  mapFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dark.bg,
  },
  map: {
    flex: 1,
  },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: dark.border,
  },
  selectIcon: {
    marginRight: spacing.sm,
  },
  selectText: {
    flex: 1,
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
    marginTop: spacing.md,
  },
  /* Bottom sheet */
  sheetBg: {
    backgroundColor: dark.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: dark.border,
  },
  sheetHandle: {
    backgroundColor: dark.borderStrong,
    width: 56,
  },
  sheetContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sheetSummaryCard: {
    backgroundColor: dark.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: dark.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  sheetSummaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  sheetSummaryCopy: {
    flex: 1,
  },
  summaryStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: dark.surfaceMuted,
    borderRadius: 14,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  summaryStat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  summaryStatValue: {
    ...typography.bodyStrong,
    color: dark.text,
  },
  summaryStatLabel: {
    ...typography.caption,
    color: dark.textSecondary,
  },
  summaryDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: dark.border,
  },
  /* Peek row — next stop compact info */
  peekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  peekInfo: {
    flex: 1,
  },
  peekLabel: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
    color: dark.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  peekBinId: {
    ...typography.body,
    fontWeight: '700',
    color: dark.text,
  },
  peekDistance: {
    ...typography.caption,
    color: dark.teal,
    fontWeight: '600',
  },
  peekMetaRow: {
    marginTop: spacing.sm,
  },
  peekNavIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: dark.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  peekBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  peekBarWrap: {
    flex: 1,
  },
  peekVisitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(13, 148, 136, 0.15)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    gap: 4,
  },
  peekVisitText: {
    fontSize: 12,
    fontWeight: '600',
    color: dark.teal,
  },
  /* Route progress */
  routeProgress: {
    backgroundColor: 'rgba(13, 148, 136, 0.1)',
    borderRadius: 10,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  routeProgressText: {
    ...typography.caption,
    color: dark.teal,
    fontWeight: '600',
    textAlign: 'center',
  },
  sheetHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  sheetHintText: {
    ...typography.caption,
    color: dark.teal,
    fontWeight: '600',
  },
  /* No-session select header */
  selectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  selectHeaderText: {
    ...typography.caption,
    color: dark.textSecondary,
  },
  selectNearbyBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: 'rgba(13, 148, 136, 0.15)',
  },
  selectNearbyText: {
    ...typography.caption,
    color: dark.teal,
    fontWeight: '600',
  },
  button: {
    marginTop: spacing.lg,
    backgroundColor: dark.teal,
    borderRadius: 10,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonText: {
    ...typography.body,
    color: dark.text,
    fontWeight: '600',
  },
  errorToast: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: dark.danger,
    color: dark.dangerText,
  },
  waitingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  waitingTitle: {
    ...typography.title,
    color: dark.text,
    textAlign: 'center',
  },
  waitingBody: {
    ...typography.body,
    color: dark.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: dark.surface,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: dark.border,
  },
  refreshButtonText: {
    ...typography.body,
    color: dark.text,
    fontWeight: '600',
  },
  handoffList: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  handoffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: dark.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: dark.border,
  },
  handoffTitle: {
    ...typography.body,
    color: dark.text,
    fontWeight: '600',
  },
  handoffMeta: {
    ...typography.caption,
    color: dark.textSecondary,
    marginTop: 2,
  },
  handoffStartBtn: {
    backgroundColor: dark.teal,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  handoffStartText: {
    ...typography.body,
    color: dark.text,
    fontWeight: '700',
  },
  errorText: {
    ...typography.caption,
    color: dark.dangerText,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
});
