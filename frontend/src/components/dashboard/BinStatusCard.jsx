// components/dashboard/BinStatusCard.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Clock, MapPin, Ruler } from 'lucide-react';
import BinStatusBadge from '../bins/BinStatusBadge';
import { formatDate, formatPercentage } from '../../utils/formatters';

const BinStatusCard = ({ bin, showAction = false }) => {
    // Calculate fullness based on distance and container height
    const calculateFullness = () => {
        if (!bin.distance || !bin.containerHeight) return 0;

        // If distance >= containerHeight, bin is empty (0%)
        // If distance = 0, bin is full (100%)
        const fullnessPercentage = Math.max(0, Math.min(100,
            ((bin.containerHeight - bin.distance) / bin.containerHeight) * 100
        ));

        return Math.round(fullnessPercentage);
    };

    const fullness = bin.fullness || calculateFullness();

    // Get color based on fullness level
    const getColor = () => {
        if (fullness > 80) return 'bg-red-500';
        if (fullness > 60) return 'bg-amber-500';
        return 'bg-teal-500';
    };

    return (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-slate-800">{bin.binId}</h3>
                            <BinStatusBadge status={bin.status} />
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">{bin.department}</p>
                    </div>
                    {showAction && (
                        <Link
                            to={`/bins/${bin.binId}`}
                            className="flex items-center text-xs font-medium text-teal-600 hover:text-teal-700"
                        >
                            Подробнее
                            <ArrowUpRight className="ml-1 h-3 w-3" />
                        </Link>
                    )}
                </div>
            </div>

            <div className="p-4">
                <div className="mb-4 flex flex-col items-center">
                    <div className="flex items-center justify-center">
                        <div className="relative h-10 w-10 rounded overflow-hidden">
                            <div className="absolute inset-0 bg-slate-100"></div>
                            <div
                                className={`absolute bottom-0 w-full transition-all duration-500 ${getColor()}`}
                                style={{ height: `${fullness}%` }}
                            ></div>
                            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                                {formatPercentage(fullness)}
                            </div>
                        </div>
                    </div>
                    <div className="mt-2 text-center">
                        <p className="text-xs text-slate-500">
                            Порог оповещения: {bin.alertThreshold}%
                        </p>
                    </div>
                </div>

                <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center text-slate-500">
                            <Ruler className="mr-1 h-3 w-3" />
                            Расстояние:
                        </div>
                        <span className="font-medium text-slate-700">
                            {bin.location?.room || 'Не указано'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

BinStatusCard.propTypes = {
    bin: PropTypes.shape({
        binId: PropTypes.string.isRequired,
        department: PropTypes.string.isRequired,
        wasteType: PropTypes.string.isRequired,
        distance: PropTypes.number,
        containerHeight: PropTypes.number,
        fullness: PropTypes.number, // Optional - will be calculated if not provided
        alertThreshold: PropTypes.number.isRequired,
        status: PropTypes.string.isRequired,
        lastUpdate: PropTypes.string.isRequired,
        location: PropTypes.shape({
            coordinates: PropTypes.array.isRequired,
            room: PropTypes.string,
        }),
    }).isRequired,
    showAction: PropTypes.bool,
};

export default BinStatusCard;