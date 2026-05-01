// pages/BinDetails.jsx - Fixed version
import React, {useState, useCallback, useMemo, useEffect} from 'react';
import {useParams, useNavigate, Link} from 'react-router-dom';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
    Trash2, Edit, Clock, Thermometer, MapPin, Weight, ArrowLeft, Share2,
    AlertTriangle, AreaChart, Wrench, CheckCircle, RotateCcw, Bell, Download, QrCode, X,
} from 'lucide-react';
import QRCode from 'react-qr-code';

import apiService from '../services/api';
import {
    extractBinData,
    extractHistoryData,
    processHistoryData,
    validateBinData,
    validateHistoryData,
    handleApiError,
    createQueryWrapper,
    createMutationWrapper,
    useApiDebug,
    measureApiCall
} from '../utils/apiUtils';

import Loader from '../components/ui/Loader';
import {formatDate, formatPercentage} from '../utils/formatters';
import InfoCard from '../components/ui/InfoCard';
import BinVisualization from '../components/bins/BinVisualization';
import WasteLevelHistoryChart from '../components/charts/WasteLevelHistoryChart';
import Map from '../components/map/Map';
import Button from '../components/ui/Button';
import {useAuth} from '../contexts/AuthContext';
import DeleteConfirmationModal from '../components/modals/DeleteConfirmationModal';
import BinStatusBadge from '../components/bins/BinStatusBadge';
import EditBinModal from '../components/modals/EditBinModal';
import { Building2 } from 'lucide-react'; // Добавьте к существующим импортам из lucide-react

const BinDetails = () => {
    const {binId} = useParams();
    const navigate = useNavigate();
    const {isAdmin, isSupervisor} = useAuth();
    const queryClient = useQueryClient();
    const debug = useApiDebug();

    // State for modals and UI
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showQrModal, setShowQrModal] = useState(false);
    const [selectedTimePeriod, setSelectedTimePeriod] = useState('24h');

    debug.log('BinDetails component mounted', {binId, selectedTimePeriod});

    // Fetch bin details with enhanced error handling
    const {
        data: binResponse,
        isLoading: binLoading,
        error: binError,
        refetch: refetchBin
    } = useQuery({
        queryKey: ['bin', binId],
        queryFn: createQueryWrapper(
            async () => {
                debug.log('Fetching bin data', {binId});
                return measureApiCall(
                    () => apiService.wasteBins.getById(binId),
                    `Get Bin ${binId}`
                );
            },
            {context: 'Fetch Bin Details'}
        ).queryFn,
        refetchInterval: 30000,
        staleTime: 15000,
        retry: 3,
        enabled: !!binId
    });

    useEffect(() => {
        if (binResponse) {
            debug.log('Bin data fetched successfully', binResponse);
        }
    }, [binResponse]);

    useEffect(() => {
        if (binError) {
            debug.error('Failed to fetch bin data', binError);
        }
    }, [binError]);

    // Fixed history query - always try to fetch data, don't give up if one period fails
    const {
        data: historyResponse,
        isLoading: historyLoading,
        error: historyError,
        refetch: refetchHistory
    } = useQuery({
        queryKey: ['binHistory', binId, selectedTimePeriod],
        queryFn: createQueryWrapper(
            async () => {
                debug.log('Fetching history data', {binId, selectedTimePeriod});

                const historyApiCall = () => {
                    switch (selectedTimePeriod) {
                        case '1h':
                            return apiService.wasteBins.getHistory1h(binId);
                        case '6h':
                            return apiService.wasteBins.getHistory6h(binId);
                        case '24h':
                            return apiService.wasteBins.getHistory24h(binId);
                        case '7d':
                            return apiService.wasteBins.getHistory7d(binId);
                        case '30d':
                            return apiService.wasteBins.getHistory30d(binId);
                        default:
                            return apiService.wasteBins.getHistory(binId, {
                                period: selectedTimePeriod,
                                limit: 100
                            });
                    }
                };

                return measureApiCall(
                    historyApiCall,
                    `Get History ${selectedTimePeriod} for ${binId}`
                );
            },
            {context: 'Fetch Bin History'}
        ).queryFn,
        refetchInterval: selectedTimePeriod === '1h' ? 60000 : 300000,
        staleTime: selectedTimePeriod === '1h' ? 30000 : 120000,
        retry: 2,
        enabled: !!binId,
        // KEY FIX: Don't fail completely if one period has no data
        throwOnError: false
    });

    // Handle success/error with useEffect (v5 recommended approach)
    useEffect(() => {
        if (historyResponse) {
            debug.log('History data fetched successfully', {
                period: selectedTimePeriod,
                dataLength: extractHistoryData(historyResponse)?.length
            });
        }
    }, [historyResponse, selectedTimePeriod]);

    useEffect(() => {
        if (historyError) {
            debug.error('Failed to fetch history data', historyError);
        }
    }, [historyError]);

    // Extract and validate data
    const bin = useMemo(() => {
        const extracted = extractBinData(binResponse);
        if (extracted) {
            validateBinData(extracted);
            debug.log('Bin data extracted and validated', extracted);
        }
        return extracted;
    }, [binResponse, debug]);

    const containerHeight = useMemo(() => Number(bin?.containerHeight) || 50, [bin]);
    const distance = useMemo(() => Number(bin?.distance) || 0, [bin]);

    const processedHistory = useMemo(() => {
        const rawHistory = extractHistoryData(historyResponse);
        if (validateHistoryData(rawHistory)) {
            const processed = processHistoryData(rawHistory);
            debug.log('History data processed', {
                raw: rawHistory.length,
                processed: processed.length
            });
            return processed;
        }
        return [];
    }, [historyResponse, debug]);

    // Add fallback history query for when current period has no data
    const {
        data: fallbackHistoryResponse,
        isLoading: fallbackHistoryLoading
    } = useQuery({
        queryKey: ['binHistoryFallback', binId],
        queryFn: createQueryWrapper(
            async () => {
                debug.log('Fetching fallback history data', {binId});
                // Try to get ANY available history data
                return measureApiCall(
                    () => apiService.wasteBins.getHistory(binId, {
                        limit: 100 // Get last 100 points regardless of time
                    }),
                    `Get Fallback History for ${binId}`
                );
            },
            {context: 'Fetch Fallback History'}
        ).queryFn,
        enabled: !!binId && processedHistory.length === 0 && !historyLoading,
        throwOnError: false
    });

    // Use fallback data if main query returns empty
    const finalProcessedHistory = useMemo(() => {
        if (processedHistory.length > 0) {
            return processedHistory;
        }

        // Try fallback data
        const fallbackRawHistory = extractHistoryData(fallbackHistoryResponse);
        if (validateHistoryData(fallbackRawHistory)) {
            const processed = processHistoryData(fallbackRawHistory);
            debug.log('Using fallback history data', {
                raw: fallbackRawHistory.length,
                processed: processed.length
            });
            return processed;
        }

        return [];
    }, [processedHistory, fallbackHistoryResponse, debug]);

    const deleteMutation = useMutation({
        mutationFn: createMutationWrapper(
            async () => {
                debug.log('Deleting bin', {binId});
                return measureApiCall(
                    () => apiService.wasteBins.delete(binId),
                    `Delete Bin ${binId}`
                );
            },
            {
                context: 'Delete Bin',
                successMessage: 'Контейнер успешно удален'
            }
        ).mutationFn,
        onSuccess: () => {
            debug.log('Bin deleted successfully');
            navigate('/bins');
        },
        onError: (error) => {
            debug.error('Failed to delete bin', error);
        }
    });

    const updateStatusMutation = useMutation({
        mutationFn: createMutationWrapper(
            async (newStatus) => {
                debug.log('Updating bin status', {binId, newStatus});
                return measureApiCall(
                    () => apiService.wasteBins.update(binId, {status: newStatus}),
                    `Update Status ${binId}`
                );
            },
            {
                context: 'Update Bin Status',
                successMessage: 'Статус контейнера обновлен'
            }
        ).mutationFn,
        onSuccess: () => {
            debug.log('Bin status updated successfully');
            queryClient.invalidateQueries({queryKey: ['bin', binId]});
        },
        onError: (error) => {
            debug.error('Failed to update bin status', error);
        }
    });

    const sendAlertMutation = useMutation({
        mutationFn: createMutationWrapper(
            async () => {
                debug.log('Sending manual alert', {binId});
                return measureApiCall(
                    () => apiService.wasteBins.sendManualAlert(binId, {
                        alertType: 'manual',
                        message: 'Ручное оповещение от оператора',
                        priority: 'medium'
                    }),
                    `Send Alert ${binId}`
                );
            },
            {
                context: 'Send Manual Alert',
                successMessage: 'Оповещение отправлено'
            }
        ).mutationFn,
        onSuccess: () => {
            debug.log('Alert sent successfully');
        },
        onError: (error) => {
            debug.error('Failed to send alert', error);
        }
    });

    // Event handlers
    const handleTimePeriodChange = useCallback((period) => {
        debug.log('Changing time period', {from: selectedTimePeriod, to: period});
        setSelectedTimePeriod(period);
    }, [selectedTimePeriod, debug]);

    const handleDelete = useCallback(() => {
        deleteMutation.mutate();
        setShowDeleteModal(false);
    }, [deleteMutation]);

    const handleStatusChange = useCallback((newStatus) => {
        updateStatusMutation.mutate(newStatus);
    }, [updateStatusMutation]);

    const handleSendAlert = useCallback(() => {
        sendAlertMutation.mutate();
    }, [sendAlertMutation]);

    const handleExportData = useCallback(async (format = 'csv') => {
        try {
            debug.log('Exporting data', {format, binId});

            const endDate = new Date();
            const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

            const response = await measureApiCall(
                () => apiService.wasteBins.exportData(format, {
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString(),
                    binIds: [binId],
                    departments: bin?.department
                }),
                `Export Data ${format}`
            );

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `bin-${binId}-data.${format}`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success(`Данные экспортированы в формате ${format.toUpperCase()}`);
            debug.log('Data exported successfully', {format});
        } catch (error) {
            debug.error('Export failed', error);
            handleApiError(error, 'Export Data');
        }
    }, [bin, binId, debug]);

    // Computed values with safe property access
    const alertThreshold = useMemo(() => Number(bin?.alertThreshold) || 80, [bin]);
    const criticalThreshold = useMemo(() => Number(bin?.criticalThreshold) || 95, [bin]);
    const fullness = useMemo(() => Number(bin?.fullness) || 0, [bin]);
    const needsAttention = useMemo(() => fullness >= alertThreshold, [fullness, alertThreshold]);
    const isCritical = useMemo(() => fullness >= criticalThreshold, [fullness, criticalThreshold]);

    const isOnline = useCallback(() => {
        if (!bin?.lastUpdate) return false;
        const lastUpdateTime = new Date(bin.lastUpdate);
        const timeDiff = new Date() - lastUpdateTime;
        return timeDiff < 300000; // 5 minutes
    }, [bin]);

    const coordinates = useMemo(() => {
        const coords = bin?.location?.coordinates || [0, 0];
        return {
            latitude: coords[1] || 0,
            longitude: coords[0] || 0
        };
    }, [bin]);

    // Check if we're currently loading any history data
    const isLoadingAnyHistory = historyLoading || fallbackHistoryLoading;

    // Loading state
    if (binLoading) {
        debug.log('Showing loading state');
        return <Loader/>;
    }

    // Error state
    if (binError) {
        debug.error('Showing error state', binError);
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center">
                <AlertTriangle className="h-12 w-12 text-red-500"/>
                <h3 className="mt-2 text-lg font-semibold text-slate-800">Ошибка при загрузке данных</h3>
                <p className="mt-1 text-sm text-slate-500">
                    {binError?.response?.data?.message || binError?.message || 'Не удалось загрузить данные о контейнере'}
                </p>
                <div className="mt-4 flex space-x-3">
                    <Button onClick={() => navigate('/bins')} variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4"/>
                        Вернуться к списку
                    </Button>
                    <Button onClick={() => refetchBin()}>
                        <RotateCcw className="mr-2 h-4 w-4"/>
                        Попробовать снова
                    </Button>
                </div>
            </div>
        );
    }

    // Not found state
    if (!bin) {
        debug.warn('Bin not found', {binId});
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center">
                <AlertTriangle className="h-12 w-12 text-amber-500"/>
                <h3 className="mt-2 text-lg font-semibold text-slate-800">Контейнер не найден</h3>
                <p className="mt-1 text-sm text-slate-500">
                    Контейнер с ID "{binId}" не существует или был удален
                </p>
                <Button className="mt-4" onClick={() => navigate('/bins')} variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4"/>
                    Вернуться к списку
                </Button>
            </div>
        );
    }

    debug.log('Rendering bin details', {
        binId: bin.binId,
        fullness,
        historyItems: finalProcessedHistory.length,
        selectedTimePeriod
    });

    return (
        <div className="container mx-auto p-4">
            {/* Header */}
            <div className="mb-6 flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                <div className="flex items-center space-x-2">
                    <Link
                        to="/bins"
                        className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-500"
                    >
                        <ArrowLeft className="h-5 w-5"/>
                    </Link>
                    <div>
                        <div className="flex items-center space-x-3">
                            <h1 className="text-2xl font-bold text-slate-800">
                                {bin.binId || `Контейнер ${binId}`}
                            </h1>
                            <BinStatusBadge status={bin.status}/>
                            {isCritical && (
                                <span
                                    className="flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800 animate-pulse">
                                    <AlertTriangle className="mr-1 h-3 w-3"/>
                                    Критический уровень
                                </span>
                            )}
                            {needsAttention && !isCritical && (
                                <span
                                    className="flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                                    <AlertTriangle className="mr-1 h-3 w-3"/>
                                    Требуется внимание
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-slate-500">
                            {bin.department || 'Неизвестное отделение'} · {bin.wasteType || 'Тип отходов не указан'}
                        </p>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportData('csv')}
                    >
                        <Download className="mr-2 h-4 w-4"/>
                        Экспорт
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowQrModal(true)}
                    >
                        <QrCode className="mr-2 h-4 w-4"/>
                        QR Код
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSendAlert}
                        disabled={sendAlertMutation.isLoading}
                    >
                        <Bell className="mr-2 h-4 w-4"/>
                        Оповещение
                    </Button>

                    {(isAdmin || isSupervisor) && (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowEditModal(true)}
                            >
                                <Edit className="mr-2 h-4 w-4"/>
                                Редактировать
                            </Button>

                            {bin.status === 'active' ? (
                                <Button
                                    variant="outline"
                                    color="amber"
                                    size="sm"
                                    onClick={() => handleStatusChange('maintenance')}
                                    disabled={updateStatusMutation.isLoading}
                                >
                                    <Wrench className="mr-2 h-4 w-4"/>
                                    Обслуживание
                                </Button>
                            ) : bin.status === 'maintenance' || bin.status === 'offline' ? (
                                <Button
                                    variant="outline"
                                    color="emerald"
                                    size="sm"
                                    onClick={() => handleStatusChange('active')}
                                    disabled={updateStatusMutation.isLoading}
                                >
                                    <CheckCircle className="mr-2 h-4 w-4"/>
                                    Активировать
                                </Button>
                            ) : null}

                            {isAdmin && (
                                <Button
                                    variant="outline"
                                    color="red"
                                    size="sm"
                                    onClick={() => setShowDeleteModal(true)}
                                >
                                    <Trash2 className="mr-2 h-4 w-4"/>
                                    Удалить
                                </Button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Main content */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Left column */}
                <div className="space-y-6">
                    {/* Bin visualization */}
                    <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                        <div className="border-b border-slate-100 px-6 py-4">
                            <h2 className="text-lg font-semibold text-slate-800">Состояние Контейнера</h2>
                        </div>
                        <div className="p-6">
                            <div className="flex flex-col items-center">
                                <BinVisualization fullness={fullness}/>
                                <div className="mt-6 w-full">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-500">0%</span>
                                        <span className="text-xs text-slate-500">100%</span>
                                    </div>
                                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className={`h-full transition-all duration-500 ${
                                                fullness >= criticalThreshold
                                                    ? 'bg-red-500'
                                                    : fullness >= alertThreshold
                                                        ? 'bg-amber-500'
                                                        : fullness >= 60
                                                            ? 'bg-yellow-500'
                                                            : 'bg-teal-500'
                                            }`}
                                            style={{width: `${Math.min(100, Math.max(0, fullness))}%`}}
                                        />
                                    </div>
                                </div>

                                <div className="mt-6 w-full space-y-2">
                                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                                        <span className="text-sm font-medium text-slate-700">Текущий уровень</span>
                                        <span className="text-sm font-semibold text-slate-800">
                                            {fullness.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between rounded-lg bg-blue-50 px-4 py-3">
                                        <span className="text-sm font-medium text-blue-700">Расстояние от датчика</span>
                                        <span className="text-sm font-semibold text-blue-800">
                                            {distance} см из {containerHeight} см
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between rounded-lg bg-amber-50 px-4 py-3">
                                        <span className="text-sm font-medium text-amber-700">Порог предупреждения</span>
                                        <span className="text-sm font-semibold text-amber-800">
                                            {alertThreshold}%
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between rounded-lg bg-red-50 px-4 py-3">
                                        <span className="text-sm font-medium text-red-700">Критический порог</span>
                                        <span className="text-sm font-semibold text-red-800">
                                            {criticalThreshold}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bin information */}
                    <div className="space-y-6">
                        <InfoCard
                            title="Информация о контейнере"
                            items={[
                                {label: 'ID', value: bin.binId || binId},
                                {label: 'Отделение', value: bin.department || 'Не указано'},
                                {label: 'Тип отходов', value: bin.wasteType || 'Не указан'},
                                {label: 'Статус', value: <BinStatusBadge status={bin.status}/>},
                                {label: 'Ёмкость', value: `${bin.capacity || 50} литров`},
                                {
                                    label: 'Высота контейнера',
                                    value: `${containerHeight} см`,
                                    icon: <Share2 className="h-4 w-4 text-slate-400"/>
                                },
                                {
                                    label: 'Последнее обновление',
                                    value: bin.lastUpdate ? formatDate(bin.lastUpdate) : 'Неизвестно',
                                    icon: <Clock className="h-4 w-4 text-slate-400"/>
                                },
                                {
                                    label: 'Последний сбор',
                                    value: bin.lastCollection ? formatDate(bin.lastCollection) : 'Неизвестно',
                                    icon: <Trash2 className="h-4 w-4 text-slate-400"/>
                                },
                            ]}
                        />

                        <InfoCard
                            title="Информация о компании"
                            items={[
                                {
                                    label: 'Компания',
                                    value: bin.company ? (
                                        <div className="flex items-center space-x-2">
                                            <Building2 className="h-4 w-4 text-teal-600" />
                                            <span className="font-medium text-slate-800">
                        {bin.company.name}
                    </span>
                                        </div>
                                    ) : (
                                        <span className="flex items-center text-amber-600">
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Не назначена
                </span>
                                    ),
                                },
                                ...(bin.company ? [
                                    {
                                        label: 'Лицензия',
                                        value: bin.company.licenseNumber,
                                    },
                                    {
                                        label: 'Email',
                                        value: bin.company.contactInfo?.email || 'Не указан',
                                    },
                                    {
                                        label: 'Телефон',
                                        value: bin.company.contactInfo?.phone || 'Не указан',
                                    },
                                ] : []),
                            ]}
                        />

                        {/* Company Assignment Warning for Admin */}
                        {isAdmin && !bin.company && (
                            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                                <div className="flex items-start space-x-3">
                                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                                    <div className="flex-1">
                                        <h4 className="text-sm font-medium text-amber-900">
                                            Контейнер не назначен компании
                                        </h4>
                                        <p className="mt-1 text-sm text-amber-700">
                                            Водители и супервизоры не видят этот контейнер.
                                            Назначьте компанию через кнопку "Редактировать" или на странице{' '}
                                            <Link
                                                to="/admin/unassigned-bins"
                                                className="font-medium underline hover:text-amber-800"
                                            >
                                                неназначенных контейнеров
                                            </Link>
                                            .
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right columns */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Fixed chart section - always show time period selector */}
                    <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                        <div className="border-b border-slate-100 px-6 py-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-slate-800">История Заполнения</h2>
                                <div className="flex items-center space-x-2">
                                    <AreaChart className="h-5 w-5 text-slate-400"/>
                                    <span className="text-sm text-slate-500">
                                        {selectedTimePeriod === '1h' ? 'Последний час' :
                                            selectedTimePeriod === '6h' ? 'Последние 6 часов' :
                                                selectedTimePeriod === '24h' ? 'Последние 24 часа' :
                                                    selectedTimePeriod === '7d' ? 'Последние 7 дней' :
                                                        selectedTimePeriod === '30d' ? 'Последние 30 дней' : 'Пользовательский период'}
                                    </span>
                                </div>
                            </div>

                            {/* ALWAYS show time period selector - moved outside the chart area */}
                            <div className="mt-4 flex flex-wrap gap-2">
                                {['1h', '6h', '24h', '7d', '30d'].map((period) => (
                                    <button
                                        key={period}
                                        onClick={() => handleTimePeriodChange(period)}
                                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                                            selectedTimePeriod === period
                                                ? 'bg-teal-100 text-teal-700 border border-teal-200'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        {period === '1h' ? '1 час' :
                                            period === '6h' ? '6 часов' :
                                                period === '24h' ? '24 часа' :
                                                    period === '7d' ? '7 дней' :
                                                        period === '30d' ? '30 дней' : period}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="p-6">
                            {isLoadingAnyHistory ? (
                                <div className="flex items-center justify-center h-96">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                                    <span className="ml-3 text-sm text-slate-500">Загрузка истории...</span>
                                </div>
                            ) : historyError && finalProcessedHistory.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-96 text-center">
                                    <AlertTriangle className="h-8 w-8 text-amber-500 mb-2"/>
                                    <p className="text-sm text-slate-500 mb-2">
                                        Нет данных за период: {selectedTimePeriod}
                                    </p>
                                    <p className="text-xs text-slate-400 mb-4">
                                        Попробуйте выбрать другой период времени
                                    </p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => refetchHistory()}
                                    >
                                        <RotateCcw className="mr-2 h-4 w-4"/>
                                        Повторить
                                    </Button>
                                </div>
                            ) : finalProcessedHistory.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-96 text-center">
                                    <AreaChart className="h-8 w-8 text-slate-400 mb-2"/>
                                    <p className="text-sm text-slate-500">Нет данных для отображения</p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Попробуйте выбрать другой период времени или проверьте подключение датчика
                                    </p>
                                </div>
                            ) : (
                                <WasteLevelHistoryChart
                                    data={finalProcessedHistory}
                                    alertThreshold={alertThreshold}
                                    criticalThreshold={criticalThreshold}
                                    showPrediction={true}
                                    showTrend={true}
                                    showBrush={finalProcessedHistory.length > 20}
                                    height={400}
                                    onPeriodChange={handleTimePeriodChange}
                                    selectedPeriod={selectedTimePeriod}
                                />
                            )}
                        </div>
                    </div>

                    {/* Location */}
                    <div style={{zIndex: 0}} className="overflow-hidden rounded-xl bg-white shadow-sm">
                        <div className="border-b border-slate-100 px-6 py-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-slate-800">Местоположение</h2>
                                <div className="flex items-center space-x-2">
                                    <MapPin className="h-5 w-5 text-slate-400"/>
                                    <span className="text-sm text-slate-500">
                                        {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="h-[28rem]">
                            {coordinates.latitude !== 0 && coordinates.longitude !== 0 ? (
                                <Map
                                    center={[coordinates.latitude, coordinates.longitude]}
                                    zoom={16}
                                    markers={[
                                        {
                                            id: bin.binId || binId,
                                            position: [coordinates.latitude, coordinates.longitude],
                                            popup: `
                                                <strong>${bin.binId || binId}</strong><br/>
                                                ${bin.department || 'Неизвестное отделение'}<br/>
                                                Заполненность: ${formatPercentage(fullness)}<br/>
                                                Статус: ${bin.status || 'Неизвестен'}
                                            `
                                        }
                                    ]}
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-500 bg-slate-50">
                                    <div className="text-center">
                                        <MapPin className="h-8 w-8 mx-auto mb-2"/>
                                        <p className="font-medium">Координаты не указаны</p>
                                        <p className="text-sm">Местоположение контейнера недоступно</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <DeleteConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title="Удалить контейнер"
                message={`Вы уверены, что хотите удалить контейнер ${bin.binId || binId}? Это действие нельзя отменить.`}
                isDeleting={deleteMutation.isLoading}
            />

            <EditBinModal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                bin={bin}
                onSuccess={() => {
                    queryClient.invalidateQueries({queryKey: ['bin', binId]});
                    setShowEditModal(false);
                    toast.success('Контейнер успешно обновлен');
                }}
            />

            {/* QR Code Modal */}
            {showQrModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                    onClick={() => setShowQrModal(false)}
                >
                    <div
                        className="relative w-full max-w-xs rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setShowQrModal(false)}
                            className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        >
                            <X className="h-4 w-4" />
                        </button>

                        <h3 className="mb-1 font-chakra text-sm font-semibold uppercase tracking-wider text-slate-700">
                            QR Код контейнера
                        </h3>
                        <p className="mb-4 font-data text-xs text-teal-600">{bin.binId || binId}</p>

                        <div className="flex justify-center rounded-xl bg-white p-3 ring-1 ring-slate-100">
                            <QRCode
                                id="bin-qr-svg"
                                value={bin.binId || binId}
                                size={180}
                                fgColor="#0f172a"
                                bgColor="#ffffff"
                                level="M"
                            />
                        </div>

                        <p className="mt-3 text-center text-[11px] text-slate-400">
                            {bin.department || ''}{bin.wasteType ? ` · ${bin.wasteType}` : ''}
                        </p>

                        <button
                            onClick={() => {
                                const svg = document.getElementById('bin-qr-svg');
                                const svgData = new XMLSerializer().serializeToString(svg);
                                const blob = new Blob([svgData], { type: 'image/svg+xml' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `qr-${bin.binId || binId}.svg`;
                                a.click();
                                URL.revokeObjectURL(url);
                            }}
                            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
                        >
                            <Download className="h-4 w-4" />
                            Скачать SVG
                        </button>
                    </div>
                </div>
            )}

            {/* Debug panel for development */}
            {process.env.NODE_ENV === 'development' && (
                <div className="mt-8 rounded-lg bg-slate-100 p-4">
                    <details>
                        <summary className="cursor-pointer font-medium text-slate-700">
                            🔧 Debug Information
                        </summary>
                        <div className="mt-4 space-y-2 text-sm">
                            <div><strong>Bin ID:</strong> {binId}</div>
                            <div><strong>Selected Period:</strong> {selectedTimePeriod}</div>
                            <div><strong>Bin Data Available:</strong> {bin ? 'Yes' : 'No'}</div>
                            <div><strong>History Items (Main):</strong> {processedHistory.length}</div>
                            <div><strong>History Items (Final):</strong> {finalProcessedHistory.length}</div>
                            <div><strong>History Loading:</strong> {isLoadingAnyHistory ? 'Yes' : 'No'}</div>
                            <div><strong>History Error:</strong> {historyError ? 'Yes' : 'No'}</div>
                            <div><strong>Distance:</strong> {distance} cm</div>
                            <div><strong>Container Height:</strong> {containerHeight} cm</div>
                            <div><strong>Calculated Fullness:</strong> {fullness}% (({containerHeight} - {distance}) / {containerHeight} × 100)</div>
                            <div><strong>Alert Threshold:</strong> {alertThreshold}%</div>
                            <div><strong>Critical Threshold:</strong> {criticalThreshold}%</div>
                            <div><strong>Needs Attention:</strong> {needsAttention ? 'Yes' : 'No'}</div>
                            <div><strong>Is Critical:</strong> {isCritical ? 'Yes' : 'No'}</div>
                            <div><strong>Is Online:</strong> {isOnline() ? 'Yes' : 'No'}</div>
                            <div><strong>Coordinates:</strong> {coordinates.latitude}, {coordinates.longitude}</div>
                        </div>
                    </details>
                </div>
            )}
        </div>
    );
};

export default BinDetails;
