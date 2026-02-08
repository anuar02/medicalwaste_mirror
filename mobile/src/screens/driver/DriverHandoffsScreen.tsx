import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';

import { useActiveCollection } from '../../hooks/useCollections';
import {
  useConfirmHandoff,
  useCreateIncineratorHandoff,
  useDisputeHandoff,
  useHandoffs,
} from '../../hooks/useHandoffs';
import { useIncinerationPlants } from '../../hooks/useIncinerationPlants';
import { colors, spacing, typography } from '../../theme';
import { CONFIRMATION_BASE_URL } from '../../utils/constants';
import { Handoff } from '../../types/models';

type StepState = 'completed' | 'pending' | 'future' | 'disputed' | 'expired';

const STATUS_COLORS = {
  completed: { bg: '#16a34a', text: '#f8fafc' },
  pending: { bg: '#fef3c7', text: '#b45309' },
  created: { bg: '#e2e8f0', text: '#475569' },
  confirmed_by_sender: { bg: '#dbeafe', text: '#1d4ed8' },
  confirmed_by_receiver: { bg: '#dbeafe', text: '#1d4ed8' },
  disputed: { bg: '#fee2e2', text: '#b91c1c' },
  resolving: { bg: '#fee2e2', text: '#b91c1c' },
  resolved: { bg: '#dcfce7', text: '#15803d' },
  expired: { bg: '#f1f5f9', text: '#64748b' },
  default: { bg: '#e2e8f0', text: '#475569' },
} as const;

const NODE_COLORS = {
  completed: '#16a34a',
  pending: '#d97706',
  disputed: '#dc2626',
  expired: '#94a3b8',
  future: '#94a3b8',
} as const;

const TIMELINE_LINE = '#cbd5e1';

const DISPUTE_REASON_KEYS = ['weight', 'count', 'damaged', 'other'] as const;

function formatDateTime(value?: string) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString();
}

function formatTime(value?: string) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleTimeString();
}

function formatNumber(value?: number) {
  if (value == null || Number.isNaN(value)) return '--';
  const rounded = Math.round(value * 10) / 10;
  return rounded % 1 === 0 ? String(rounded.toFixed(0)) : String(rounded.toFixed(1));
}

function getHandoffTotals(handoff?: Handoff) {
  const totalContainers = handoff?.totalContainers ?? handoff?.containers?.length ?? 0;
  const declaredWeight = handoff?.totalDeclaredWeight;
  if (declaredWeight != null) {
    return { totalContainers, totalWeight: declaredWeight };
  }
  const totalWeight =
    handoff?.containers?.reduce((sum, item) => sum + (item.declaredWeight ?? 0), 0) ?? 0;
  return { totalContainers, totalWeight };
}

function getWasteTypes(handoff?: Handoff) {
  if (!handoff?.containers?.length) return null;
  const types = new Set<string>();
  handoff.containers.forEach((container) => {
    if (container.wasteType) types.add(container.wasteType);
    if (container.wasteClass) types.add(container.wasteClass);
  });
  if (!types.size) return null;
  return Array.from(types).join(', ');
}

function getStepStateForHandoff(handoff?: Handoff): StepState {
  if (!handoff) return 'future';
  if (handoff.status === 'completed') return 'completed';
  if (handoff.status === 'expired') return 'expired';
  if (['disputed', 'resolving', 'resolved'].includes(handoff.status)) return 'disputed';
  return 'pending';
}

export default function DriverHandoffsScreen() {
  const { t } = useTranslation();
  const { data: handoffs, isLoading: isHandoffsLoading, refetch, isFetching } = useHandoffs();
  const confirmMutation = useConfirmHandoff();
  const createMutation = useCreateIncineratorHandoff();
  const disputeMutation = useDisputeHandoff();
  const { data: session } = useActiveCollection();
  const {
    data: plants,
    isLoading: isPlantsLoading,
    error: plantsError,
  } = useIncinerationPlants();

  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [disputeModalVisible, setDisputeModalVisible] = useState(false);
  const [disputeHandoffId, setDisputeHandoffId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState<string>('');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [disputeError, setDisputeError] = useState<string | null>(null);

  const pulse = useRef(new Animated.Value(1)).current;
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.5, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  useEffect(() => () => {
    if (copyTimeout.current) clearTimeout(copyTimeout.current);
  }, []);

  const sessionHandoffs = useMemo(() => {
    if (!session) return [];
    return (handoffs ?? []).filter((handoff) => {
      if (!handoff.session) return false;
      return handoff.session._id === session._id || handoff.session.sessionId === session.sessionId;
    });
  }, [handoffs, session]);

  const facilityHandoffs = useMemo(() => (
    sessionHandoffs
      .filter((handoff) => handoff.type === 'facility_to_driver')
      .sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''))
  ), [sessionHandoffs]);

  const incinerationHandoff = useMemo(() => (
    sessionHandoffs
      .filter((handoff) => handoff.type === 'driver_to_incinerator')
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))[0]
  ), [sessionHandoffs]);

  const visitedContainers = session?.selectedContainers?.filter((item) => item.visited) ?? [];
  const totalVisitedWeight = visitedContainers.reduce(
    (sum, item) => sum + (item.collectedWeight ?? 0),
    0,
  );

  const canCreateIncineration =
    Boolean(session) &&
    facilityHandoffs.every((handoff) => handoff.status === 'completed') &&
    facilityHandoffs.length > 0 &&
    visitedContainers.length > 0 &&
    !incinerationHandoff;

  const confirmationToken = createMutation.data?.confirmationToken;
  const confirmationUrl = confirmationToken ? `${CONFIRMATION_BASE_URL}/${confirmationToken}` : null;

  const statusMeta = (status?: string) => {
    const key = (status ?? 'default') as keyof typeof STATUS_COLORS;
    const colorset = STATUS_COLORS[key] ?? STATUS_COLORS.default;
    let label = t('handoff.status.default');
    switch (status) {
      case 'created':
        label = t('handoff.status.created');
        break;
      case 'pending':
        label = t('handoff.status.pending');
        break;
      case 'confirmed_by_sender':
        label = t('handoff.status.confirmedBySender');
        break;
      case 'confirmed_by_receiver':
        label = t('handoff.status.confirmedByReceiver');
        break;
      case 'completed':
        label = t('handoff.status.completed');
        break;
      case 'disputed':
        label = t('handoff.status.disputed');
        break;
      case 'resolving':
        label = t('handoff.status.disputed');
        break;
      case 'resolved':
        label = t('handoff.status.resolved');
        break;
      case 'expired':
        label = t('handoff.status.expired');
        break;
      default:
        break;
    }
    return { label, ...colorset };
  };

  const handleConfirm = (handoff: Handoff) => {
    if (confirmMutation.isPending) return;
    const { totalContainers, totalWeight } = getHandoffTotals(handoff);
    const name = handoff.sender?.name ?? t('handoff.card.facilityFallback');
    Alert.alert(
      t('handoff.confirm.title'),
      t('handoff.confirm.body', {
        count: totalContainers,
        weight: formatNumber(totalWeight),
        name,
      }),
      [
        { text: t('handoff.confirm.cancel'), style: 'cancel' },
        {
          text: t('handoff.confirm.ok'),
          onPress: () => {
            setConfirmError(null);
            confirmMutation.mutate(handoff._id, {
              onSuccess: () => {
                refetch();
                setExpandedIds((prev) => ({ ...prev, [handoff._id]: false }));
              },
              onError: (error) => {
                setConfirmError(error instanceof Error ? error.message : t('handoff.errors.confirm'));
              },
            });
          },
        },
      ],
    );
  };

  const handleCreateIncinerator = () => {
    if (!session?.sessionId) {
      setCreateError(t('handoff.errors.noSession'));
      return;
    }
    if (!selectedPlantId) {
      setCreateError(t('handoff.errors.selectPlant'));
      return;
    }
    if (visitedContainers.length === 0) {
      setCreateError(t('handoff.errors.noContainers'));
      return;
    }
    if (createMutation.isPending) return;

    const plantName = plants?.find((plant) => plant._id === selectedPlantId)?.name ?? '';

    Alert.alert(
      t('handoff.incineration.confirmTitle'),
      t('handoff.incineration.confirmBody', {
        count: visitedContainers.length,
        weight: formatNumber(totalVisitedWeight),
        plant: plantName,
      }),
      [
        { text: t('handoff.incineration.confirmCancel'), style: 'cancel' },
        {
          text: t('handoff.incineration.confirmOk'),
          onPress: () => {
            const containerIds = visitedContainers.map((item) => item.container._id);
            createMutation.mutate(
              {
                sessionId: session.sessionId,
                containerIds,
                incinerationPlant: selectedPlantId,
              },
              {
                onError: (error) => {
                  setCreateError(
                    error instanceof Error ? error.message : t('handoff.errors.createFailed'),
                  );
                },
                onSuccess: () => {
                  setCreateError(null);
                  setCopied(false);
                },
              },
            );
          },
        },
      ],
    );
  };

  const handleCopyLink = async () => {
    if (!confirmationUrl) return;
    await Clipboard.setStringAsync(confirmationUrl);
    setCopied(true);
    if (copyTimeout.current) clearTimeout(copyTimeout.current);
    copyTimeout.current = setTimeout(() => setCopied(false), 2000);
  };

  const openDisputeModal = (handoff: Handoff) => {
    setDisputeHandoffId(handoff._id);
    setDisputeReason('');
    setDisputeDescription('');
    setDisputeError(null);
    setDisputeModalVisible(true);
  };

  const submitDispute = () => {
    if (!disputeHandoffId) return;
    if (!disputeReason) {
      setDisputeError(t('handoff.dispute.error'));
      return;
    }
    disputeMutation.mutate(
      {
        handoffId: disputeHandoffId,
        reason: disputeReason,
        description: disputeReason === 'other' ? disputeDescription.trim() : undefined,
      },
      {
        onSuccess: () => {
          setDisputeModalVisible(false);
          setDisputeError(null);
        },
        onError: (error) => {
          setDisputeError(error instanceof Error ? error.message : t('handoff.errors.disputeFailed'));
        },
      },
    );
  };

  const hasHandoffs = facilityHandoffs.length > 0 || Boolean(incinerationHandoff);

  const timelineSteps = useMemo(() => {
    if (!session || !hasHandoffs) return [] as Array<{
      id: string;
      title: string;
      subtitle?: string;
      state: StepState;
      type: 'session' | 'handoff' | 'incineration' | 'session-end';
      handoff?: Handoff;
    }>;

    const steps: Array<{
      id: string;
      title: string;
      subtitle?: string;
      state: StepState;
      type: 'session' | 'handoff' | 'incineration' | 'session-end';
      handoff?: Handoff;
    }> = [];

    steps.push({
      id: 'session-start',
      title: t('handoff.step.sessionStarted'),
      subtitle: session.startTime ? formatDateTime(session.startTime) : t('handoff.step.inProgress'),
      state: 'completed',
      type: 'session',
    });

    facilityHandoffs.forEach((handoff) => {
      const { totalContainers, totalWeight } = getHandoffTotals(handoff);
      steps.push({
        id: handoff._id,
        title: t('handoff.step.facilityHandoff', {
          name: handoff.sender?.name ?? t('handoff.card.facilityFallback'),
        }),
        subtitle: t('handoff.step.summary', {
          time: formatTime(handoff.createdAt),
          containers: totalContainers,
          weight: formatNumber(totalWeight),
        }),
        state: getStepStateForHandoff(handoff),
        type: 'handoff',
        handoff,
      });
    });

    const incinerationState = incinerationHandoff
      ? getStepStateForHandoff(incinerationHandoff)
      : canCreateIncineration
        ? 'pending'
        : 'future';

    steps.push({
      id: incinerationHandoff?._id ?? 'incineration',
      title: t('handoff.step.incinerationHandoff'),
      subtitle: incinerationHandoff?.createdAt
        ? t('handoff.step.summary', {
          time: formatTime(incinerationHandoff.createdAt),
          containers: getHandoffTotals(incinerationHandoff).totalContainers,
          weight: formatNumber(getHandoffTotals(incinerationHandoff).totalWeight),
        })
        : undefined,
      state: incinerationState,
      type: 'incineration',
      handoff: incinerationHandoff,
    });

    steps.push({
      id: 'session-end',
      title: t('handoff.step.sessionCompleted'),
      subtitle: session.endTime ? formatDateTime(session.endTime) : undefined,
      state: session.status === 'completed' ? 'completed' : 'future',
      type: 'session-end',
    });

    return steps;
  }, [
    session,
    hasHandoffs,
    facilityHandoffs,
    incinerationHandoff,
    canCreateIncineration,
    t,
  ]);

  const progress = useMemo(() => {
    if (!timelineSteps.length) return null;
    const done = timelineSteps.filter((step) => step.state === 'completed').length;
    return {
      done,
      total: timelineSteps.length,
    };
  }, [timelineSteps]);

  const toggleExpanded = (handoffId: string) => {
    setExpandedIds((prev) => ({
      ...prev,
      [handoffId]: !prev[handoffId],
    }));
  };

  const renderTimelineNode = (state: StepState, isLast: boolean) => {
    const nodeColor = NODE_COLORS[state];
    const showPulse = state === 'pending';
    return (
      <View style={styles.timelineRail}>
        <Animated.View
          style={[
            styles.node,
            state === 'future' ? styles.nodeFuture : null,
            { borderColor: nodeColor, backgroundColor: state === 'future' ? colors.background : nodeColor },
            showPulse ? { opacity: pulse, transform: [{ scale: pulse }] } : null,
          ]}
        />
        {!isLast ? (
          <View
            style={[
              styles.timelineLine,
              { backgroundColor: state === 'completed' ? NODE_COLORS.completed : TIMELINE_LINE },
            ]}
          />
        ) : null}
      </View>
    );
  };

  const renderFacilityCard = (handoff: Handoff) => {
    const status = statusMeta(handoff.status);
    const totals = getHandoffTotals(handoff);
    const wasteTypes = getWasteTypes(handoff);
    const isExpanded = expandedIds[handoff._id] ?? (handoff.status !== 'completed');

    return (
      <View style={styles.cardWrapper}>
        <TouchableOpacity onPress={() => toggleExpanded(handoff._id)} activeOpacity={0.8}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>{handoff.sender?.name ?? t('handoff.card.facilityFallback')}</Text>
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
            </View>
          </View>
          <Text style={styles.cardSubtitle}>
            {t('handoff.step.summary', {
              time: formatTime(handoff.createdAt),
              containers: totals.totalContainers,
              weight: formatNumber(totals.totalWeight),
            })}
          </Text>
        </TouchableOpacity>
        {isExpanded ? (
          <View style={styles.cardBody}>
            <Text style={styles.cardLabel}>{t('handoff.card.facilityLabel')}</Text>
            <Text style={styles.cardName}>{handoff.sender?.name ?? t('handoff.card.facilityFallback')}</Text>
            <View style={styles.cardGrid}>
              <View style={styles.cardRow}>
                <Text style={styles.cardKey}>{t('handoff.card.containers')}</Text>
                <Text style={styles.cardValue}>{totals.totalContainers}</Text>
              </View>
              <View style={styles.cardRow}>
                <Text style={styles.cardKey}>{t('handoff.card.totalWeight')}</Text>
                <Text style={styles.cardValue}>{formatNumber(totals.totalWeight)}</Text>
              </View>
              {wasteTypes ? (
                <View style={styles.cardRow}>
                  <Text style={styles.cardKey}>{t('handoff.card.wasteType')}</Text>
                  <Text style={styles.cardValue}>{wasteTypes}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.cardSection}>{t('handoff.card.timeline')}</Text>
            <Text style={styles.cardTimelineText}>
              {t('handoff.card.createdBySupervisor')} {formatTime(handoff.createdAt)}
            </Text>
            {handoff.status === 'completed' ? (
              <Text style={styles.cardTimelineText}>
                {t('handoff.card.confirmedByDriver')} {formatTime(handoff.receiver?.confirmedAt)}
              </Text>
            ) : (
              <Text style={[styles.cardTimelineText, styles.cardTimelinePending]}>
                {t('handoff.card.awaitingConfirmation')}
              </Text>
            )}
            {handoff.status !== 'completed' ? (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => handleConfirm(handoff)}
                disabled={confirmMutation.isPending}
              >
                {confirmMutation.isPending ? (
                  <ActivityIndicator color={colors.surface} />
                ) : (
                  <Text style={styles.primaryButtonText}>{t('handoff.card.confirmReception')}</Text>
                )}
              </TouchableOpacity>
            ) : null}
            {confirmError ? <Text style={styles.errorText}>{confirmError}</Text> : null}
            {handoff.status !== 'completed' ? (
              <TouchableOpacity onPress={() => openDisputeModal(handoff)}>
                <Text style={styles.disputeText}>{t('handoff.card.dispute')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };

  const renderIncinerationCard = () => {
    if (!incinerationHandoff) {
      return (
        <View style={styles.cardWrapper}>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>{t('handoff.step.incinerationHandoff')}</Text>
            {canCreateIncineration ? (
              <>
                <Text style={styles.cardSubtitle}>{t('handoff.incineration.readyTitle')}</Text>
                <Text style={styles.cardSubtitle}>{t('handoff.incineration.readyBody')}</Text>
                <Text style={styles.sectionSubtitle}>{t('handoff.incineration.selectPlant')}</Text>
                {isPlantsLoading ? (
                  <ActivityIndicator color={colors.primary} />
                ) : plantsError ? (
                  <Text style={styles.errorText}>
                    {plantsError instanceof Error ? plantsError.message : t('handoff.errors.plants')}
                  </Text>
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
                        onPress={() => {
                          setSelectedPlantId(plant._id);
                          setCreateError(null);
                        }}
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
                  <Text style={styles.emptyText}>{t('handoff.incineration.noPlants')}</Text>
                )}
                <Text style={styles.cardSubtitle}>
                  {t('handoff.incineration.totalContainers', { count: visitedContainers.length })}
                </Text>
                <Text style={styles.cardSubtitle}>
                  {t('handoff.incineration.totalWeight', { weight: formatNumber(totalVisitedWeight) })}
                </Text>
                {createError ? <Text style={styles.errorText}>{createError}</Text> : null}
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    (!selectedPlantId || createMutation.isPending) && styles.primaryButtonDisabled,
                  ]}
                  onPress={handleCreateIncinerator}
                  disabled={!selectedPlantId || createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <ActivityIndicator color={colors.surface} />
                  ) : (
                    <Text style={styles.primaryButtonText}>{t('handoff.incineration.create')}</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.emptyText}>{t('handoff.incineration.notReady')}</Text>
            )}
          </View>
        </View>
      );
    }

    const status = statusMeta(incinerationHandoff.status);
    const totals = getHandoffTotals(incinerationHandoff);
    const isExpanded = expandedIds[incinerationHandoff._id] ?? (incinerationHandoff.status !== 'completed');

    return (
      <View style={styles.cardWrapper}>
        <TouchableOpacity
          onPress={() => toggleExpanded(incinerationHandoff._id)}
          activeOpacity={0.8}
        >
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>{t('handoff.step.incinerationHandoff')}</Text>
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
            </View>
          </View>
          <Text style={styles.cardSubtitle}>
            {t('handoff.step.summary', {
              time: formatTime(incinerationHandoff.createdAt),
              containers: totals.totalContainers,
              weight: formatNumber(totals.totalWeight),
            })}
          </Text>
        </TouchableOpacity>
        {isExpanded ? (
          <View style={styles.cardBody}>
            <Text style={styles.cardLabel}>{t('handoff.card.incinerationLabel')}</Text>
            <Text style={styles.cardName}>
              {incinerationHandoff.receiver?.name ?? t('handoff.card.incinerationFallback')}
            </Text>
            <View style={styles.cardGrid}>
              <View style={styles.cardRow}>
                <Text style={styles.cardKey}>{t('handoff.card.containers')}</Text>
                <Text style={styles.cardValue}>{totals.totalContainers}</Text>
              </View>
              <View style={styles.cardRow}>
                <Text style={styles.cardKey}>{t('handoff.card.totalWeight')}</Text>
                <Text style={styles.cardValue}>{formatNumber(totals.totalWeight)}</Text>
              </View>
            </View>
            <Text style={styles.cardSection}>{t('handoff.card.timeline')}</Text>
            <Text style={styles.cardTimelineText}>
              {t('handoff.card.createdByDriver')} {formatTime(incinerationHandoff.sender?.confirmedAt)}
            </Text>
            {incinerationHandoff.status === 'completed' ? (
              <Text style={styles.cardTimelineText}>
                {t('handoff.card.confirmedByOperator')} {formatTime(incinerationHandoff.receiver?.confirmedAt)}
              </Text>
            ) : (
              <Text style={[styles.cardTimelineText, styles.cardTimelinePending]}>
                {t('handoff.card.awaitingOperator')}
              </Text>
            )}
            {confirmationUrl ? (
              <View style={styles.linkCard}>
                <Text style={styles.sectionSubtitle}>{t('handoff.card.confirmationLink')}</Text>
                <Text style={styles.linkText}>{confirmationUrl}</Text>
                <TouchableOpacity style={styles.copyButton} onPress={handleCopyLink}>
                  <Text style={styles.copyButtonText}>
                    {copied ? t('handoff.card.copied') : t('handoff.card.copyLink')}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
            {incinerationHandoff.tokenExpiresAt ? (
              <Text style={styles.cardSubtitle}>
                {t('handoff.card.linkExpires', { time: formatTime(incinerationHandoff.tokenExpiresAt) })}
              </Text>
            ) : null}
            {incinerationHandoff.status !== 'completed' ? (
              <TouchableOpacity onPress={() => openDisputeModal(incinerationHandoff)}>
                <Text style={styles.disputeText}>{t('handoff.card.dispute')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{t('handoff.title')}</Text>
            {progress ? (
              <Text style={styles.subtitle}>
                {t('handoff.progress', { done: progress.done, total: progress.total })}
              </Text>
            ) : null}
          </View>
          {session?.sessionId ? (
            <View style={styles.sessionPill}>
              <Text style={styles.sessionPillText}>
                {t('handoff.sessionLabel', { id: session.sessionId })}
              </Text>
            </View>
          ) : null}
        </View>

        {!session ? (
          <Text style={styles.emptyText}>{t('handoff.noSession')}</Text>
        ) : isHandoffsLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : !hasHandoffs ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>{t('handoff.emptyState.title')}</Text>
            <Text style={styles.emptyStateBody}>{t('handoff.emptyState.body')}</Text>
            <Text style={styles.emptyStateBody}>{t('handoff.emptyState.footer')}</Text>
          </View>
        ) : (
          <View style={styles.timeline}>
            {timelineSteps.map((step, index) => (
              <View key={step.id} style={styles.timelineItem}>
                {renderTimelineNode(step.state, index === timelineSteps.length - 1)}
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>{step.title}</Text>
                  {step.subtitle ? <Text style={styles.timelineSubtitle}>{step.subtitle}</Text> : null}
                  {step.type === 'handoff' && step.handoff ? renderFacilityCard(step.handoff) : null}
                  {step.type === 'incineration' ? renderIncinerationCard() : null}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={disputeModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('handoff.dispute.title')}</Text>
            {DISPUTE_REASON_KEYS.map((reasonKey) => (
              <Pressable
                key={reasonKey}
                style={[
                  styles.reasonButton,
                  disputeReason === reasonKey ? styles.reasonButtonSelected : null,
                ]}
                onPress={() => {
                  setDisputeReason(reasonKey);
                  setDisputeError(null);
                }}
              >
                <Text
                  style={
                    disputeReason === reasonKey
                      ? styles.reasonButtonTextSelected
                      : styles.reasonButtonText
                  }
                >
                  {t(`handoff.dispute.reason.${reasonKey}`)}
                </Text>
              </Pressable>
            ))}
            {disputeReason === 'other' ? (
              <TextInput
                placeholder={t('handoff.dispute.descriptionPlaceholder')}
                style={styles.disputeInput}
                value={disputeDescription}
                onChangeText={setDisputeDescription}
                multiline
              />
            ) : null}
            {disputeError ? <Text style={styles.errorText}>{disputeError}</Text> : null}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setDisputeModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>{t('handoff.dispute.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={submitDispute}
                disabled={disputeMutation.isPending}
              >
                {disputeMutation.isPending ? (
                  <ActivityIndicator color={colors.surface} />
                ) : (
                  <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>
                    {t('handoff.dispute.submit')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  sessionPill: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  sessionPillText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  timeline: {
    marginTop: spacing.md,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineRail: {
    width: 24,
    alignItems: 'center',
  },
  node: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    marginTop: 2,
  },
  nodeFuture: {
    backgroundColor: colors.background,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 2,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: spacing.lg,
    paddingLeft: spacing.md,
  },
  timelineTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  timelineSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  cardWrapper: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  cardSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardBody: {
    marginTop: spacing.md,
  },
  cardLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  cardName: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  cardGrid: {
    marginTop: spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  cardKey: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  cardValue: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  cardSection: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  cardTimelineText: {
    ...typography.caption,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  cardTimelinePending: {
    color: '#b45309',
  },
  primaryButton: {
    marginTop: spacing.md,
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
  linkCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  linkText: {
    ...typography.caption,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  copyButton: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.accent,
  },
  copyButtonText: {
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
  sectionSubtitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  disputeText: {
    ...typography.caption,
    color: colors.danger,
    marginTop: spacing.md,
    fontWeight: '600',
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  emptyState: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyStateTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyStateBody: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    marginTop: spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    width: '100%',
  },
  modalTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  reasonButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  reasonButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: '#ccfbf1',
  },
  reasonButtonText: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  reasonButtonTextSelected: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  disputeInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    minHeight: 80,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  modalButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  modalButtonPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    marginRight: 0,
  },
  modalButtonText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  modalButtonTextPrimary: {
    color: colors.surface,
  },
});
