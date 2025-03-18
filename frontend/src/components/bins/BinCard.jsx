// components/bins/BinCard.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { Thermometer, Weight, Clock, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { formatDate, formatPercentage } from '../../utils/formatters';
import BinStatusBadge from './BinStatusBadge';

const BinCard = ({ bin, onClick }) => {
    // Check if bin needs attention (over threshold)
    const needsAttention = bin.fullness >= bin.alertThreshold;

    // Check if bin is online based on last update
    const isOnline = () => {
        const lastUpdateTime = new Date(bin.lastUpdate);
        const timeDiff = new Date() - lastUpdateTime;
        return timeDiff < 60000; // 1 minute
    };

    // Get fill color based on fullness level
    const getFillColor = () => {
        if (bin.fullness > 80) return 'bg-red-500';
        if (bin.fullness > 60) return 'bg-amber-500';
        return 'bg-teal-500';
    };

    return (
        <div
            className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md cursor-pointer"
            onClick={onClick}
        >
            {/* Header section */}
            <div className="border-b border-slate-100 px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-slate-800">{bin.binId}</h3>
                        <BinStatusBadge status={bin.status} />
                    </div>
                    <div className="flex items-center space-x-2">
                        {isOnline() ? (
                            <Wifi className="h-4 w-4 text-teal-500" />
                        ) : (
                            <WifiOff className="h-4 w-4 text-slate-400" />
                        )}
                        {needsAttention && (
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                        )}
                    </div>
                </div>
                <p className="mt-0.5 truncate text-sm text-slate-500">
                    {bin.department}
                </p>
            </div>

            {/* Fullness visualization */}
            <div className="p-4">
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">Заполненность</span>
                        <span className={`text-sm font-semibold ${
                            bin.fullness > 80 ? 'text-red-600' : bin.fullness > 60 ? 'text-amber-600' : 'text-teal-600'
                        }`}>
              {formatPercentage(bin.fullness)}
            </span>
                    </div>

                    {/* Progress bar */}
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                            className={`h-full transition-all duration-500 ${getFillColor()}`}
                            style={{ width: `${Math.min(100, Math.max(0, bin.fullness))}%` }}
                        />
                    </div>
                </div>

                {/* Info grid */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                        <div className="flex items-center">
                            <Thermometer className="mr-2 h-4 w-4 text-slate-500" />
                            <span className="text-xs text-slate-700">Темп.</span>
                        </div>
                        <span className="text-xs font-medium text-slate-800">
              {bin.temperature.toFixed(1)}°C
            </span>
                    </div>

                    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                        <div className="flex items-center">
                            <Weight className="mr-2 h-4 w-4 text-slate-500" />
                            <span className="text-xs text-slate-700">Вес</span>
                        </div>
                        <span className="text-xs font-medium text-slate-800">
              {bin.weight.toFixed(1)} кг
            </span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-500">
                <div className="flex items-center">
                    <Clock className="mr-1 h-3 w-3" />
                    <span>
            {formatDate(bin.lastUpdate, false, true)}
          </span>
                </div>
                <span>
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
        temperature: PropTypes.number.isRequired,
        weight: PropTypes.number.isRequired,
        status: PropTypes.string.isRequired,
        lastUpdate: PropTypes.string.isRequired,
    }).isRequired,
    onClick: PropTypes.func,
};

export default BinCard;