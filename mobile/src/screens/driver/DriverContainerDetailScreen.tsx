import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import MapView, { Marker } from 'react-native-maps';
import Animated, { FadeInUp, ZoomIn } from 'react-native-reanimated';

import { useActiveCollection, useMarkVisited } from '../../hooks/useCollections';
import { useWasteBins } from '../../hooks/useWasteBins';
import { dark, spacing, typography } from '../../theme';
import { DriverContainersStackParamList } from '../../types/navigation';
import { WasteBin } from '../../types/models';
import { getUrgencyColor } from '../../utils/urgency';
import { formatRelativeTime, getDataFreshness } from '../../utils/formatTime';
import PulsingDot from '../../components/shared/PulsingDot';

export default function DriverContainerDetailScreen() {
  const { t } = useTranslation();
  const route = useRoute<RouteProp<DriverContainersStackParamList, 'DriverContainerDetail'>>();
  const { containerId } = route.params;

  const { data: session } = useActiveCollection();
  const { data: bins } = useWasteBins();
  const markVisitedMutation = useMarkVisited();

  const sessionEntry = useMemo(() => {
    return session?.selectedContainers?.find(
      (entry) => entry.container._id === containerId,
    );
  }, [session, containerId]);

  const container: WasteBin | undefined = useMemo(() => {
    if (sessionEntry) return sessionEntry.container;
    return bins?.find((bin) => bin._id === containerId);
  }, [sessionEntry, bins, containerId]);

  const isInSession = Boolean(sessionEntry);
  const isUnvisited = isInSession && !sessionEntry?.visited;

  const fullness = container?.fullness ?? 0;
  const fullnessColor = getUrgencyColor(container?.fullness);
  const coords = container?.location?.coordinates;
  const hasLocation = coords && coords.length === 2;
  const freshness = getDataFreshness(container?.lastUpdate);

  const handleMarkVisited = () => {
    if (!session?.sessionId || !containerId || markVisitedMutation.isPending) return;
    markVisitedMutation.mutate({ sessionId: session.sessionId, containerId });
  };

  const handleOpen2Gis = () => {
    if (!hasLocation) return;
    const lat = coords[1];
    const lng = coords[0];
    const appUrl = `dgis://2gis.ru/routeSearch/rsType/car/to/${lat},${lng}`;
    const webUrl = `https://2gis.com/routeSearch/rsType/car/to/${lat},${lng}`;
    Linking.openURL(appUrl).catch(() => Linking.openURL(webUrl));
  };

  const handleOpenAppleMaps = () => {
    if (!hasLocation) return;
    const lat = coords[1];
    const lng = coords[0];
    const url = Platform.select({
      ios: `http://maps.apple.com/?daddr=${lat},${lng}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}`,
    });
    if (url) Linking.openURL(url).catch(() => undefined);
  };

  if (!container) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>{t('driver.containerDetail.title')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Ambient glow */}
        <View style={styles.glowTop} />

        {/* Fullness Gauge */}
        <Animated.View entering={ZoomIn.springify()} style={styles.gaugeContainer}>
          <View style={styles.gaugeOuter}>
            <View style={[styles.gaugeRing, { borderColor: fullnessColor }]}>
              <Text style={[styles.gaugeValue, { color: fullnessColor }]}>{fullness}%</Text>
              <Text style={styles.gaugeLabel}>{t('driver.containerDetail.fullness')}</Text>
            </View>
          </View>
          <Text style={styles.containerIdText}>{container.binId ?? containerId}</Text>
        </Animated.View>

        {/* Info Card */}
        <Animated.View entering={FadeInUp.delay(150).springify()} style={styles.infoCard}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="trash-can-outline" size={18} color={dark.teal} />
            <Text style={styles.infoLabel}>{t('driver.containerDetail.wasteType')}</Text>
            <Text style={styles.infoValue}>{container.wasteType ?? '--'}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="domain" size={18} color={dark.teal} />
            <Text style={styles.infoLabel}>{t('driver.containerDetail.department')}</Text>
            <Text style={styles.infoValue}>{container.department ?? '--'}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="information-outline" size={18} color={dark.teal} />
            <Text style={styles.infoLabel}>{t('driver.containerDetail.status')}</Text>
            <Text style={styles.infoValue}>{container.status ?? '--'}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="thermometer" size={18} color={dark.teal} />
            <Text style={styles.infoLabel}>{t('driver.containerDetail.temperature')}</Text>
            <Text style={styles.infoValue}>{container.temperature != null ? `${container.temperature}°C` : '--'}</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <MaterialCommunityIcons name="clock-outline" size={18} color={dark.teal} />
            <Text style={styles.infoLabel}>{t('driver.containerDetail.lastUpdate')}</Text>
            <View style={styles.updateValue}>
              <PulsingDot freshness={freshness} />
              <Text style={styles.infoValue}>{formatRelativeTime(container.lastUpdate, t)}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Mark Visited button */}
        {isUnvisited && (
          <Animated.View entering={FadeInUp.delay(200).springify()}>
            <TouchableOpacity style={styles.markVisitedButton} onPress={handleMarkVisited}>
              {markVisitedMutation.isPending ? (
                <ActivityIndicator color={dark.text} />
              ) : (
                <>
                  <MaterialCommunityIcons name="check-circle-outline" size={18} color={dark.text} />
                  <Text style={styles.markVisitedText}>{t('driver.containerDetail.markVisited')}</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Location Card */}
        <Animated.View entering={FadeInUp.delay(250).springify()} style={styles.locationCard}>
          <Text style={styles.locationTitle}>{t('driver.containerDetail.location')}</Text>
          {hasLocation ? (
            <>
              <View style={styles.mapContainer}>
                <MapView
                  style={styles.map}
                  initialRegion={{
                    latitude: coords[1],
                    longitude: coords[0],
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                >
                  <Marker
                    coordinate={{ latitude: coords[1], longitude: coords[0] }}
                    pinColor={dark.teal}
                  />
                </MapView>
              </View>

              {/* Navigation buttons */}
              <Text style={styles.actionsLabel}>{t('driver.containerDetail.actions')}</Text>
              <View style={styles.navButtons}>
                <TouchableOpacity style={styles.navPrimary} onPress={handleOpen2Gis}>
                  <MaterialCommunityIcons name="navigation-variant" size={16} color={dark.text} />
                  <Text style={styles.navPrimaryText}>{t('driver.containerDetail.open2gis')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navSecondary} onPress={handleOpenAppleMaps}>
                  <MaterialCommunityIcons name="apple" size={16} color="#f8fafc" />
                  <Text style={styles.navSecondaryText}>{t('driver.containerDetail.openApple')}</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <Text style={styles.noLocationText}>{t('driver.containerDetail.noLocation')}</Text>
          )}
        </Animated.View>
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
    paddingBottom: spacing.xxl,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowTop: {
    position: 'absolute',
    top: -80,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: dark.tealGlow,
    opacity: 0.4,
  },
  gaugeContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  gaugeOuter: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: dark.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: dark.border,
  },
  gaugeRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dark.card,
  },
  gaugeValue: {
    fontSize: 32,
    fontWeight: '800',
  },
  gaugeLabel: {
    ...typography.caption,
    color: dark.textSecondary,
    marginTop: 2,
  },
  containerIdText: {
    ...typography.body,
    fontWeight: '600',
    color: dark.text,
    marginTop: spacing.md,
  },
  infoCard: {
    backgroundColor: dark.surface,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: dark.border,
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: dark.border,
  },
  infoLabel: {
    ...typography.caption,
    color: dark.muted,
    flex: 1,
    marginLeft: spacing.sm,
  },
  infoValue: {
    ...typography.body,
    color: dark.text,
    fontWeight: '600',
  },
  updateValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  markVisitedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dark.teal,
    borderRadius: 12,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
    shadowColor: dark.teal,
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  markVisitedText: {
    color: dark.text,
    fontWeight: '700',
  },
  locationCard: {
    backgroundColor: dark.surface,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: dark.border,
  },
  locationTitle: {
    ...typography.body,
    fontWeight: '600',
    color: dark.text,
    marginBottom: spacing.md,
  },
  mapContainer: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  map: {
    flex: 1,
  },
  actionsLabel: {
    ...typography.caption,
    color: dark.muted,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  navButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  navPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dark.teal,
    borderRadius: 10,
    paddingVertical: spacing.md,
    gap: spacing.xs,
    shadowColor: dark.teal,
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  navPrimaryText: {
    color: dark.text,
    fontWeight: '600',
  },
  navSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  navSecondaryText: {
    color: '#f8fafc',
    fontWeight: '600',
  },
  noLocationText: {
    ...typography.caption,
    color: dark.textSecondary,
  },
  emptyText: {
    ...typography.body,
    color: dark.textSecondary,
  },
});
