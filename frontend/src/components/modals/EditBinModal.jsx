// components/modals/EditBinModal.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import { useMutation } from '@tanstack/react-query';
import { X, Save, Ruler } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../ui/Button';
import apiService from '../../services/api';

const EditBinModal = ({ isOpen, onClose, bin, onSuccess }) => {
    // Form state
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        department: '',
        wasteType: '',
        alertThreshold: 80,
        status: 'active',
        capacity: 50,
        containerHeight: 50, // New field for container height
    });

    // Initialize form data when bin changes
    useEffect(() => {
        if (bin) {
            setFormData({
                department: bin.department || '',
                wasteType: bin.wasteType || '',
                alertThreshold: bin.alertThreshold || 80,
                status: bin.status || 'active',
                capacity: bin.capacity || 50,
                containerHeight: bin.containerHeight || 50, // Default to 50cm
            });
        }
    }, [bin]);

    // Handle form change
    const handleChange = (e) => {
        const { name, value } = e.target;

        // Handle numeric inputs
        if (name === 'alertThreshold' || name === 'capacity' || name === 'containerHeight') {
            setFormData({
                ...formData,
                [name]: parseInt(value, 10) || 0,
            });
        } else {
            setFormData({
                ...formData,
                [name]: value,
            });
        }
    };

    // Update bin mutation
    const updateMutation = useMutation({
        mutationFn: (data) => apiService.wasteBins.update(bin.binId, data),
        onSuccess: () => {
            toast.success(t('binModals.updated'));
            onSuccess?.();
            onClose();
        },
        onError: (error) => {
            toast.error(t('binModals.updateError', { message: error.message }));
        },
    });

    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault();
        updateMutation.mutate(formData);
    };

    // If modal is not open, don't render anything
    if (!isOpen || !bin) return null;

    // Waste type options
    const wasteTypeOptions = [
        t('wasteTypes.sharps', 'Острые Медицинские Отходы'),
        t('wasteTypes.infectious', 'Инфекционные Отходы'),
        t('wasteTypes.pathological', 'Патологические Отходы'),
        t('wasteTypes.pharmaceutical', 'Фармацевтические Отходы'),
        t('wasteTypes.chemical', 'Химические Отходы'),
        t('wasteTypes.radioactive', 'Радиоактивные Отходы'),
        t('wasteTypes.general', 'Общие Медицинские Отходы'),
    ];

    // Status options
    const statusOptions = [
        { value: 'active', label: t('status.active', 'Активен') },
        { value: 'maintenance', label: t('status.maintenance', 'Обслуживание') },
        { value: 'offline', label: t('status.offline', 'Офлайн') },
        { value: 'decommissioned', label: t('status.decommissioned', 'Выведен') },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-slate-800">
                        {t('binModals.editTitle', { id: bin.binId, defaultValue: `Редактирование контейнера ${bin.binId}` })}
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-500"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Department */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                            {t('binModals.department', 'Отделение')}
                        </label>
                        <input
                            type="text"
                            name="department"
                            value={formData.department}
                            onChange={handleChange}
                            className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                            required
                        />
                    </div>

                    {/* Waste Type */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                            {t('binModals.wasteType', 'Тип отходов')}
                        </label>
                        <select
                            name="wasteType"
                            value={formData.wasteType}
                            onChange={handleChange}
                            className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                            required
                        >
                            <option value="" disabled>{t('binModals.chooseWasteType', 'Выберите тип отходов')}</option>
                            {wasteTypeOptions.map((type) => (
                                <option key={type} value={type}>
                                    {type}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Status */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                            {t('binModals.status', 'Статус')}
                        </label>
                        <select
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                            className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                            required
                        >
                            {statusOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Container Height - New Field */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                            <div className="flex items-center">
                                <Ruler className="mr-2 h-4 w-4" />
                                {t('binModals.containerHeight', 'Высота контейнера (см)')}
                            </div>
                        </label>
                        <div className="flex items-center space-x-2">
                            <input
                                type="range"
                                name="containerHeight"
                                min="10"
                                max="200"
                                step="5"
                                value={formData.containerHeight}
                                onChange={handleChange}
                                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-teal-500"
                            />
                            <span className="min-w-[50px] text-center text-sm font-medium text-slate-700">
                                {formData.containerHeight}см
                            </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                            {t('binModals.containerHeightHelp', 'Высота контейнера влияет на расчет заполненности по данным датчика расстояния')}
                        </p>
                    </div>

                    {/* Alert Threshold */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                            {t('binModals.alertThreshold', 'Порог оповещения (%)')}
                        </label>
                        <div className="flex items-center space-x-2">
                            <input
                                type="range"
                                name="alertThreshold"
                                min="50"
                                max="95"
                                step="5"
                                value={formData.alertThreshold}
                                onChange={handleChange}
                                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-teal-500"
                            />
                            <span className="min-w-[40px] text-center text-sm font-medium text-slate-700">
                                {formData.alertThreshold}%
                            </span>
                        </div>
                    </div>

                    {/* Capacity */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                            {t('binModals.capacity', 'Емкость (литры)')}
                        </label>
                        <input
                            type="number"
                            name="capacity"
                            min="1"
                            max="1000"
                            value={formData.capacity}
                            onChange={handleChange}
                            className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                            required
                        />
                    </div>

                    {/* Current Sensor Reading Display */}
                    {bin.distance !== undefined && (
                        <div className="rounded-lg bg-slate-50 p-3">
                            <h4 className="text-sm font-medium text-slate-700 mb-2">
                                {t('binModals.currentReading', 'Текущие показания датчика')}
                            </h4>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                    <span className="text-slate-500">Расстояние:</span>
                                    <span className="ml-2 font-medium">{bin.distance}см</span>
                                </div>
                                <div>
                                    <span className="text-slate-500">Заполненность:</span>
                                    <span className="ml-2 font-medium">
                                        {Math.max(0, Math.min(100,
                                            Math.round(((formData.containerHeight - bin.distance) / formData.containerHeight) * 100)
                                        ))}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Form actions */}
                    <div className="flex justify-end space-x-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
                            {t('common.cancel', 'Отмена')}
                        </Button>
                        <Button
                            type="submit"
                            isLoading={updateMutation.isLoading}
                        >
                            <Save className="mr-2 h-4 w-4" />
                            {t('common.save', 'Сохранить')}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

EditBinModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    bin: PropTypes.object,
    onSuccess: PropTypes.func,
};

export default EditBinModal;