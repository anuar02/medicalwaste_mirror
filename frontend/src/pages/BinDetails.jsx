// pages/BinDetails.jsx
import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import {
    Trash2,
    Edit,
    Clock,
    Thermometer,
    MapPin,
    Weight,
    ArrowLeft,
    Share2,
    AlertTriangle,
    AreaChart,
    Wrench,
    CheckCircle,
    X,
    RotateCcw,
} from 'lucide-react';
import apiService from '../services/api';
import Loader from '../components/ui/Loader';
import { formatDate, formatPercentage } from '../utils/formatters';
import InfoCard from '../components/ui/InfoCard';
import BinVisualization from '../components/bins/BinVisualization';
import WasteLevelHistoryChart from '../components/charts/WasteLevelHistoryChart';
import Map from '../components/map/Map';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import DeleteConfirmationModal from '../components/modals/DeleteConfirmationModal';
import BinStatusBadge from '../components/bins/BinStatusBadge';
import EditBinModal from '../components/modals/EditBinModal';

const BinDetails = () => {
    const { binId } = useParams();
    const navigate = useNavigate();
    const { isAdmin, isSupervisor } = useAuth();
    const queryClient = useQueryClient();

    // State for modals
    const [showDeleteModal, setShowDeleteModal] = React.useState(false);
    const [showEditModal, setShowEditModal] = React.useState(false);

    // Fetch bin details
    const {
        data: binData,
        isLoading: binLoading,
        error: binError
    } = useQuery(
        ['bin', binId],
        () => apiService.wasteBins.getById(binId),
        {
            refetchInterval: 30000, // 30 seconds
            staleTime: 15000, // 15 seconds
        }
    );

    // Fetch bin history
    const {
        data: historyData,
        isLoading: historyLoading,
        error: historyError
    } = useQuery(
        ['binHistory', binId],
        () => apiService.wasteBins.getHistory(binId, { limit: 24 }),
        {
            refetchInterval: 60000, // 1 minute
            staleTime: 30000, // 30 seconds
        }
    );

    // Delete bin mutation
    const deleteMutation = useMutation(
        () => apiService.wasteBins.delete(binId),
        {
            onSuccess: () => {
                toast.success('Контейнер успешно удален');
                navigate('/bins');
            },
            onError: (error) => {
                toast.error(`Ошибка при удалении контейнера: ${error.message}`);
            },
        }
    );

    // Change bin status mutation
    const updateStatusMutation = useMutation(
        (newStatus) => apiService.wasteBins.update(binId, { status: newStatus }),
        {
            onSuccess: () => {
                toast.success('Статус контейнера обновлен');
                queryClient.invalidateQueries(['bin', binId]);
            },
            onError: (error) => {
                toast.error(`Ошибка при обновлении статуса: ${error.message}`);
            },
        }
    );

    // Handle delete
    const handleDelete = () => {
        deleteMutation.mutate();
        setShowDeleteModal(false);
    };

    // Handle status change
    const handleStatusChange = (newStatus) => {
        updateStatusMutation.mutate(newStatus);
    };

    // Loading state
    if (binLoading || historyLoading) {
        return <Loader />;
    }

    // Error state
    if (binError || historyError) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center">
                <AlertTriangle className="h-12 w-12 text-red-500" />
                <h3 className="mt-2 text-lg font-semibold text-slate-800">Ошибка при загрузке данных</h3>
                <p className="mt-1 text-sm text-slate-500">
                    {binError?.message || historyError?.message || 'Не удалось загрузить данные о контейнере'}
                </p>
                <div className="mt-4 flex space-x-3">
                    <Button
                        onClick={() => navigate('/bins')}
                        variant="outline"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Вернуться к списку
                    </Button>
                    <Button
                        onClick={() => queryClient.invalidateQueries(['bin', binId])}
                    >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Попробовать снова
                    </Button>
                </div>
            </div>
        );
    }

    // Extract data
    const bin = binData?.data?.data?.bin;
    const history = historyData?.data?.data?.history || [];

    // Format history data for chart
    const historyForChart = history.map(item => ({
        time: item.time,
        fullness: item.fullness,
        timestamp: new Date(item.timestamp),
    })).sort((a, b) => a.timestamp - b.timestamp);

    if (!bin) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center">
                <AlertTriangle className="h-12 w-12 text-amber-500" />
                <h3 className="mt-2 text-lg font-semibold text-slate-800">Контейнер не найден</h3>
                <p className="mt-1 text-sm text-slate-500">
                    Контейнер с ID "{binId}" не существует или был удален
                </p>
                <Button
                    className="mt-4"
                    onClick={() => navigate('/bins')}
                    variant="outline"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Вернуться к списку
                </Button>
            </div>
        );
    }

    // Check if bin needs attention
    const needsAttention = bin.fullness >= bin.alertThreshold;

    // Check if bin is online
    const isOnline = () => {
        const lastUpdateTime = new Date(bin.lastUpdate);
        const timeDiff = new Date() - lastUpdateTime;
        return timeDiff < 60000; // 1 minute
    };

    return (
        <div className="container mx-auto p-4">
            {/* Header section */}
            <div className="mb-6 flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                <div className="flex items-center space-x-2">
                    <Link
                        to="/bins"
                        className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-500"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <div className="flex items-center space-x-3">
                            <h1 className="text-2xl font-bold text-slate-800">
                                {bin.binId}
                            </h1>
                            <BinStatusBadge status={bin.status} />
                            {needsAttention && (
                                <span className="flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  Требуется внимание
                </span>
                            )}
                        </div>
                        <p className="text-sm text-slate-500">
                            {bin.department} · {bin.wasteType}
                        </p>
                    </div>
                </div>

                {/* Action buttons */}
                {(isAdmin || isSupervisor) && (
                    <div className="flex space-x-3">
                        <Button
                            variant="outline"
                            onClick={() => setShowEditModal(true)}
                        >
                            <Edit className="mr-2 h-4 w-4" />
                            Редактировать
                        </Button>

                        {bin.status === 'active' ? (
                            <Button
                                variant="outline"
                                color="amber"
                                onClick={() => handleStatusChange('maintenance')}
                            >
                                <Wrench className="mr-2 h-4 w-4" />
                                Обслуживание
                            </Button>
                        ) : bin.status === 'maintenance' ? (
                            <Button
                                variant="outline"
                                color="emerald"
                                onClick={() => handleStatusChange('active')}
                            >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Активировать
                            </Button>
                        ) : bin.status === 'offline' ? (
                            <Button
                                variant="outline"
                                color="emerald"
                                onClick={() => handleStatusChange('active')}
                            >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Активировать
                            </Button>
                        ) : null}

                        {isAdmin && (
                            <Button
                                variant="outline"
                                color="red"
                                onClick={() => setShowDeleteModal(true)}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Удалить
                            </Button>
                        )}
                    </div>
                )}
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
                                <BinVisualization fullness={bin.fullness} />
                                <div className="mt-6 w-full">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-500">0%</span>
                                        <span className="text-xs text-slate-500">100%</span>
                                    </div>
                                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className={`h-full transition-all duration-500 ${
                                                bin.fullness > 80
                                                    ? 'bg-red-500'
                                                    : bin.fullness > 60
                                                        ? 'bg-amber-500'
                                                        : 'bg-teal-500'
                                            }`}
                                            style={{ width: `${bin.fullness}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="mt-6 w-full">
                                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                                        <span className="text-sm font-medium text-slate-700">Порог оповещения</span>
                                        <span className="text-sm font-semibold text-slate-800">
                      {bin.alertThreshold}%
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
                                { label: 'ID', value: bin.binId },
                                { label: 'Отделение', value: bin.department },
                                { label: 'Тип отходов', value: bin.wasteType },
                                { label: 'Статус', value: <BinStatusBadge status={bin.status} /> },
                                { label: 'Ёмкость', value: `${bin.capacity || 50} литров` },
                                {
                                    label: 'Последнее обновление',
                                    value: formatDate(bin.lastUpdate),
                                    icon: <Clock className="h-4 w-4 text-slate-400" />
                                },
                                {
                                    label: 'Последний сбор',
                                    value: formatDate(bin.lastCollection),
                                    icon: <Trash2 className="h-4 w-4 text-slate-400" />
                                },
                            ]}
                        />

                        <InfoCard
                            title="Показатели датчиков"
                            items={[
                                {
                                    label: 'Температура',
                                    value: `${bin.temperature.toFixed(1)}°C`,
                                    icon: <Thermometer className="h-4 w-4 text-slate-400" />
                                },
                                {
                                    label: 'Вес',
                                    value: `${bin.weight.toFixed(1)} кг`,
                                    icon: <Weight className="h-4 w-4 text-slate-400" />
                                },
                                {
                                    label: 'Расстояние',
                                    value: `${bin.distance.toFixed(1)} см`,
                                    icon: <Share2 className="h-4 w-4 text-slate-400" />
                                },
                                {
                                    label: 'Статус сети',
                                    value: isOnline() ? (
                                        <span className="flex items-center text-emerald-600">
                      <span className="mr-2 h-2 w-2 rounded-full bg-emerald-500"></span>
                      Онлайн
                    </span>
                                    ) : (
                                        <span className="flex items-center text-slate-500">
                      <span className="mr-2 h-2 w-2 rounded-full bg-slate-400"></span>
                      Офлайн
                    </span>
                                    ),
                                },
                            ]}
                        />
                    </div>
                </div>

                {/* Middle and right columns */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Waste level history chart */}
                    <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                        <div className="border-b border-slate-100 px-6 py-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-slate-800">История Заполнения</h2>
                                <div className="flex items-center space-x-2">
                                    <AreaChart className="h-5 w-5 text-slate-400" />
                                    <span className="text-sm text-slate-500">Последние 24 часа</span>
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="h-80">
                                <WasteLevelHistoryChart data={historyForChart} />
                            </div>
                        </div>
                    </div>

                    {/* Location */}
                    <div style={{zIndex:0}} className="overflow-hidden rounded-xl bg-white shadow-sm">
                        <div className="border-b border-slate-100 px-6 py-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-slate-800">Местоположение</h2>
                                <div className="flex items-center space-x-2">
                                    <MapPin className="h-5 w-5 text-slate-400" />
                                    <span className="text-sm text-slate-500">
                    {bin.location.coordinates[1].toFixed(6)}, {bin.location.coordinates[0].toFixed(6)}
                  </span>
                                </div>
                            </div>
                        </div>
                        <div className="h-96">
                            <Map
                                center={[bin.location.coordinates[1], bin.location.coordinates[0]]}
                                zoom={16}
                                markers={[
                                    {
                                        id: bin.binId,
                                        position: [bin.location.coordinates[1], bin.location.coordinates[0]],
                                        popup: `
                      <strong>${bin.binId}</strong><br/>
                      ${bin.department}<br/>
                      Заполненность: ${formatPercentage(bin.fullness)}
                    `
                                    }
                                ]}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title="Удалить контейнер"
                message={`Вы уверены, что хотите удалить контейнер ${bin.binId}? Это действие нельзя отменить.`}
                isDeleting={deleteMutation.isLoading}
            />

            {/* Edit Bin Modal */}
            <EditBinModal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                bin={bin}
                onSuccess={() => {
                    queryClient.invalidateQueries(['bin', binId]);
                }}
            />
        </div>
    );
};

export default BinDetails;
