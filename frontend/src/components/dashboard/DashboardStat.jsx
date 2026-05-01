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
    onClick,
}) => {
    const direction = trendDirection || (trend > 0 ? 'up' : trend < 0 ? 'down' : 'neutral');

    const directionConfig = {
        up: {
            color: 'text-emerald-600',
            bg:    'bg-emerald-50 border-emerald-200',
            icon:  <ArrowUpRight className="h-3.5 w-3.5" />,
        },
        down: {
            color: 'text-red-500',
            bg:    'bg-red-50 border-red-200',
            icon:  <ArrowDownRight className="h-3.5 w-3.5" />,
        },
        neutral: {
            color: 'text-slate-500',
            bg:    'bg-slate-100 border-slate-200',
            icon:  null,
        },
    };

    return (
        <div
            className={`rounded-xl bg-white border border-slate-200 p-5 shadow-sm card-hover ${onClick ? 'cursor-pointer' : ''}`}
            onClick={onClick}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                    {icon && (
                        <div className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 border border-teal-100">
                            {icon}
                        </div>
                    )}
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <h3 className="text-xs font-medium text-slate-500 truncate">{title}</h3>
                            {helpText && (
                                <div className="group relative flex-shrink-0 cursor-help text-slate-400 hover:text-slate-600">
                                    <HelpCircle className="h-3 w-3" />
                                    <div className="absolute -right-4 bottom-full mb-2 hidden w-48 rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-600 shadow-lg group-hover:block z-50">
                                        {helpText}
                                        <div className="absolute -bottom-1 right-4 h-2 w-2 rotate-45 bg-white border-r border-b border-slate-200" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {trend !== null && (
                    <div className={`flex-shrink-0 flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${directionConfig[direction].color} ${directionConfig[direction].bg}`}>
                        {directionConfig[direction].icon}
                        <span className="font-data">{Math.abs(trend)}%</span>
                    </div>
                )}
            </div>

            <p className="mt-4 font-data text-2xl font-semibold text-slate-800">{value}</p>
        </div>
    );
};

DashboardStat.propTypes = {
    title:          PropTypes.string.isRequired,
    value:          PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    icon:           PropTypes.node,
    trend:          PropTypes.number,
    trendDirection: PropTypes.oneOf(['up', 'down', 'neutral']),
    helpText:       PropTypes.string,
    onClick:        PropTypes.func,
};

export default DashboardStat;
