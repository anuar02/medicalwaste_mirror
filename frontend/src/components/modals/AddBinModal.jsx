// components/modals/AddBinModal.jsx
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useMutation } from 'react-query';
import { X, Plus, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../ui/Button';
import apiService from '../../services/api';

const AddBinModal = ({ isOpen, onClose, onSuccess }) => {
    // Form state
    const [formData, setFormData] = useState({
        binId: '',
        department: '',
        wasteType: 'Острые Медицинские Отходы',
        alertThreshold: 80,
        capacity: 50,
        latitude: 43.2364,
        longitude: 76.9457,
        floor: 1,
        room: '',
    });

    // Handle form change
    const handleChange = (e) => {
        const { name, value, type } = e.target;

        // Handle numeric inputs
        if (type === 'number' || name === 'alertThreshold' || name === 'capacity' || name === 'latitude' || name === 'longitude' || name === 'floor') {
            setFormData({
                ...formData,
                [name]: type === 'number' ? parseFloat(value) || 0 : parseInt(value, 10) || 0,
            });
        } else {
            setFormData({
                ...formData,
                [name]: value,
            });
        }
    };

    // Create bin mutation
    const createMutation = useMutation(
        (data) => apiService.wasteBins.create(data),
        {
            onSuccess: () => {
                toast.success('Контейнер успешно создан');
                resetForm();
                onSuccess?.();
                onClose();
            },
            onError: (error) => {
                toast.error(`Ошибка при создании контейнера: ${error.message}`);
            },
        }
    );

    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault();
        createMutation.mutate(formData);
    };

    // Reset form to initial state
    const resetForm = () => {
        setFormData({
            binId: '',
            department: '',
            wasteType: 'Острые Медицинские Отходы',
            alertThreshold: 80,
            capacity: 50,
            latitude: 43.2364,
            longitude: 76.9457,
            floor: 1,
            room: '',
        });
    };

    // If modal is not open, don't render anything
    if (!isOpen) return null;

    // Department options - would typically come from API
    const departmentOptions = [
        'Хирургическое Отделение',
        'Терапевтическое Отделение',
        'Педиатрическое Отделение',
        'Акушерское Отделение',
        'Инфекционное Отделение',
        'Лаборатория',
        'Реанимация',
    ];

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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-slate-800">
                        Добавление нового контейнера
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
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {/* Bin ID */}
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                ID Контейнера (формат DEPT-123)
                            </label>
                            <input
                                type="text"
                                name="binId"
                                value={formData.binId}
                                onChange={handleChange}
                                placeholder="MED-001"
                                pattern="[A-Z]+-\d{3,}"
                                title="ID должен быть в формате DEPT-123"
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                required
                            />
                        </div>

                        {/* Department */}
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                                Отделение
                            </label>
                            <input
                                type="text"
                                list="departments"
                                name="department"
                                value={formData.department}
                                onChange={handleChange}
                                className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                required
                            />
                            <datalist id="departments">
                                {departmentOptions.map((dept) => (
                                    <option key={dept} value={dept} />
                                ))}
                            </datalist>
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
                                {wasteTypeOptions.map((type) => (
                                    <option key={type} value={type}>
                                        {type}
                                    </option>
                                ))}
                            </select>
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

                        {/* Alert Threshold */}
                        <div className="md:col-span-2">
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

                        {/* Location */}
                        <div className="md:col-span-2">
                            <div className="flex items-center space-x-2">
                                <MapPin className="h-4 w-4 text-slate-400" />
                                <h3 className="text-sm font-medium text-slate-700">Местоположение</h3>
                            </div>
                            <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-2">
                                {/* Latitude */}
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-700">
                                        Широта
                                    </label>
                                    <input
                                        type="number"
                                        name="latitude"
                                        step="0.0001"
                                        min="-90"
                                        max="90"
                                        value={formData.latitude}
                                        onChange={handleChange}
                                        className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                    />
                                </div>

                                {/* Longitude */}
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-700">
                                        Долгота
                                    </label>
                                    <input
                                        type="number"
                                        name="longitude"
                                        step="0.0001"
                                        min="-180"
                                        max="180"
                                        value={formData.longitude}
                                        onChange={handleChange}
                                        className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                    />
                                </div>

                                {/* Floor */}
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-700">
                                        Этаж
                                    </label>
                                    <input
                                        type="number"
                                        name="floor"
                                        min="0"
                                        max="100"
                                        value={formData.floor}
                                        onChange={handleChange}
                                        className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                    />
                                </div>

                                {/* Room */}
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-700">
                                        Кабинет/Палата
                                    </label>
                                    <input
                                        type="text"
                                        name="room"
                                        value={formData.room}
                                        onChange={handleChange}
                                        placeholder="101"
                                        className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 focus:border-teal-500 focus:ring-teal-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Form actions */}
                    <div className="flex justify-end space-x-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={createMutation.isLoading}
                        >
                            Отмена
                        </Button>
                        <Button
                            type="submit"
                            isLoading={createMutation.isLoading}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Добавить контейнер
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

AddBinModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSuccess: PropTypes.func,
};

export default AddBinModal;