import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';

import {
  useConfirmHandoff,
  useCreateIncineratorHandoff,
  useDisputeHandoff,
  useResendHandoffNotification,
} from '../hooks/useHandoffs';
import { useIncinerationPlants } from '../hooks/useIncinerationPlants';
import { dark, spacing, typography } from '../theme';
import { CONFIRMATION_BASE_URL } from '../utils/constants';
import { CollectionSession, Handoff } from '../types/models';

const STATUS_COLORS = {
  created: { bg: 'rgba(100, 116, 139, 0.2)', text: '#94a3b8' },
  pending: { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b' },
  confirmed_by_sender: { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa' },
  confirmed_by_receiver: { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa' },
  completed: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981' },
  disputed: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444' },
  resolving: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444' },
  resolved: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981' },
  expired: { bg: 'rgba(100, 116, 139, 0.2)', text: '#64748b' },
  default: { bg: 'rgba(100, 116, 139, 0.2)', text: '#94a3b8' },
} as const;

const NODE_COLORS = {
  completed: '#10b981',
  pending: '#f59e0b',
  disputed: '#ef4444',
  future: '#475569',
  expired: '#475569',
} as const;

const TIMELINE_LINE = 'rgba(51, 65, 85, 0.5)';

const DISPUTE_REASON_KEYS = ['weight', 'count', 'damaged', 'other'] as const;

type StepState = 'completed' | 'pending' | 'disputed' | 'future' | 'expired';

type TimelineStep = {
  id: string;
  title: string;
  subtitle?: string;
  state: StepState;
  type: 'session' | 'handoff' | 'incineration' | 'session-end';
  handoff?: Handoff;
};

interface DriverHandoffTimelineProps {
  session: CollectionSession;
  handoffs: Handoff[];
  isLoading: boolean;
  isFetching: boolean;
  onRefresh: () => void;
  readOnly?: boolean;
  focusHandoffId?: string;
}

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

function getStatusLabelKey(status?: string) {
  switch (status) {
    case 'created':
      return 'created';
    case 'pending':
      return 'pending';
    case 'confirmed_by_sender':
      return 'confirmedBySender';
    case 'confirmed_by_receiver':
      return 'confirmedByReceiver';
    case 'completed':
      return 'completed';
    case 'disputed':
      return 'disputed';
    case 'resolving':
      return 'disputed';
    case 'resolved':
      return 'resolved';
    case 'expired':
      return 'expired';
    default:
      return 'default';
  }
}

export default function DriverHandoffTimeline({
  session,
  handoffs,
  isLoading,
  isFetching,
  onRefresh,
  readOnly = false,
  focusHandoffId,
}: DriverHandoffTimelineProps) {
  const { t } = useTranslation();
  const confirmMutation = useConfirmHandoff();
  const createMutation = useCreateIncineratorHandoff();
  const disputeMutation = useDisputeHandoff();
  const resendMutation = useResendHandoffNotification();
  const {
    data: plants,
    isLoading: isPlantsLoading,
    error: plantsError,
  } = useIncinerationPlants();

  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [disputeModalVisible, setDisputeModalVisible] = useState(false);
  const [disputeHandoffId, setDisputeHandoffId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState<string>('');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [disputeError, setDisputeError] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<Handoff | null>(null);
  const [confirmSuccess, setConfirmSuccess] = useState(false);
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const layoutMap = useRef<Record<string, number>>({});

  useEffect(() => () => {
    if (copyTimeout.current) {
      clearTimeout(copyTimeout.current);
    }
  }, []);

  useEffect(() => {
    if (!focusHandoffId) return;
    const y = layoutMap.current[focusHandoffId];
    if (y == null) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 24), animated: true });
  }, [focusHandoffId]);

  const facilityHandoffs = useMemo(() => (
    handoffs
      .filter((handoff) => handoff.type === 'facility_to_driver')
      .sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''))
  ), [handoffs]);

  const incinerationHandoff = useMemo(() => (
    handoffs
      .filter((handoff) => handoff.type === 'driver_to_incinerator')
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))[0]
  ), [handoffs]);

  const hasHandoffs = facilityHandoffs.length > 0 || Boolean(incinerationHandoff);

  const visitedContainers = session.selectedContainers?.filter((item) => item.visited) ?? [];
  const totalVisitedWeight = visitedContainers.reduce(
    (sum, item) => sum + (item.collectedWeight ?? 0),
    0,
  );

  const canCreateIncineration =
    !readOnly &&
    facilityHandoffs.length > 0 &&
    facilityHandoffs.every((handoff) => handoff.status === 'completed') &&
    visitedContainers.length > 0 &&
    !incinerationHandoff;

  const pendingFacilityHandoff = useMemo(() => (
    facilityHandoffs.find((handoff) => !['completed', 'disputed', 'resolved', 'expired'].includes(handoff.status))
  ), [facilityHandoffs]);

  const confirmationToken = createMutation.data?.confirmationToken;
  const confirmationUrl = confirmationToken ? `${CONFIRMATION_BASE_URL}/${confirmationToken}` : null;

  const timelineSteps = useMemo(() => {
    const steps: TimelineStep[] = [];

    steps.push({
      id: 'session-start',
      title: t('handoff.step.sessionStarted'),
      subtitle: session.startTime ? formatDateTime(session.startTime) : t('handoff.step.inProgress'),
      state: 'completed',
      type: 'session',
    });

    facilityHandoffs.forEach((handoff) => {
      const { totalContainers, totalWeight } = getHandoffTotals(handoff);
      const state = readOnly ? (handoff.status === 'disputed' ? 'disputed' : 'completed') : getStepStateForHandoff(handoff);
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
        state,
        type: 'handoff',
        handoff,
      });
    });

    const incinerationState = readOnly
      ? (incinerationHandoff?.status === 'disputed' ? 'disputed' : incinerationHandoff ? 'completed' : 'future')
      : incinerationHandoff
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
      state: session.status === 'completed' || readOnly ? 'completed' : 'future',
      type: 'session-end',
    });

    return steps;
  }, [
    session.startTime,
    session.endTime,
    session.status,
    facilityHandoffs,
    incinerationHandoff,
    canCreateIncineration,
    t,
    readOnly,
  ]);

  const progress = useMemo(() => {
    const done = timelineSteps.filter((step) => step.state === 'completed').length;
    return { done, total: timelineSteps.length };
  }, [timelineSteps]);

  const toggleExpanded = (handoffId: string) => {
    setExpandedIds((prev) => ({
      ...prev,
      [handoffId]: !prev[handoffId],
    }));
  };

  const handleConfirm = (handoff: Handoff) => {
    if (confirmMutation.isPending || readOnly) return;
    setConfirmTarget(handoff);
  };

  const submitConfirm = () => {
    if (!confirmTarget) return;
    setConfirmError(null);
    confirmMutation.mutate(confirmTarget._id, {
      onSuccess: () => {
        onRefresh();
        setExpandedIds((prev) => ({ ...prev, [confirmTarget._id]: false }));
        setConfirmTarget(null);
        setConfirmSuccess(true);
        setTimeout(() => setConfirmSuccess(false), 2000);
      },
      onError: (error) => {
        setConfirmError(error instanceof Error ? error.message : t('handoff.errors.confirm'));
      },
    });
  };

  const handleCreateIncinerator = () => {
    if (readOnly) return;
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

  const handleResendLink = (handoff: Handoff) => {
    if (readOnly || resendMutation.isPending) return;
    setResendError(null);
    resendMutation.mutate(handoff._id, {
      onSuccess: () => {
        onRefresh();
      },
      onError: (error) => {
        setResendError(error instanceof Error ? error.message : t('handoff.errors.resendFailed'));
      },
    });
  };

  const openDisputeModal = (handoff: Handoff) => {
    if (readOnly) return;
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
          onRefresh();
        },
        onError: (error) => {
          setDisputeError(error instanceof Error ? error.message : t('handoff.errors.disputeFailed'));
        },
      },
    );
  };

  const renderNode = (state: StepState, isLast: boolean) => {
    const nodeColor = NODE_COLORS[state];
    return (
      <View style={styles.timelineRail}>
        <View
          style={[
            styles.node,
            state === 'future' ? styles.nodeFuture : null,
            { borderColor: nodeColor, backgroundColor: state === 'future' ? dark.bg : nodeColor },
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

  const lastAction = useMemo(() => {
    const times = handoffs.flatMap((handoff) => [
      handoff.createdAt,
      handoff.sender?.confirmedAt,
      handoff.receiver?.confirmedAt,
      handoff.completedAt,
    ]).filter(Boolean) as string[];
    const latest = times.sort((a, b) => (b ?? '').localeCompare(a ?? ''))[0];
    return latest ? formatDateTime(latest) : null;
  }, [handoffs]);

  const renderFacilityCard = (handoff: Handoff) => {
    const statusKey = getStatusLabelKey(handoff.status);
    const colorset = STATUS_COLORS[handoff.status as keyof typeof STATUS_COLORS] ?? STATUS_COLORS.default;
    const totals = getHandoffTotals(handoff);
    const wasteTypes = getWasteTypes(handoff);
    const isExpanded = expandedIds[handoff._id] ?? (!readOnly && handoff._id === pendingFacilityHandoff?._id);
    const showAction = !readOnly && handoff._id === pendingFacilityHandoff?._id;

    return (
      <View style={styles.cardWrapper}>
        <TouchableOpacity onPress={() => toggleExpanded(handoff._id)} activeOpacity={0.8}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>{handoff.sender?.name ?? t('handoff.card.facilityFallback')}</Text>
            <View style={[styles.statusBadge, { backgroundColor: colorset.bg }]}>
              <Text style={[styles.statusText, { color: colorset.text }]}>{t(`handoff.status.${statusKey}`)}</Text>
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
            {showAction ? (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => handleConfirm(handoff)}
                disabled={confirmMutation.isPending}
              >
                {confirmMutation.isPending ? (
                  <ActivityIndicator color={dark.text} />
                ) : (
                  <Text style={styles.primaryButtonText}>{t('handoff.card.confirmReception')}</Text>
                )}
              </TouchableOpacity>
            ) : null}
            {confirmError ? <Text style={styles.errorText}>{confirmError}</Text> : null}
            {!readOnly ? (
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
                  <ActivityIndicator color={dark.teal} />
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
                    <ActivityIndicator color={dark.text} />
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

    const statusKey = getStatusLabelKey(incinerationHandoff.status);
    const colorset = STATUS_COLORS[incinerationHandoff.status as keyof typeof STATUS_COLORS] ?? STATUS_COLORS.default;
    const totals = getHandoffTotals(incinerationHandoff);
    const isExpanded = expandedIds[incinerationHandoff._id] ?? (!readOnly && incinerationHandoff.status !== 'completed');

    return (
      <View style={styles.cardWrapper}>
        <TouchableOpacity
          onPress={() => toggleExpanded(incinerationHandoff._id)}
          activeOpacity={0.8}
        >
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>{t('handoff.step.incinerationHandoff')}</Text>
            <View style={[styles.statusBadge, { backgroundColor: colorset.bg }]}>
              <Text style={[styles.statusText, { color: colorset.text }]}>{t(`handoff.status.${statusKey}`)}</Text>
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
            {incinerationHandoff.status === 'expired' && !readOnly ? (
              <TouchableOpacity style={styles.outlineButton} onPress={() => handleResendLink(incinerationHandoff)}>
                {resendMutation.isPending ? (
                  <ActivityIndicator color={dark.teal} />
                ) : (
                  <Text style={styles.outlineButtonText}>{t('handoff.card.regenerateLink')}</Text>
                )}
              </TouchableOpacity>
            ) : null}
            {resendError ? <Text style={styles.errorText}>{resendError}</Text> : null}
            {!readOnly ? (
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
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{t('handoff.title')}</Text>
        <Text style={styles.subtitle}>{t('handoff.progress', { done: progress.done, total: progress.total })}</Text>
        {lastAction ? (
          <Text style={styles.lastAction}>{t('handoff.lastAction', { time: lastAction })}</Text>
        ) : null}
        {confirmSuccess ? (
          <View style={styles.successBadge}>
            <Text style={styles.successBadgeText}>{t('handoff.confirm.success')}</Text>
          </View>
        ) : null}
      </View>

      {isLoading ? (
        <ActivityIndicator color={dark.teal} />
      ) : !hasHandoffs && !readOnly ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>{t('handoff.emptyState.title')}</Text>
          <Text style={styles.emptyStateBody}>{t('handoff.emptyState.body')}</Text>
          <Text style={styles.emptyStateBody}>{t('handoff.emptyState.footer')}</Text>
        </View>
      ) : (
        <View style={styles.timeline}>
          {timelineSteps.map((step, index) => (
            <View
              key={step.id}
              style={styles.timelineItem}
              onLayout={(event) => {
                layoutMap.current[step.id] = event.nativeEvent.layout.y;
              }}
            >
              {renderNode(step.state, index === timelineSteps.length - 1)}
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
                  <ActivityIndicator color={dark.text} />
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

      <Modal visible={Boolean(confirmTarget)} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('handoff.confirm.title')}</Text>
            {confirmTarget ? (
              <Text style={styles.modalBody}>
                {t('handoff.confirm.body', {
                  count: getHandoffTotals(confirmTarget).totalContainers,
                  weight: formatNumber(getHandoffTotals(confirmTarget).totalWeight),
                  name: confirmTarget.sender?.name ?? t('handoff.card.facilityFallback'),
                })}
              </Text>
            ) : null}
            {confirmError ? <Text style={styles.errorText}>{confirmError}</Text> : null}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setConfirmTarget(null)}
              >
                <Text style={styles.modalButtonText}>{t('handoff.confirm.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={submitConfirm}
                disabled={confirmMutation.isPending}
              >
                {confirmMutation.isPending ? (
                  <ActivityIndicator color={dark.text} />
                ) : (
                  <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>
                    {t('handoff.confirm.ok')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.title,
    color: dark.text,
  },
  subtitle: {
    ...typography.caption,
    color: dark.textSecondary,
    marginTop: spacing.xs,
  },
  lastAction: {
    ...typography.caption,
    color: dark.textSecondary,
    marginTop: spacing.xs,
  },
  successBadge: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
  },
  successBadgeText: {
    color: '#10b981',
    fontSize: 11,
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
    backgroundColor: dark.bg,
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
    color: dark.text,
  },
  timelineSubtitle: {
    ...typography.caption,
    color: dark.textSecondary,
    marginTop: spacing.xs,
  },
  cardWrapper: {
    backgroundColor: dark.surface,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: dark.border,
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
    color: dark.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  cardSubtitle: {
    ...typography.caption,
    color: dark.textSecondary,
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
    color: dark.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  cardName: {
    ...typography.body,
    fontWeight: '700',
    color: dark.text,
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
    color: dark.textSecondary,
  },
  cardValue: {
    ...typography.caption,
    color: dark.text,
    fontWeight: '600',
  },
  cardSection: {
    ...typography.caption,
    color: dark.textSecondary,
    marginTop: spacing.md,
  },
  cardTimelineText: {
    ...typography.caption,
    color: dark.text,
    marginTop: spacing.xs,
  },
  cardTimelinePending: {
    color: '#f59e0b',
  },
  primaryButton: {
    marginTop: spacing.md,
    backgroundColor: dark.teal,
    borderRadius: 10,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: dark.text,
    fontWeight: '600',
  },
  linkCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.card,
  },
  linkText: {
    ...typography.caption,
    color: dark.text,
    marginTop: spacing.xs,
  },
  copyButton: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: dark.teal,
  },
  copyButtonText: {
    color: dark.text,
    fontSize: 12,
    fontWeight: '600',
  },
  outlineButton: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: dark.teal,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  outlineButtonText: {
    color: dark.teal,
    fontWeight: '600',
  },
  plantList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  plantButton: {
    borderWidth: 1,
    borderColor: dark.border,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: dark.bg,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  plantButtonSelected: {
    borderWidth: 1,
    borderColor: dark.teal,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: dark.teal,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  plantButtonText: {
    fontSize: 12,
    color: dark.text,
  },
  plantButtonTextSelected: {
    fontSize: 12,
    color: dark.text,
    fontWeight: '600',
  },
  sectionSubtitle: {
    ...typography.body,
    fontWeight: '600',
    color: dark.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  disputeText: {
    ...typography.caption,
    color: dark.dangerText,
    marginTop: spacing.md,
    fontWeight: '600',
  },
  emptyText: {
    ...typography.body,
    color: dark.textSecondary,
  },
  emptyState: {
    backgroundColor: dark.surface,
    borderRadius: 16,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: dark.border,
  },
  emptyStateTitle: {
    ...typography.body,
    fontWeight: '600',
    color: dark.text,
    marginBottom: spacing.sm,
  },
  emptyStateBody: {
    ...typography.caption,
    color: dark.textSecondary,
    marginBottom: spacing.xs,
  },
  errorText: {
    ...typography.caption,
    color: dark.dangerText,
    marginTop: spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: dark.surface,
    borderRadius: 16,
    padding: spacing.lg,
    width: '100%',
  },
  modalTitle: {
    ...typography.body,
    fontWeight: '700',
    color: dark.text,
    marginBottom: spacing.md,
  },
  modalBody: {
    ...typography.body,
    color: dark.textSecondary,
    marginBottom: spacing.md,
  },
  reasonButton: {
    borderWidth: 1,
    borderColor: dark.border,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  reasonButtonSelected: {
    borderColor: dark.teal,
    backgroundColor: 'rgba(13, 148, 136, 0.15)',
  },
  reasonButtonText: {
    ...typography.caption,
    color: dark.text,
  },
  reasonButtonTextSelected: {
    ...typography.caption,
    color: dark.text,
    fontWeight: '600',
  },
  disputeInput: {
    borderWidth: 1,
    borderColor: dark.border,
    borderRadius: 10,
    padding: spacing.md,
    minHeight: 80,
    color: dark.text,
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
    borderColor: dark.border,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  modalButtonPrimary: {
    backgroundColor: dark.teal,
    borderColor: dark.teal,
    marginRight: 0,
  },
  modalButtonText: {
    ...typography.caption,
    color: dark.text,
    fontWeight: '600',
  },
  modalButtonTextPrimary: {
    color: dark.text,
  },
});
