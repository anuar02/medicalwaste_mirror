// components/dashboard/BinStatusCard.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Clock, MapPin } from 'lucide-react';
import BinStatusBadge from '../bins/BinStatusBadge';
import { formatDate, formatPercentage } from '../../utils/formatters';

const BinStatusCard = ({ bin, showAction = false }) => {
    // Get color based on fullness level
    const getColor = () => {
        if (bin.fullness > 80) return 'bg-red-500';
        if (bin.fullness > 60) return 'bg-amber-500';
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
                                style={{ height: `${bin.fullness}%` }}
                            ></div>
                            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                                {formatPercentage(bin.fullness)}
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
                            <Clock className="mr-1 h-3 w-3" />
                            Обновлено:
                        </div>
                        <span className="font-medium text-slate-700">
              {formatDate(bin.lastUpdate, false, true)}
            </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center text-slate-500">
                            <MapPin className="mr-1 h-3 w-3" />
                            Комната:
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
        fullness: PropTypes.number.isRequired,
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