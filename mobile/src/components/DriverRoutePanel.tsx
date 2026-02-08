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
  useMarkVisited,
  useStartCollection,
  useStopCollection,
} from '../hooks/useCollections';
import { useWasteBins } from '../hooks/useWasteBins';
import { dark, spacing, typography } from '../theme';
import { googleDirectionsApiKey } from '../utils/env';
import { haversineDistance, formatDistance } from '../utils/distance';
import ContainerCard from './shared/ContainerCard';
import AnimatedProgressBar from './shared/AnimatedProgressBar';
import { getUrgencyColor } from '../utils/urgency';

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
  const stopMutation = useStopCollection();
  const markVisitedMutation = useMarkVisited();
  const startMutation = useStartCollection();
  const {
    data: bins,
    isLoading: binsLoading,
    isFetching: binsFetching,
    refetch: refetchBins,
  } = useWasteBins();
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [selectedContainers, setSelectedContainers] = useState<string[]>([]);
  const [routeCoords, setRouteCoords] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [routeMeta, setRouteMeta] = useState<{ distance?: string; duration?: string } | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [waypointOrder, setWaypointOrder] = useState<number[]>([]);

  const snapPoints = useMemo(() => ['12%', '50%', '85%'], []);
  const sheetRef = useRef<BottomSheet>(null);

  const containerMarkers = useMemo(() => (
    data?.selectedContainers
      ?.map((entry) => {
        const coords = entry.container.location?.coordinates;
        if (!coords || coords.length !== 2) return null;
        return {
          id: entry.container._id,
          title: entry.container.binId ?? t('driver.route.container'),
          latitude: coords[1],
          longitude: coords[0],
          visited: entry.visited,
          fullness: entry.container.fullness,
          temperature: entry.container.temperature,
          wasteType: entry.container.wasteType,
          lastUpdate: entry.container.lastUpdate,
          binId: entry.container.binId,
        };
      })
      .filter((marker): marker is NonNullable<typeof marker> => Boolean(marker)) ?? []
  ), [data?.selectedContainers, t]);

  const unvisitedMarkers = useMemo(
    () => containerMarkers.filter((m) => !m.visited),
    [containerMarkers],
  );

  const availableMarkers = useMemo(() => (
    bins
      ?.map((bin) => {
        const coords = bin.location?.coordinates;
        if (!coords || coords.length !== 2) return null;
        return {
          id: bin._id,
          title: bin.binId ?? t('driver.route.container'),
          latitude: coords[1],
          longitude: coords[0],
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

  const visitedCount = data?.selectedContainers?.filter((e) => e.visited).length ?? 0;
  const totalCount = data?.selectedContainers?.length ?? 0;

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
      return {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
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

  const toggleContainer = (containerId: string) => {
    setSelectedContainers((prev) => (
      prev.includes(containerId)
        ? prev.filter((id) => id !== containerId)
        : [...prev, containerId]
    ));
  };

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
          setRouteCoords(decodePolyline(points));
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

  const selectNearby = () => {
    if (!currentLocation) return;
    const radiusMeters = 500;

    const nearbyIds = availableMarkers
      .filter((marker) => (
        haversineDistance(
          currentLocation.coords.latitude,
          currentLocation.coords.longitude,
          marker.latitude,
          marker.longitude,
        ) <= radiusMeters
      ))
      .map((marker) => marker.id);

    if (!nearbyIds.length) return;
    setSelectedContainers((prev) => Array.from(new Set([...prev, ...nearbyIds])));
  };

  const handleStart = async () => {
    if (startMutation.isPending) return;

    let startLocation: { type: 'Point'; coordinates: [number, number] } | undefined;

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status === 'granted') {
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        startLocation = {
          type: 'Point',
          coordinates: [position.coords.longitude, position.coords.latitude],
        };
      }
    } catch (error) {
      console.warn('Unable to get start location', error);
    }

    startMutation.mutate(
      {
        containerIds: selectedContainers.length ? selectedContainers : undefined,
        startLocation,
      },
      {
        onSuccess: () => {
          setSelectedContainers([]);
        },
      },
    );
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

  const sessionItems = data?.selectedContainers ?? [];
  const isNextStop = (id: string) => nextStopMarker?.id === id;

  return (
    <View style={styles.root}>
      {showTitle ? <Text style={styles.title}>{t('driver.route.title')}</Text> : null}
      {mapRegion ? (
        <MapView style={styles.map} region={mapRegion}>
          {currentLocation ? (
            <Marker
              coordinate={{
                latitude: currentLocation.coords.latitude,
                longitude: currentLocation.coords.longitude,
              }}
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
          {(data ? containerMarkers : availableMarkers).map((marker) => {
            const stopNum = markerStopNumbers[marker.id];
            const isVisited = 'visited' in marker && marker.visited;
            return (
              <Marker
                key={marker.id}
                coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
                title={stopNum ? `#${stopNum} ${marker.title}` : marker.title}
                pinColor={
                  data
                    ? (isNextStop(marker.id)
                      ? dark.teal
                      : (isVisited ? dark.muted : dark.successText))
                    : (selectedContainers.includes(marker.id) ? dark.teal : dark.muted)
                }
                onPress={() => {
                  if (!data) {
                    toggleContainer(marker.id);
                  }
                }}
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
      >
        {data ? (
          <BottomSheetFlatList
            data={sessionItems}
            keyExtractor={(item) => item.container._id}
            contentContainerStyle={styles.sheetContent}
            refreshControl={
              <RefreshControl
                refreshing={isFetching || binsFetching}
                onRefresh={() => {
                  refetch();
                  refetchBins();
                }}
              />
            }
            ListHeaderComponent={
              <>
                {/* Peek row — visible when sheet collapsed */}
                {nextStopMarker && (
                  <View style={styles.peekRow}>
                    <View style={styles.peekInfo}>
                      <Text style={styles.peekLabel}>{t('driver.route.nextStop')}</Text>
                      <Text style={styles.peekBinId}>{nextStopMarker.binId ?? t('driver.route.container')}</Text>
                    </View>
                    <Text style={styles.peekDistance}>
                      {[
                        containerDistances[nextStopMarker.id] != null ? formatDistance(containerDistances[nextStopMarker.id]) : null,
                        routeMeta?.duration,
                      ].filter(Boolean).join(' · ')}
                    </Text>
                    <TouchableOpacity
                      style={styles.peekNavIcon}
                      onPress={() => handleOpen2Gis(nextStopMarker.latitude, nextStopMarker.longitude)}
                    >
                      <MaterialCommunityIcons name="navigation-variant" size={18} color={dark.text} />
                    </TouchableOpacity>
                  </View>
                )}
                {nextStopMarker && (
                  <View style={styles.peekBarRow}>
                    <View style={styles.peekBarWrap}>
                      <AnimatedProgressBar fullness={nextStopMarker.fullness ?? 0} color={getUrgencyColor(nextStopMarker.fullness)} height={4} />
                    </View>
                    <TouchableOpacity
                      style={styles.peekVisitBtn}
                      onPress={() => handleMarkVisited(nextStopMarker.id)}
                    >
                      <MaterialCommunityIcons name="check-circle-outline" size={14} color={dark.teal} />
                      <Text style={styles.peekVisitText}>{t('driver.route.markVisited')}</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {/* Route progress */}
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
                <Text style={styles.sectionTitle}>{t('driver.route.containersTitle')}</Text>
              </>
            }
            renderItem={({ item: entry, index }) => (
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
                onPress={() => {
                  if (!entry.visited) handleMarkVisited(entry.container._id);
                }}
              />
            )}
            ListFooterComponent={
              <TouchableOpacity style={styles.button} onPress={handleStop}>
                {stopMutation.isPending ? (
                  <ActivityIndicator color={dark.text} />
                ) : (
                  <Text style={styles.buttonText}>{t('driver.route.endSession')}</Text>
                )}
              </TouchableOpacity>
            }
            ListEmptyComponent={
              <Text style={styles.emptyText}>{t('driver.route.noContainers')}</Text>
            }
          />
        ) : (
          <BottomSheetFlatList
            data={bins ?? []}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.sheetContent}
            refreshControl={
              <RefreshControl
                refreshing={isFetching || binsFetching}
                onRefresh={() => {
                  refetch();
                  refetchBins();
                }}
              />
            }
            ListHeaderComponent={
              <>
                <Text style={styles.sectionTitle}>{t('driver.route.startTitle')}</Text>
                <Text style={styles.emptyText}>{t('driver.route.startBody')}</Text>
                <View style={styles.selectHeader}>
                  <Text style={styles.selectHeaderText}>
                    {t('driver.route.selectedCount', { count: selectedContainers.length })}
                  </Text>
                  <TouchableOpacity style={styles.selectNearbyBtn} onPress={selectNearby}>
                    <Text style={styles.selectNearbyText}>{t('driver.route.selectNearby')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            }
            renderItem={({ item: bin }) => {
              const isSelected = selectedContainers.includes(bin._id);
              return (
                <TouchableOpacity
                  style={styles.selectRow}
                  onPress={() => toggleContainer(bin._id)}
                >
                  <View style={styles.selectIcon}>
                    <MaterialCommunityIcons
                      name={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                      size={20}
                      color={isSelected ? dark.teal : dark.muted}
                    />
                  </View>
                  <View style={styles.selectText}>
                    <Text style={styles.itemTitle}>{bin.binId ?? t('driver.route.container')}</Text>
                    <Text style={styles.itemSubtitle}>
                      {t('driver.route.fill')}: {bin.fullness ?? 'n/a'}%
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
            ListFooterComponent={
              <TouchableOpacity style={styles.button} onPress={handleStart}>
                {startMutation.isPending ? (
                  <ActivityIndicator color={dark.text} />
                ) : (
                  <Text style={styles.buttonText}>{t('driver.route.startSession')}</Text>
                )}
              </TouchableOpacity>
            }
            ListEmptyComponent={
              binsLoading ? (
                <ActivityIndicator color={dark.teal} />
              ) : (
                <Text style={styles.emptyText}>{t('driver.route.noCompanyContainers')}</Text>
              )
            }
          />
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
    backgroundColor: dark.bg,
  },
  sheetHandle: {
    backgroundColor: dark.muted,
  },
  sheetContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
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
    marginRight: spacing.sm,
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
    marginBottom: spacing.sm,
  },
  routeProgressText: {
    ...typography.caption,
    color: dark.teal,
    fontWeight: '600',
    textAlign: 'center',
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
});
