import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../services/api';
import Loader from '../../components/ui/Loader';
import Button from '../../components/ui/Button';

const PublicConfirmation = () => {
    const { token } = useParams();
    const [confirmed, setConfirmed] = useState(false);

    const handoffQuery = useQuery({
        queryKey: ['publicHandoff', token],
        queryFn: () => apiService.handoffs.getPublic(token),
        enabled: !!token
    });

    const handoff = handoffQuery.data?.data?.data?.handoff;

    const handleConfirm = async () => {
        try {
            await apiService.handoffs.confirmByToken(token);
            setConfirmed(true);
            toast.success('Передача подтверждена');
        } catch (error) {
            console.error('Confirm handoff error:', error);
            toast.error('Не удалось подтвердить передачу');
        }
    };

    if (handoffQuery.isLoading) {
        return <Loader text="Загрузка акта передачи..." />;
    }

    if (!handoff) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm text-center">
                    <h1 className="text-xl font-semibold text-slate-800">Акт не найден</h1>
                    <p className="mt-2 text-sm text-slate-500">
                        Ссылка недействительна или срок действия истек.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold text-slate-800">Акт передачи</h1>
                        <p className="text-xs text-slate-500">{handoff.handoffId}</p>
                    </div>
                </div>

                <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-slate-500">Тип</span>
                        <span className="font-medium text-slate-800">{handoff.type}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-slate-500">Контейнеров</span>
                        <span className="font-medium text-slate-800">{handoff.totalContainers}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-slate-500">Вес (заявлен)</span>
                        <span className="font-medium text-slate-800">{handoff.totalDeclaredWeight || 0} кг</span>
                    </div>
                </div>

                {handoff.containers?.length > 0 && (
                    <div className="mt-4">
                        <p className="text-xs font-semibold text-slate-600">Контейнеры</p>
                        <div className="mt-2 max-h-40 space-y-2 overflow-y-auto">
                            {handoff.containers.map((item) => (
                                <div key={item.container} className="rounded-lg border border-slate-200 p-2 text-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-slate-800">
                                            {item.binId || item.container}
                                        </span>
                                        <span className="text-slate-500">{item.fillLevel ?? '-'}%</span>
                                    </div>
                                    <div className="text-slate-500">{item.wasteType || 'Тип не указан'}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {confirmed ? (
                    <div className="mt-6 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-emerald-700 text-sm">
                        <CheckCircle className="h-5 w-5" />
                        Передача подтверждена
                    </div>
                ) : (
                    <Button className="mt-6 w-full" onClick={handleConfirm}>
                        Подтвердить передачу
                    </Button>
                )}
            </div>
        </div>
    );
};

export default PublicConfirmation;
