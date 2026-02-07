import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardCheck, Filter, RefreshCw, X, CheckCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import Loader from '../../components/ui/Loader';
import Button from '../../components/ui/Button';

const STATUS_LABELS = {
    created: 'Создан',
    pending: 'Ожидает',
    confirmed_by_sender: 'Подтвержден отправителем',
    confirmed_by_receiver: 'Подтвержден получателем',
    completed: 'Завершен',
    disputed: 'Спор',
    resolving: 'Разрешается',
    resolved: 'Разрешен',
    expired: 'Истек'
};

const STATUS_STYLES = {
    created: 'bg-slate-100 text-slate-700',
    pending: 'bg-amber-100 text-amber-700',
    confirmed_by_sender: 'bg-blue-100 text-blue-700',
    confirmed_by_receiver: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
    disputed: 'bg-red-100 text-red-700',
    resolving: 'bg-amber-100 text-amber-700',
    resolved: 'bg-emerald-100 text-emerald-700',
    expired: 'bg-slate-100 text-slate-700'
};

const HandoffManagement = () => {
    const { isSupervisor, isAdmin } = useAuth();
    const [status, setStatus] = useState('');
    const [type, setType] = useState('');
    const [selectedHandoffId, setSelectedHandoffId] = useState(null);
    const [disputeReason, setDisputeReason] = useState('');
    const [disputeDescription, setDisputeDescription] = useState('');
    const [resolutionText, setResolutionText] = useState('');
    const [createSessionId, setCreateSessionId] = useState('');
    const [createDriverId, setCreateDriverId] = useState('');
    const [createContainers, setCreateContainers] = useState([]);
    const [createWeights, setCreateWeights] = useState({});
    const [createNotes, setCreateNotes] = useState({});
    const [createSubmitting, setCreateSubmitting] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const handoffsQuery = useQuery({
        queryKey: ['handoffs', status, type],
        queryFn: () => apiService.handoffs.getAll({
            ...(status ? { status } : {}),
            ...(type ? { type } : {})
        }),
        enabled: isSupervisor,
        refetchInterval: 60000
    });

    const handoffs = handoffsQuery.data?.data?.data?.handoffs || [];

    const handoffDetailQuery = useQuery({
        queryKey: ['handoffDetail', selectedHandoffId],
        queryFn: () => apiService.handoffs.getById(selectedHandoffId),
        enabled: !!selectedHandoffId
    });

    const notificationLogsQuery = useQuery({
        queryKey: ['handoffNotifications', selectedHandoffId],
        queryFn: () => apiService.notifications.getHandoffLogs(selectedHandoffId),
        enabled: !!selectedHandoffId && (isAdmin || isSupervisor)
    });

    const selectedHandoff = handoffDetailQuery.data?.data?.data?.handoff;
    const notificationLogs = notificationLogsQuery.data?.data?.data?.logs || [];
    const chainHandoffsQuery = useQuery({
        queryKey: ['handoffChain', selectedHandoff?.session?._id],
        queryFn: () => apiService.handoffs.getChain(selectedHandoff.session._id),
        enabled: !!selectedHandoff?.session?._id
    });
    const chainHandoffs = chainHandoffsQuery.data?.data?.data?.handoffs || [];
    const step1 = chainHandoffs.find((handoff) => handoff.type === 'facility_to_driver') || null;
    const step2 = chainHandoffs.find((handoff) => handoff.type === 'driver_to_incinerator') || null;

    const activeDriversQuery = useQuery({
        queryKey: ['activeDriverSessions'],
        queryFn: () => apiService.collections.getActiveDrivers(),
        enabled: isSupervisor
    });

    const driversQuery = useQuery({
        queryKey: ['verifiedDrivers'],
        queryFn: () => apiService.drivers.getAllDrivers({ status: 'active' }),
        enabled: isSupervisor
    });

    const binsQuery = useQuery({
        queryKey: ['handoffBins'],
        queryFn: () => apiService.wasteBins.getAll({ limit: 100 }),
        enabled: isSupervisor
    });

    const activeSessions = activeDriversQuery.data?.data?.data?.activeDrivers || [];
    const drivers = driversQuery.data?.data?.data?.drivers || [];
    const bins = binsQuery.data?.data?.data?.bins || [];

    const driverCompanyMap = useMemo(() => {
        const map = new Map();
        drivers.forEach((driver) => {
            const userId = driver.user?._id || driver.user;
            if (userId) {
                map.set(String(userId), driver.medicalCompany?._id || driver.medicalCompany || null);
            }
        });
        return map;
    }, [drivers]);

    const selectedSessionCompany = useMemo(() => {
        if (!createSessionId) return null;
        const sessionItem = activeSessions.find((item) => item.session?._id === createSessionId);
        return sessionItem?.session?.company || null;
    }, [activeSessions, createSessionId]);

    const selectedDriverCompany = useMemo(() => {
        if (!createDriverId) return null;
        return driverCompanyMap.get(String(createDriverId)) || null;
    }, [createDriverId, driverCompanyMap]);

    const selectedCompanyId = selectedSessionCompany || selectedDriverCompany;

    const selectedCompanyName = useMemo(() => {
        if (!selectedCompanyId) return '';
        const driverMatch = drivers.find((driver) =>
            String(driver.medicalCompany?._id || driver.medicalCompany || '') === String(selectedCompanyId)
        );
        return driverMatch?.medicalCompany?.name || '';
    }, [drivers, selectedCompanyId]);

    const filteredBins = useMemo(() => {
        if (!selectedCompanyId) return bins;
        return bins.filter((bin) => String(bin.company?._id || bin.company || '') === String(selectedCompanyId));
    }, [bins, selectedCompanyId]);

    useEffect(() => {
        setCreateContainers([]);
        setCreateWeights({});
        setCreateNotes({});
    }, [selectedCompanyId]);

    const stats = useMemo(() => {
        const total = handoffs.length;
        const completed = handoffs.filter((handoff) => handoff.status === 'completed').length;
        const pending = handoffs.filter((handoff) => handoff.status === 'pending').length;
        const disputed = handoffs.filter((handoff) => handoff.status === 'disputed').length;
        return { total, completed, pending, disputed };
    }, [handoffs]);

    if (!isSupervisor) {
        return (
            <div className="min-h-screen bg-slate-50 p-6">
                <div className="mx-auto max-w-4xl rounded-lg bg-white p-6 shadow-sm">
                    <h1 className="text-2xl font-semibold text-slate-800">Акты передачи</h1>
                    <p className="mt-2 text-slate-600">Доступ только для администраторов и супервайзеров.</p>
                </div>
            </div>
        );
    }

    if (handoffsQuery.isLoading) {
        return <Loader text="Загрузка актов передачи..." />;
    }

    const handleCloseModal = () => {
        setSelectedHandoffId(null);
        setDisputeReason('');
        setDisputeDescription('');
        setResolutionText('');
    };

    const handleConfirm = async () => {
        if (!selectedHandoffId) return;
        try {
            await apiService.handoffs.confirm(selectedHandoffId);
            toast.success('Акт подтвержден');
            handoffDetailQuery.refetch();
            handoffsQuery.refetch();
        } catch (error) {
            console.error('Confirm handoff error:', error);
            toast.error('Не удалось подтвердить акт');
        }
    };

    const handleResend = async () => {
        if (!selectedHandoffId) return;
        try {
            await apiService.handoffs.resendNotification(selectedHandoffId);
            toast.success('Уведомление отправлено');
        } catch (error) {
            console.error('Resend notification error:', error);
            toast.error('Не удалось отправить уведомление');
        }
    };

    const handleDispute = async () => {
        if (!selectedHandoffId) return;
        if (!disputeReason) {
            toast.error('Укажите причину спора');
            return;
        }
        try {
            await apiService.handoffs.dispute(selectedHandoffId, {
                reason: disputeReason,
                description: disputeDescription
            });
            toast.success('Спор отправлен');
            handoffDetailQuery.refetch();
            handoffsQuery.refetch();
        } catch (error) {
            console.error('Dispute handoff error:', error);
            toast.error('Не удалось отправить спор');
        }
    };

    const handleResolve = async () => {
        if (!selectedHandoffId) return;
        try {
            await apiService.handoffs.resolve(selectedHandoffId, {
                resolution: resolutionText
            });
            toast.success('Спор разрешен');
            handoffDetailQuery.refetch();
            handoffsQuery.refetch();
        } catch (error) {
            console.error('Resolve handoff error:', error);
            toast.error('Не удалось разрешить спор');
        }
    };

    const toggleCreateContainer = (containerId) => {
        setCreateContainers((prev) => {
            if (prev.includes(containerId)) {
                return prev.filter((id) => id !== containerId);
            }
            return [...prev, containerId];
        });
    };

    const handleCreateHandoff = async () => {
        if (createContainers.length === 0) {
            toast.error('Выберите контейнеры');
            return;
        }
        const selectedSession = activeSessions.find((item) => item.session?._id === createSessionId);
        const driverId = selectedSession?.session?.driver?._id;
        const receiverUser = driverId || createDriverId;
        if (!receiverUser) {
            toast.error('Выберите водителя');
            return;
        }
        setCreateSubmitting(true);
        try {
            const containersPayload = createContainers.map((containerId) => ({
                container: containerId,
                declaredWeight: createWeights[containerId] ? Number(createWeights[containerId]) : undefined,
                notes: createNotes[containerId] || undefined
            }));

            await apiService.handoffs.create({
                sessionId: createSessionId || undefined,
                type: 'facility_to_driver',
                containers: containersPayload,
                receiver: { user: receiverUser, role: 'driver' },
                company: selectedCompanyId || undefined
            });
            toast.success('Акт создан');
            setCreateSessionId('');
            setCreateContainers([]);
            setCreateWeights({});
            setCreateNotes({});
            handoffsQuery.refetch();
            setShowCreateModal(false);
        } catch (error) {
            console.error('Create handoff error:', error);
            toast.error('Не удалось создать акт');
        } finally {
            setCreateSubmitting(false);
        }
    };

    const canConfirm = selectedHandoff && selectedHandoff.status !== 'completed';
    const canDispute = selectedHandoff && !['completed', 'resolved'].includes(selectedHandoff.status);
    const canResolve = selectedHandoff && selectedHandoff.status === 'disputed';

    return (
        <div className="min-h-screen bg-slate-50 p-4">
            <div className="mx-auto max-w-7xl space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Акты передачи</h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Контроль статусов и подтверждений
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => handoffsQuery.refetch()}
                        isLoading={handoffsQuery.isFetching}
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Обновить
                    </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between text-sm text-slate-500">
                            <span>Всего</span>
                            <ClipboardCheck className="h-4 w-4 text-slate-400" />
                        </div>
                        <div className="mt-3 text-2xl font-semibold text-slate-800">{stats.total}</div>
                    </div>
                    <div className="rounded-lg bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between text-sm text-slate-500">
                            <span>Ожидают</span>
                            <ClipboardCheck className="h-4 w-4 text-slate-400" />
                        </div>
                        <div className="mt-3 text-2xl font-semibold text-amber-600">{stats.pending}</div>
                    </div>
                    <div className="rounded-lg bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between text-sm text-slate-500">
                            <span>Завершены</span>
                            <ClipboardCheck className="h-4 w-4 text-slate-400" />
                        </div>
                        <div className="mt-3 text-2xl font-semibold text-emerald-600">{stats.completed}</div>
                    </div>
                    <div className="rounded-lg bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between text-sm text-slate-500">
                            <span>Споры</span>
                            <ClipboardCheck className="h-4 w-4 text-slate-400" />
                        </div>
                        <div className="mt-3 text-2xl font-semibold text-red-600">{stats.disputed}</div>
                    </div>
                </div>

                {isSupervisor && (
                    <div className="rounded-lg bg-white p-4 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-800">Акт передачи</h2>
                                <p className="text-xs text-slate-500">Учреждение → Водитель</p>
                            </div>
                            <Button onClick={() => setShowCreateModal(true)}>
                                Создать акт
                            </Button>
                        </div>
                    </div>
                )}

                <div className="rounded-lg bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Filter className="h-4 w-4" />
                            <span>Фильтр</span>
                        </div>
                        <select
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            value={status}
                            onChange={(event) => setStatus(event.target.value)}
                        >
                            <option value="">Все статусы</option>
                            {Object.keys(STATUS_LABELS).map((key) => (
                                <option key={key} value={key}>{STATUS_LABELS[key]}</option>
                            ))}
                        </select>
                        <select
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                            value={type}
                            onChange={(event) => setType(event.target.value)}
                        >
                            <option value="">Все типы</option>
                            <option value="facility_to_driver">Учреждение → Водитель</option>
                            <option value="driver_to_incinerator">Водитель → Утилизатор</option>
                        </select>
                    </div>
                </div>

                <div className="grid gap-4">
                    {handoffs.length === 0 && (
                        <div className="rounded-lg bg-white p-8 text-center text-slate-500 shadow-sm">
                            Актов передачи пока нет.
                        </div>
                    )}
                    {handoffs.map((handoff) => (
                        <div key={handoff._id} className="rounded-lg bg-white p-5 shadow-sm">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-lg font-semibold text-slate-800">
                                            {handoff.handoffId || handoff._id}
                                        </h3>
                                        <span
                                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                                                STATUS_STYLES[handoff.status] || 'bg-slate-100 text-slate-600'
                                            }`}
                                        >
                                            {STATUS_LABELS[handoff.status] || handoff.status}
                                        </span>
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-500">
                                        <span>Тип: {handoff.type}</span>
                                        <span>Контейнеров: {handoff.totalContainers || 0}</span>
                                        <span>Вес: {handoff.totalDeclaredWeight || 0} кг</span>
                                        {handoff.sender?.user && (
                                            <span>Отправитель: {handoff.sender.name || handoff.sender.user.username}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="text-xs text-slate-500">
                                        {handoff.createdAt ? new Date(handoff.createdAt).toLocaleString('ru-RU') : ''}
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setSelectedHandoffId(handoff._id)}
                                    >
                                        Детали
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {selectedHandoffId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
                    <div className="w-full max-w-3xl rounded-2xl bg-white shadow-lg">
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-800">
                                    {selectedHandoff?.handoffId || selectedHandoffId}
                                </h2>
                                <p className="text-xs text-slate-500">
                                    {selectedHandoff?.type || ''} • {STATUS_LABELS[selectedHandoff?.status] || ''}
                                </p>
                            </div>
                            <button
                                onClick={handleCloseModal}
                                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="max-h-[70vh] overflow-y-auto px-5 py-4 space-y-4">
                            {handoffDetailQuery.isLoading && (
                                <Loader text="Загрузка деталей..." />
                            )}

                            {selectedHandoff && (
                                <>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="rounded-lg border border-slate-200 p-3 text-xs">
                                            <p className="text-slate-500">Цепочка</p>
                                            <p className="font-semibold text-slate-800">
                                                {selectedHandoff.chainId || '—'}
                                            </p>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                                                    step1?.status === 'completed'
                                                        ? 'bg-emerald-50 text-emerald-700'
                                                        : step1
                                                            ? 'bg-blue-50 text-blue-700'
                                                            : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                    1. Объект → водитель
                                                </span>
                                                <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                                                    step2?.status === 'completed'
                                                        ? 'bg-emerald-50 text-emerald-700'
                                                        : step2
                                                            ? 'bg-blue-50 text-blue-700'
                                                            : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                    2. Водитель → утилизация
                                                </span>
                                            </div>
                                        </div>
                                        <div className="rounded-lg bg-slate-50 p-3 text-sm">
                                            <p className="text-slate-500">Контейнеров</p>
                                            <p className="font-semibold text-slate-800">
                                                {selectedHandoff.totalContainers || 0}
                                            </p>
                                        </div>
                                        <div className="rounded-lg bg-slate-50 p-3 text-sm">
                                            <p className="text-slate-500">Вес (заявлен)</p>
                                            <p className="font-semibold text-slate-800">
                                                {selectedHandoff.totalDeclaredWeight || 0} кг
                                            </p>
                                        </div>
                                        <div className="rounded-lg bg-slate-50 p-3 text-sm">
                                            <p className="text-slate-500">Отправитель</p>
                                            <p className="font-semibold text-slate-800">
                                                {selectedHandoff.sender?.name || '—'}
                                            </p>
                                            {selectedHandoff.sender?.confirmedAt && (
                                                <p className="text-xs text-slate-500">
                                                    {new Date(selectedHandoff.sender.confirmedAt).toLocaleString('ru-RU')}
                                                </p>
                                            )}
                                        </div>
                                        <div className="rounded-lg bg-slate-50 p-3 text-sm">
                                            <p className="text-slate-500">Получатель</p>
                                            <p className="font-semibold text-slate-800">
                                                {selectedHandoff.receiver?.name || selectedHandoff.receiver?.phone || '—'}
                                            </p>
                                            {selectedHandoff.receiver?.confirmedAt && (
                                                <p className="text-xs text-slate-500">
                                                    {new Date(selectedHandoff.receiver.confirmedAt).toLocaleString('ru-RU')}
                                                </p>
                                            )}
                                        </div>
                                        <div className="rounded-lg bg-slate-50 p-3 text-sm">
                                            <p className="text-slate-500">Завершено</p>
                                            <p className="font-semibold text-slate-800">
                                                {selectedHandoff.completedAt
                                                    ? new Date(selectedHandoff.completedAt).toLocaleString('ru-RU')
                                                    : '—'}
                                            </p>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-800">Контейнеры</h3>
                                        <div className="mt-2 space-y-2">
                                            {selectedHandoff.containers?.map((item) => (
                                                <div key={item.container} className="rounded-lg border border-slate-200 p-3 text-xs">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-semibold text-slate-800">
                                                            {item.binId || item.container}
                                                        </span>
                                                        <span className="text-slate-500">{item.fillLevel ?? '-'}%</span>
                                                    </div>
                                                    <div className="mt-1 text-slate-500">
                                                        {item.wasteType || 'Тип отходов не указан'}
                                                    </div>
                                                    <div className="mt-1 text-slate-500">
                                                        Вес: {item.declaredWeight || 0} кг · Мешков: {item.bagCount || 0}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {selectedHandoff.status === 'disputed' && selectedHandoff.dispute && (
                                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                                            <div className="flex items-center gap-2 text-amber-700">
                                                <AlertTriangle className="h-4 w-4" />
                                                <span>Спор: {selectedHandoff.dispute.reason || 'указан'}</span>
                                            </div>
                                            {selectedHandoff.dispute.description && (
                                                <p className="mt-2 text-amber-700">{selectedHandoff.dispute.description}</p>
                                            )}
                                        </div>
                                    )}

                                    {selectedHandoff.status === 'resolved' && selectedHandoff.dispute && (
                                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
                                            <div className="flex items-center gap-2 text-emerald-700">
                                                <CheckCircle className="h-4 w-4" />
                                                <span>Спор решен</span>
                                            </div>
                                            {selectedHandoff.dispute.resolution && (
                                                <p className="mt-2 text-emerald-700">{selectedHandoff.dispute.resolution}</p>
                                            )}
                                        </div>
                                    )}

                                    {(isAdmin || isSupervisor) && (
                                        <div>
                                            <h3 className="text-sm font-semibold text-slate-800">Уведомления</h3>
                                            <div className="mt-2 space-y-2">
                                                {notificationLogs.length === 0 && (
                                                    <p className="text-xs text-slate-500">Отправки не найдены.</p>
                                                )}
                                                {notificationLogs.map((log) => (
                                                    <div key={log._id} className="rounded-lg border border-slate-200 p-3 text-xs">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-semibold text-slate-800">{log.channel}</span>
                                                            <span className="text-slate-500">{log.status}</span>
                                                        </div>
                                                        <div className="mt-1 text-slate-500">
                                                            {log.recipient?.phone || '—'}
                                                        </div>
                                                        <div className="mt-1 text-slate-500">
                                                            {log.sentAt ? new Date(log.sentAt).toLocaleString('ru-RU') : ''}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="border-t border-slate-200 px-5 py-4 space-y-3">
                            <div className="flex flex-wrap gap-2">
                                <Button onClick={handleConfirm} variant="outline" disabled={!canConfirm}>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Подтвердить
                                </Button>
                                <Button onClick={handleResend} variant="outline" disabled={!selectedHandoff?.receiver?.phone}>
                                    Отправить уведомление
                                </Button>
                            </div>

                            <div className="grid gap-2 sm:grid-cols-2">
                                <select
                                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                    value={disputeReason}
                                    onChange={(event) => setDisputeReason(event.target.value)}
                                    disabled={!canDispute}
                                >
                                    <option value="">Причина спора</option>
                                    <option value="wrong_count">Неверное количество</option>
                                    <option value="wrong_weight">Неверный вес</option>
                                    <option value="wrong_class">Неверный класс</option>
                                    <option value="damaged_container">Поврежден контейнер</option>
                                    <option value="missing_container">Не доставлен контейнер</option>
                                    <option value="other">Другое</option>
                                </select>
                                <input
                                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                    placeholder="Комментарий"
                                    value={disputeDescription}
                                    onChange={(event) => setDisputeDescription(event.target.value)}
                                    disabled={!canDispute}
                                />
                            </div>
                            <Button variant="outline" color="amber" onClick={handleDispute} disabled={!canDispute}>
                                Открыть спор
                            </Button>

                            {(isAdmin || isSupervisor) && (
                                <div className="grid gap-2">
                                    <input
                                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                        placeholder="Решение спора"
                                        value={resolutionText}
                                        onChange={(event) => setResolutionText(event.target.value)}
                                        disabled={!canResolve}
                                    />
                                    <Button variant="outline" color="emerald" onClick={handleResolve} disabled={!canResolve}>
                                        Закрыть спор
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
                    <div className="w-full max-w-3xl rounded-2xl bg-white shadow-lg">
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-800">Создать акт передачи</h2>
                                <p className="text-xs text-slate-500">Учреждение → Водитель</p>
                            </div>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="max-h-[70vh] overflow-y-auto px-5 py-4 space-y-4">
                            <div className="grid gap-3 md:grid-cols-2">
                                <div>
                                    <label className="text-xs font-semibold text-slate-500">Активная сессия</label>
                                    <select
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                        value={createSessionId}
                                        onChange={(event) => setCreateSessionId(event.target.value)}
                                    >
                                        <option value="">Выберите сессию</option>
                                        {activeSessions.map((item) => (
                                            <option key={item.session?._id} value={item.session?._id}>
                                                {item.session?.sessionId} • {item.session?.driver?.username || 'водитель'}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="mt-1 text-xs text-slate-400">
                                        Можно оставить пустым и выбрать водителя вручную
                                    </p>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500">Водитель</label>
                                    <select
                                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                        value={createDriverId}
                                        onChange={(event) => setCreateDriverId(event.target.value)}
                                    >
                                        <option value="">Выберите водителя</option>
                                        {drivers.map((driver) => (
                                            <option key={driver._id} value={driver.user?._id || driver.user}>
                                                {driver.user?.username || driver.user?.email || 'водитель'}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="mt-1 text-xs text-slate-400">
                                        Если выбрана активная сессия, водитель подставится автоматически
                                    </p>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-500">Контейнеры</label>
                                {selectedCompanyId && (
                                    <p className="mt-1 text-xs text-slate-400">
                                        Компания: {selectedCompanyName || selectedCompanyId}
                                    </p>
                                )}
                                <div className="mt-2 space-y-2">
                                    {filteredBins.map((bin) => {
                                        const checked = createContainers.includes(bin._id);
                                        return (
                                            <div key={bin._id} className="rounded-lg border border-slate-200 p-3">
                                                <label className="flex items-center gap-2 text-xs">
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() => toggleCreateContainer(bin._id)}
                                                        className="h-4 w-4 rounded text-teal-600"
                                                    />
                                                    <span className="font-semibold">{bin.binId}</span>
                                                    <span className="text-slate-500">{bin.wasteType}</span>
                                                </label>
                                                {checked && (
                                                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.1"
                                                            placeholder="Вес (кг)"
                                                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                                            value={createWeights[bin._id] || ''}
                                                            onChange={(event) =>
                                                                setCreateWeights((prev) => ({
                                                                    ...prev,
                                                                    [bin._id]: event.target.value
                                                                }))
                                                            }
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="Описание"
                                                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                                                            value={createNotes[bin._id] || ''}
                                                            onChange={(event) =>
                                                                setCreateNotes((prev) => ({
                                                                    ...prev,
                                                                    [bin._id]: event.target.value
                                                                }))
                                                            }
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {filteredBins.length === 0 && (
                                        <p className="text-xs text-slate-500">Контейнеров нет.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="border-t border-slate-200 px-5 py-4 flex gap-2">
                            <Button
                                variant="outline"
                                color="slate"
                                fullWidth
                                onClick={() => setShowCreateModal(false)}
                            >
                                Отмена
                            </Button>
                            <Button fullWidth onClick={handleCreateHandoff} isLoading={createSubmitting}>
                                Создать акт
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HandoffManagement;
