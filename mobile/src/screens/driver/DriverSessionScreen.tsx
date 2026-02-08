import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PanResponder,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { RouteProp, useIsFocused, useRoute } from '@react-navigation/native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { useActiveCollection, useStopCollection } from '../../hooks/useCollections';
import { useHandoffs } from '../../hooks/useHandoffs';
import DriverRoutePanel from '../../components/DriverRoutePanel';
import DriverHandoffTimeline from '../../components/DriverHandoffTimeline';
import { dark, spacing, typography } from '../../theme';
import { Handoff } from '../../types/models';
import { DriverTabParamList } from '../../types/navigation';

const HANDOFF_POLL_INTERVAL = 10000;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

type SessionTab = 'route' | 'handoffs';

function getSessionHandoffs(handoffs: Handoff[] | undefined, sessionId?: string, sessionMongoId?: string) {
  if (!handoffs || (!sessionId && !sessionMongoId)) return [];
  return handoffs.filter((handoff) => {
    if (!handoff.session) return false;
    return handoff.session.sessionId === sessionId || handoff.session._id === sessionMongoId;
  });
}

const SESSION_STEPS = ['collect', 'handoff', 'incinerate', 'done'] as const;

export default function DriverSessionScreen() {
  const { t } = useTranslation();
  const route = useRoute<RouteProp<DriverTabParamList, 'DriverSession'>>();
  const isFocused = useIsFocused();
  const { data: session } = useActiveCollection();
  const stopMutation = useStopCollection();
  const [activeTab, setActiveTab] = useState<SessionTab>('route');
  const [focusId, setFocusId] = useState<string | undefined>(undefined);
  const [completionVisible, setCompletionVisible] = useState(false);
  const completionTriggered = useRef(false);
  const lastPendingCount = useRef(0);
  const scrollRef = useRef<ScrollView>(null);
  const programmaticScroll = useRef(false);
  const [contentHeight, setContentHeight] = useState(0);
  const tabPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 10 && Math.abs(gesture.dy) < 10,
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx < -30) {
          setActiveTab('handoffs');
        } else if (gesture.dx > 30) {
          setActiveTab('route');
        }
      },
    }),
  ).current;

  const { data: handoffs, isLoading, refetch, isFetching } = useHandoffs({
    enabled: Boolean(session) && isFocused,
    refetchInterval: isFocused ? HANDOFF_POLL_INTERVAL : false,
  });

  const sessionHandoffs = useMemo(
    () => getSessionHandoffs(handoffs, session?.sessionId, session?._id),
    [handoffs, session?.sessionId, session?._id],
  );

  const incinerationHandoff = useMemo(() => (
    sessionHandoffs
      .filter((handoff) => handoff.type === 'driver_to_incinerator')
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))[0]
  ), [sessionHandoffs]);

  const pendingFacilityCount = useMemo(() => (
    sessionHandoffs.filter((handoff) => (
      handoff.type === 'facility_to_driver' &&
      !['completed', 'disputed', 'resolved', 'expired'].includes(handoff.status)
    )).length
  ), [sessionHandoffs]);

  const pendingFacilityHandoffId = useMemo(() => {
    const pending = sessionHandoffs.find((handoff) => (
      handoff.type === 'facility_to_driver' &&
      !['completed', 'disputed', 'resolved', 'expired'].includes(handoff.status)
    ));
    return pending?._id;
  }, [sessionHandoffs]);

  const canCreateIncineration = useMemo(() => {
    if (!session) return false;
    const facilityHandoffs = sessionHandoffs.filter((handoff) => handoff.type === 'facility_to_driver');
    const incinerationExists = sessionHandoffs.some((handoff) => handoff.type === 'driver_to_incinerator');
    const visited = session.selectedContainers?.some((item) => item.visited) ?? false;
    return facilityHandoffs.length > 0 &&
      facilityHandoffs.every((handoff) => handoff.status === 'completed') &&
      visited &&
      !incinerationExists;
  }, [session, sessionHandoffs]);

  const pendingCount = pendingFacilityCount + (canCreateIncineration ? 1 : 0);

  const currentStep = useMemo(() => {
    if (!session) return 0;
    if (session.status === 'completed') return 3;
    if (incinerationHandoff?.status === 'completed') return 3;
    if (incinerationHandoff) return 2;
    const hasFacility = sessionHandoffs.some((h) => h.type === 'facility_to_driver');
    if (hasFacility) return 1;
    return 0;
  }, [session, incinerationHandoff, sessionHandoffs]);

  useEffect(() => {
    if (route.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [route.params?.initialTab]);

  // Sync activeTab → scroll position
  useEffect(() => {
    if (contentHeight === 0) return;
    const targetX = activeTab === 'route' ? 0 : SCREEN_WIDTH;
    programmaticScroll.current = true;
    scrollRef.current?.scrollTo({ x: targetX, animated: true });
    const timer = setTimeout(() => { programmaticScroll.current = false; }, 500);
    return () => clearTimeout(timer);
  }, [activeTab, contentHeight]);

  useEffect(() => {
    if (!session) return;
    if (pendingCount > 0 && lastPendingCount.current === 0) {
      setActiveTab('handoffs');
      setFocusId(pendingFacilityHandoffId ?? (canCreateIncineration ? 'incineration' : undefined));
    }
    lastPendingCount.current = pendingCount;
  }, [pendingCount, pendingFacilityHandoffId, canCreateIncineration, session]);

  useEffect(() => {
    if (!session || !incinerationHandoff) return;
    if (completionTriggered.current) return;
    if (incinerationHandoff.status !== 'completed') return;

    completionTriggered.current = true;
    setCompletionVisible(true);
  }, [incinerationHandoff, session, stopMutation, refetch]);

  const handleCloseCompletion = () => {
    setCompletionVisible(false);
    if (!session || stopMutation.isPending || session.status === 'completed') return;
    stopMutation.mutate(session.sessionId, {
      onSuccess: () => {
        refetch();
      },
    });
  };

  const handlePageScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (programmaticScroll.current) return;
    const x = event.nativeEvent.contentOffset.x;
    const newTab: SessionTab = x > SCREEN_WIDTH / 2 ? 'handoffs' : 'route';
    if (newTab !== activeTab) {
      setActiveTab(newTab);
    }
  }, [activeTab]);

  const pageIndex = activeTab === 'route' ? 0 : 1;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Compact progress strip */}
        {session && (
          <View style={styles.progressStrip} {...tabPanResponder.panHandlers}>
            <View style={styles.progressRow}>
              <View style={styles.progressSteps}>
                {SESSION_STEPS.map((step, i) => (
                  <React.Fragment key={step}>
                    <View style={[styles.progressDot, i <= currentStep && styles.progressDotActive]}>
                      <Text style={[styles.progressDotText, i <= currentStep && styles.progressDotTextActive]}>
                        {i + 1}
                      </Text>
                    </View>
                    {i < SESSION_STEPS.length - 1 && (
                      <View style={[styles.progressLine, i < currentStep && styles.progressLineActive]} />
                    )}
                  </React.Fragment>
                ))}
              </View>
              {/* Page indicator */}
              <View style={styles.pageIndicator}>
                <View style={[styles.pageDot, pageIndex === 0 && styles.pageDotActive]} />
                <View style={styles.pageDotGap} />
                <View style={styles.pageDotWrapper}>
                  <View style={[styles.pageDot, pageIndex === 1 && styles.pageDotActive]} />
                  {pendingCount > 0 && <View style={styles.pageBadge} />}
                </View>
              </View>
            </View>
            <View style={styles.tabRow} {...tabPanResponder.panHandlers}>
              <TouchableOpacity
                style={[styles.tabPill, activeTab === 'route' && styles.tabPillActive]}
                onPress={() => setActiveTab('route')}
                activeOpacity={0.7}
                hitSlop={10}
              >
                <Text style={[styles.tabText, activeTab === 'route' && styles.tabTextActive]}>
                  {t('driver.session.route')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabPill, activeTab === 'handoffs' && styles.tabPillActive]}
                onPress={() => setActiveTab('handoffs')}
                activeOpacity={0.7}
                hitSlop={10}
              >
                <Text style={[styles.tabText, activeTab === 'handoffs' && styles.tabTextActive]}>
                  {t('driver.session.handoffs')}
                </Text>
                {pendingCount > 0 && <View style={styles.tabBadge} />}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Content */}
        {!session ? (
          <DriverRoutePanel showTitle />
        ) : (
          <View
            style={styles.pagerContainer}
            onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}
          >
            {contentHeight > 0 && (
              <ScrollView
                ref={scrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handlePageScroll}
                scrollEventThrottle={16}
              >
                <View style={{ width: SCREEN_WIDTH, height: contentHeight }}>
                  <DriverRoutePanel />
                </View>
                <View style={{ width: SCREEN_WIDTH, height: contentHeight }}>
                  <DriverHandoffTimeline
                    session={session}
                    handoffs={sessionHandoffs}
                    isLoading={isLoading}
                    isFetching={isFetching}
                    onRefresh={refetch}
                    focusHandoffId={route.params?.focusHandoffId ?? focusId}
                  />
                </View>
              </ScrollView>
            )}
          </View>
        )}
      </View>

      <Modal visible={completionVisible} transparent animationType="fade">
        <View style={styles.completionOverlay}>
          <Animated.View
            entering={ZoomIn.springify()}
            style={styles.completionCard}
          >
            <Text style={styles.completionTitle}>{t('driver.session.completedTitle')}</Text>
            <Text style={styles.completionBody}>{t('driver.session.completedBody')}</Text>
            <TouchableOpacity style={styles.completionButton} onPress={handleCloseCompletion}>
              <Text style={styles.completionButtonText}>{t('driver.session.completedCta')}</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: dark.bg,
  },
  container: {
    flex: 1,
  },
  progressStrip: {
    backgroundColor: dark.surface,
    borderBottomWidth: 1,
    borderBottomColor: dark.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  tabPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.card,
  },
  tabPillActive: {
    borderColor: dark.teal,
    backgroundColor: 'rgba(13, 148, 136, 0.2)',
  },
  tabText: {
    ...typography.caption,
    color: dark.muted,
    fontWeight: '600',
  },
  tabTextActive: {
    color: dark.teal,
  },
  tabBadge: {
    position: 'absolute',
    top: 6,
    right: 14,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: dark.amber,
  },
  progressSteps: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: dark.card,
    borderWidth: 2,
    borderColor: dark.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotActive: {
    backgroundColor: 'rgba(13, 148, 136, 0.2)',
    borderColor: dark.teal,
  },
  progressDotText: {
    fontSize: 10,
    fontWeight: '700',
    color: dark.muted,
  },
  progressDotTextActive: {
    color: dark.teal,
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: dark.border,
    marginHorizontal: 4,
  },
  progressLineActive: {
    backgroundColor: dark.teal,
  },
  pageIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.lg,
  },
  pageDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: dark.muted,
  },
  pageDotActive: {
    backgroundColor: dark.teal,
    width: 14,
    borderRadius: 3,
  },
  pageDotGap: {
    width: 4,
  },
  pageDotWrapper: {
    position: 'relative',
  },
  pageBadge: {
    position: 'absolute',
    top: -3,
    right: -4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: dark.amber,
  },
  pagerContainer: {
    flex: 1,
  },
  completionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  completionCard: {
    width: '100%',
    backgroundColor: dark.surface,
    borderRadius: 16,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: dark.border,
  },
  completionTitle: {
    ...typography.title,
    color: dark.text,
    textAlign: 'center',
  },
  completionBody: {
    ...typography.body,
    color: dark.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  completionButton: {
    backgroundColor: dark.teal,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  completionButtonText: {
    ...typography.body,
    color: dark.text,
    fontWeight: '600',
  },
});
