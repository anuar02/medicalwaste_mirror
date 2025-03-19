// components/modals/EditBinModal.jsx
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useMutation } from 'react-query';
import { X, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../ui/Button';
import apiService from '../../services/api';

const EditBinModal = ({ isOpen, onClose, bin, onSuccess }) => {
    // Form state
    const [formData, setFormData] = useState({
        department: '',
        wasteType: '',
        alertThreshold: 80,
        status: 'active',
        capacity: 50,
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
            });
        }
    }, [bin]);

    // Handle form change
    const handleChange = (e) => {
        const { name, value } = e.target;

        // Handle numeric inputs
        if (name === 'alertThreshold' || name === 'capacity') {
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
    const updateMutation = useMutation(
        (data) => apiService.wasteBins.update(bin.binId, data),
        {
            onSuccess: () => {
                toast.success('Контейнер успешно обновлен');
                onSuccess?.();
                onClose();
            },
            onError: (error) => {
                toast.error(`Ошибка при обновлении контейнера: ${error.message}`);
            },
        }
    );

    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault();
        updateMutation.mutate(formData);
    };

    // If modal is not open, don't render anything
    if (!isOpen || !bin) return null;

    // Waste type options
    const wasteTypeOptions = [
        'Острые Медицинские Отходы',
        'Инфекционные Отходы',
        'Патологические Отходы',
        'Фармацевтические Отходы',
        'Химические Отходы',
        'Радиоактивные Отходы',
        'Общие Медицинские Отходы',
    ];

    // Status options
    const statusOptions = [
        { value: 'active', label: 'Активен' },
        { value: 'maintenance', label: 'Обслуживание' },
        { value: 'offline', label: 'Офлайн' },
        { value: 'decommissioned', label: 'Выведен' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-slate-800">
                        Редактирование контейнера {bin.binId}
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
                            Отделение
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
                            Тип отходов
                        </label>
                        <select
                            name="wasteType"
                            value={formData.wasteType}
                            onChange={handleChange}
                            className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                            required
                        >
                            <option value="" disabled>Выберите тип отходов</option>
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
                            Статус
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

                    {/* Alert Threshold */}
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                            Порог оповещения (%)
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
                            Емкость (литры)
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

                    {/* Form actions */}
                    <div className="flex justify-end space-x-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
                            Отмена
                        </Button>
                        <Button
                            type="submit"
                            isLoading={updateMutation.isLoading}
                        >
                            <Save className="mr-2 h-4 w-4" />
                            Сохранить
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