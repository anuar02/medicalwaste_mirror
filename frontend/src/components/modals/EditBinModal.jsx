// components/modals/EditBinModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import { useMutation, useQuery } from '@tanstack/react-query';
import { X, Save, Ruler, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../ui/Button';
import apiService from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const EditBinModal = ({ isOpen, onClose, bin, onSuccess }) => {
    const { t } = useTranslation();
    const { isAdmin } = useAuth();

    // Form state
    const [formData, setFormData] = useState({
        department: '',
        wasteType: '',
        alertThreshold: 80,
        status: 'active',
        capacity: 50,
        containerHeight: 50,
        company: null, // stores company id or null
    });

    // Fetch companies list (only for admin)
    const { data: companiesData, isLoading: companiesLoading } = useQuery({
        queryKey: ['companies'],
        queryFn: () => apiService.companies.getAll(),
        enabled: Boolean(isAdmin && isOpen),
    });

    // Robust normalization of companies payload into an array
    const companies = useMemo(() => {
        const raw =
            companiesData?.data?.data ??
            companiesData?.data ??
            companiesData ??
            [];
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw.items)) return raw.items;
        if (Array.isArray(raw.results)) return raw.results;
        // Some APIs nest under `content` or `records`
        if (Array.isArray(raw.content)) return raw.content;
        if (Array.isArray(raw.records)) return raw.records;
        return [];
    }, [companiesData]);

    // Initialize form data when bin changes
    useEffect(() => {
        if (bin) {
            setFormData({
                department: bin.department ?? '',
                wasteType: bin.wasteType ?? '',
                alertThreshold: Number.isFinite(bin.alertThreshold)
                    ? bin.alertThreshold
                    : 80,
                status: bin.status ?? 'active',
                capacity: Number.isFinite(bin.capacity) ? bin.capacity : 50,
                containerHeight: Number.isFinite(bin.containerHeight)
                    ? bin.containerHeight
                    : 50,
                // Accept either populated object or id
                company:
                    (bin.company && typeof bin.company === 'object'
                        ? bin.company?._id
                        : bin.company) ?? null,
            });
        }
    }, [bin]);

    // Handle form change
    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === 'alertThreshold' || name === 'capacity' || name === 'containerHeight') {
            const num = Number(value);
            setFormData((prev) => ({ ...prev, [name]: Number.isFinite(num) ? num : 0 }));
            return;
        }

        if (name === 'company') {
            // Keep '' in the select, but store null in state
            setFormData((prev) => ({ ...prev, company: value || null }));
            return;
        }

        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    // Update bin mutation
    const updateMutation = useMutation({
        mutationFn: (data) => apiService.wasteBins.update(bin._id, formData),
        onSuccess: () => {
            toast.success(t('binModals.updated', 'Контейнер обновлен'));
            onSuccess?.();
            onClose();
        },
        onError: (error) => {
            toast.error(
                t('binModals.updateError', { message: error?.message || 'Ошибка' }) ||
                'Ошибка обновления'
            );
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-slate-800">
                        {t('binModals.editTitle', { id: bin.binId })}
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                <option value="" disabled>
                                    {t('binModals.chooseWasteType', 'Выберите тип отходов')}
                                </option>
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

                        {/* Company Selection - ADMIN ONLY */}
                        {isAdmin && (
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">
                                    <div className="flex items-center">
                                        <Building2 className="mr-2 h-4 w-4" />
                                        {t('binModals.company', 'Компания')}
                                    </div>
                                </label>
                                <select
                                    name="company"
                                    value={formData.company ?? ''} // keep select controlled
                                    onChange={handleChange}
                                    className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                    disabled={companiesLoading}
                                >
                                    <option value="">
                                        {companiesLoading ? 'Загрузка...' : 'Не назначено'}
                                    </option>
                                    {Array.isArray(companies) &&
                                        companies.map((company) => (
                                            <option key={company._id} value={company._id}>
                                                {company.name}
                                                {company.licenseNumber ? ` (${company.licenseNumber})` : ''}
                                            </option>
                                        ))}
                                </select>
                                <p className="mt-1 text-xs text-slate-500">
                                    {t(
                                        'binModals.companyHelp',
                                        'Контейнеры без компании не видны водителям'
                                    )}
                                </p>
                            </div>
                        )}

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
                    </div>

                    {/* Container Height */}
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
                            {t(
                                'binModals.containerHeightHelp',
                                'Высота контейнера влияет на расчет заполненности'
                            )}
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
                    {Math.max(
                        0,
                        Math.min(
                            100,
                            Math.round(
                                ((formData.containerHeight - bin.distance) /
                                    formData.containerHeight) *
                                100
                            )
                        )
                    )}
                                        %
                  </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Form actions */}
                    <div className="flex justify-end space-x-3 pt-4">
                        <Button type="button" variant="outline" onClick={onClose}>
                            {t('common.cancel', 'Отмена')}
                        </Button>
                        <Button type="submit" isLoading={updateMutation.isLoading}>
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
