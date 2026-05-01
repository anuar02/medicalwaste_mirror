// components/bins/BinCard.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Thermometer, Weight, Clock, AlertTriangle, Wifi, WifiOff, Building2 } from 'lucide-react';
import { formatDate, formatPercentage } from '../../utils/formatters';
import BinStatusBadge from './BinStatusBadge';

const BinCard = ({ bin, onClick }) => {
    const { t } = useTranslation();
    const lastUpdateValue = bin.lastUpdate || bin.updatedAt || bin.createdAt;
    const lastUpdateDate = lastUpdateValue ? new Date(lastUpdateValue) : null;
    const companyName = typeof bin.company === 'object' ? bin.company?.name : null;
    const temperature = Number.isFinite(bin.temperature) ? bin.temperature : 0;
    const weight = Number.isFinite(bin.weight) ? bin.weight : 0;

    const needsAttention = bin.fullness >= bin.alertThreshold;

    const isOnline = () => {
        if (!lastUpdateDate || Number.isNaN(lastUpdateDate.getTime())) return false;
        return new Date() - lastUpdateDate < 60000;
    };

    const getFillColor = () => {
        if (bin.fullness > 80) return 'bg-red-500';
        if (bin.fullness > 60) return 'bg-amber-500';
        return 'bg-teal-500';
    };

    const getFullnessTextColor = () => {
        if (bin.fullness > 80) return 'text-red-600';
        if (bin.fullness > 60) return 'text-amber-600';
        return 'text-teal-600';
    };

    return (
        <div
            className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm card-hover cursor-pointer"
            onClick={onClick}
        >
            {/* Header */}
            <div className="border-b border-slate-100 px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h3 className="font-chakra font-semibold text-sm tracking-wide text-teal-700">
                            {bin.binId}
                        </h3>
                        <BinStatusBadge status={bin.status} />
                    </div>
                    <div className="flex items-center gap-2">
                        {isOnline() ? (
                            <Wifi className="h-3.5 w-3.5 text-teal-500" />
                        ) : (
                            <WifiOff className="h-3.5 w-3.5 text-slate-400" />
                        )}
                        {needsAttention && (
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                        )}
                    </div>
                </div>

                {companyName && (
                    <div className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-500">
                        <Building2 className="h-3 w-3" />
                        <span className="font-medium">{companyName}</span>
                    </div>
                )}
                <p className="mt-0.5 truncate text-xs text-slate-500">{bin.department}</p>
            </div>

            {/* Fullness */}
            <div className="p-4">
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">{t('binVisualization.currentFullness')}</span>
                        <span className={`font-data text-xs font-semibold ${getFullnessTextColor()}`}>
                            {formatPercentage(bin.fullness)}
                        </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                            className={`h-full transition-all duration-500 rounded-full ${getFillColor()}`}
                            style={{ width: `${Math.min(100, Math.max(0, bin.fullness))}%` }}
                        />
                    </div>
                </div>

                {/* Data grid */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                        <div className="flex items-center gap-1.5">
                            <Thermometer className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-[11px] text-slate-500">Темп.</span>
                        </div>
                        <span className="font-data text-[11px] font-medium text-slate-700">
                            {temperature.toFixed(1)}°C
                        </span>
                    </div>

                    <div className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                        <div className="flex items-center gap-1.5">
                            <Weight className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-[11px] text-slate-500">Вес</span>
                        </div>
                        <span className="font-data text-[11px] font-medium text-slate-700">
                            {weight.toFixed(1)} кг
                        </span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2">
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Clock className="h-3 w-3" />
                    <span className="font-data">{formatDate(lastUpdateValue, false, true)}</span>
                </div>
                <span className="text-[11px] text-slate-400 font-chakra tracking-wide">
                    {bin.wasteType.split(' ')[0]}
                </span>
            </div>
        </div>
    );
};

BinCard.propTypes = {
    bin: PropTypes.shape({
        binId: PropTypes.string.isRequired,
        department: PropTypes.string.isRequired,
        wasteType: PropTypes.string.isRequired,
        fullness: PropTypes.number.isRequired,
        alertThreshold: PropTypes.number.isRequired,
        temperature: PropTypes.number,
        weight: PropTypes.number,
        status: PropTypes.string.isRequired,
        lastUpdate: PropTypes.string,
        updatedAt: PropTypes.string,
        createdAt: PropTypes.string,
        company: PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.shape({ _id: PropTypes.string, name: PropTypes.string }),
        ]),
    }).isRequired,
    onClick: PropTypes.func,
};

export default BinCard;
