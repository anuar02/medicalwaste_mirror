import React from 'react';
// eslint-disable-next-line import/no-unresolved
import {motion} from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

const MetricCard = ({
                        title,
                        value,
                        icon,
                        color = 'blue',
                        trend,
                        subtitle,
                        onClick
                    }) => {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-600 border-blue-200',
        teal: 'bg-teal-50 text-teal-600 border-teal-200',
        red: 'bg-red-50 text-red-600 border-red-200',
        amber: 'bg-amber-50 text-amber-600 border-amber-200',
        purple: 'bg-purple-50 text-purple-600 border-purple-200',
        green: 'bg-green-50 text-green-600 border-green-200'
    };

    const getTrendColor = (trend) => {
        if (trend > 0) return 'text-green-600';
        if (trend < 0) return 'text-red-600';
        return 'text-slate-500';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2, boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.1)' }}
            className={`
                relative overflow-hidden rounded-xl border p-6 bg-white cursor-pointer
                ${onClick ? 'hover:border-teal-300' : 'border-slate-200'}
                transition-all duration-200
            `}
            onClick={onClick}
        >
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-slate-600">{title}</p>
                    <div className="mt-2 flex items-baseline">
                        <p className="text-2xl font-bold text-slate-900">{value}</p>
                        {trend !== undefined && (
                            <div className={`ml-2 flex items-center text-sm ${getTrendColor(trend)}`}>
                                {trend > 0 ? (
                                    <TrendingUp className="h-4 w-4" />
                                ) : trend < 0 ? (
                                    <TrendingDown className="h-4 w-4" />
                                ) : null}
                                <span className="ml-1">{Math.abs(trend)}%</span>
                            </div>
                        )}
                    </div>
                    {subtitle && (
                        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
                    )}
                </div>
                <div className={`rounded-lg p-3 ${colorClasses[color]}`}>
                    {icon}
                </div>
            </div>
        </motion.div>
    );
};