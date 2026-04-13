import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { UserPlus, ArrowLeft } from 'lucide-react';
import apiService from '../../services/api';

const ROLES = [
    { value: 'user', label: 'User (read-only)' },
    { value: 'supervisor', label: 'Supervisor' },
    { value: 'driver', label: 'Driver' },
    { value: 'admin', label: 'Admin' },
];

const DEPARTMENTS = [
    'Хирургическое Отделение',
    'Терапевтическое Отделение',
    'Педиатрическое Отделение',
    'Акушерское Отделение',
    'Инфекционное Отделение',
    'Лаборатория',
    'Реанимация',
];

export default function AdminRegisterUser() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        passwordConfirm: '',
        role: 'user',
        phoneNumber: '',
        company: '',
        department: '',
        vehiclePlate: '',
    });

    const [errors, setErrors] = useState({});

    const { data: companiesData } = useQuery({
        queryKey: ['companies'],
        queryFn: () => apiService.companies?.getAll() ?? Promise.resolve({ data: { data: [] } }),
    });

    const companies = companiesData?.data?.data ?? [];

    const createMutation = useMutation({
        mutationFn: (userData) => apiService.auth.register(userData),
        onSuccess: () => {
            toast.success('User created successfully');
            navigate('/admin/users');
        },
        onError: (error) => {
            const msg = error?.response?.data?.message || error.message || 'Failed to create user';
            toast.error(msg);
        },
    });

    const validate = () => {
        const errs = {};
        if (!form.firstName.trim()) errs.firstName = 'First name is required';
        if (!form.lastName.trim()) errs.lastName = 'Last name is required';
        if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Valid email is required';
        if (!form.password || form.password.length < 8) errs.password = 'Password must be at least 8 characters';
        if (form.password !== form.passwordConfirm) errs.passwordConfirm = 'Passwords do not match';
        if (form.role === 'driver' && !form.company) errs.company = 'Company is required for drivers';
        if (form.role === 'driver' && !form.vehiclePlate.trim()) errs.vehiclePlate = 'Vehicle plate is required for drivers';
        if (form.phoneNumber && !/^\+[1-9]\d{6,14}$/.test(form.phoneNumber)) {
            errs.phoneNumber = 'Phone must be in E.164 format, e.g. +77051234567';
        }
        return errs;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) {
            setErrors(errs);
            return;
        }

        const payload = {
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            email: form.email.trim().toLowerCase(),
            password: form.password,
            passwordConfirm: form.passwordConfirm,
            role: form.role,
            phoneNumber: form.phoneNumber.trim() || undefined,
            company: form.company || undefined,
            department: form.department || undefined,
        };

        if (form.role === 'driver') {
            payload.vehicleInfo = { plateNumber: form.vehiclePlate.trim() };
        }

        createMutation.mutate(payload);
    };

    const field = (name, label, type = 'text', required = false) => (
        <div key={name}>
            <label className="block text-sm font-medium text-slate-700 mb-1">
                {label}{required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
                type={type}
                name={name}
                value={form[name]}
                onChange={handleChange}
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 ${
                    errors[name] ? 'border-red-400' : 'border-slate-300'
                }`}
            />
            {errors[name] && <p className="mt-1 text-xs text-red-600">{errors[name]}</p>}
        </div>
    );

    return (
        <div className="max-w-2xl mx-auto py-8 px-4">
            <div className="mb-6 flex items-center gap-3">
                <button
                    onClick={() => navigate('/admin/users')}
                    className="flex items-center text-slate-500 hover:text-slate-700 text-sm"
                >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back to Users
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50">
                        <UserPlus className="h-5 w-5 text-teal-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold text-slate-800">Create New User</h1>
                        <p className="text-sm text-slate-500">Add a new user to the system</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        {field('firstName', 'First Name', 'text', true)}
                        {field('lastName', 'Last Name', 'text', true)}
                    </div>

                    {field('email', 'Email Address', 'email', true)}

                    <div className="grid grid-cols-2 gap-4">
                        {field('password', 'Password', 'password', true)}
                        {field('passwordConfirm', 'Confirm Password', 'password', true)}
                    </div>

                    {field('phoneNumber', 'Phone Number (e.g. +77051234567)')}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Role<span className="text-red-500 ml-1">*</span>
                        </label>
                        <select
                            name="role"
                            value={form.role}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                        >
                            {ROLES.map((r) => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Company{form.role === 'driver' && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <select
                            name="company"
                            value={form.company}
                            onChange={handleChange}
                            className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 ${
                                errors.company ? 'border-red-400' : 'border-slate-300'
                            }`}
                        >
                            <option value="">— No Company —</option>
                            {companies.map((c) => (
                                <option key={c._id} value={c._id}>{c.name}</option>
                            ))}
                        </select>
                        {errors.company && <p className="mt-1 text-xs text-red-600">{errors.company}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                        <select
                            name="department"
                            value={form.department}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                        >
                            <option value="">— No Department —</option>
                            {DEPARTMENTS.map((d) => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                    </div>

                    {form.role === 'driver' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Vehicle Plate Number<span className="text-red-500 ml-1">*</span>
                            </label>
                            <input
                                type="text"
                                name="vehiclePlate"
                                value={form.vehiclePlate}
                                onChange={handleChange}
                                placeholder="e.g. 001 AA 01"
                                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 ${
                                    errors.vehiclePlate ? 'border-red-400' : 'border-slate-300'
                                }`}
                            />
                            {errors.vehiclePlate && <p className="mt-1 text-xs text-red-600">{errors.vehiclePlate}</p>}
                        </div>
                    )}

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => navigate('/admin/users')}
                            className="px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={createMutation.isPending}
                            className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-60 flex items-center gap-2"
                        >
                            <UserPlus className="h-4 w-4" />
                            {createMutation.isPending ? 'Creating...' : 'Create User'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
