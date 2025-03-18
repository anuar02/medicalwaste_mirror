// components/dashboard/DashboardStat.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { ArrowUpRight, ArrowDownRight, HelpCircle } from 'lucide-react';

const DashboardStat = ({
                           title,
                           value,
                           icon,
                           trend = null,
                           trendDirection = null,
                           helpText = '',
                           onClick
                       }) => {
    // Determine trend direction if not explicitly provided
    const direction = trendDirection || (trend > 0 ? 'up' : trend < 0 ? 'down' : 'neutral');

    // Color and icon based on direction
    const directionConfig = {
        up: {
            color: 'text-emerald-500',
            icon: <ArrowUpRight className="h-4 w-4" />,
        },
        down: {
            color: 'text-red-500',
            icon: <ArrowDownRight className="h-4 w-4" />,
        },
        neutral: {
            color: 'text-slate-500',
            icon: null,
        },
    };

    return (
        <div
            className={`rounded-lg bg-white p-6 shadow-sm ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
            onClick={onClick}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    {icon && (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50">
                            {icon}
                        </div>
                    )}
                    <div>
                        <h3 className="font-medium text-slate-500">{title}</h3>
                        <div className="group relative">
                            {helpText && (
                                <div className="absolute -right-6 top-1 cursor-help text-slate-400 group-hover:text-slate-500">
                                    <HelpCircle className="h-4 w-4" />
                                    <div className="absolute -right-4 bottom-full mb-2 hidden w-48 rounded-md bg-white p-2 text-xs text-slate-600 shadow-lg group-hover:block">
                                        {helpText}
                                        <div className="absolute -bottom-1 right-4 h-2 w-2 rotate-45 bg-white"></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                {trend !== null && (
                    <div className={`flex items-center space-x-1 ${directionConfig[direction].color}`}>
                        {directionConfig[direction].icon}
                        <span className="text-sm font-medium">{Math.abs(trend)}%</span>
                    </div>
                )}
            </div>
            <p className="mt-4 text-2xl font-bold text-slate-800">{value}</p>
        </div>
    );
};

DashboardStat.propTypes = {
    title: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    icon: PropTypes.node,
    trend: PropTypes.number,
    trendDirection: PropTypes.oneOf(['up', 'down', 'neutral']),
    helpText: PropTypes.string,
    onClick: PropTypes.func,
};

export default DashboardStat;