// components/charts/WasteTypePieChart.jsx
import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

// Custom tooltip component
const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white/95 p-3 shadow-xl shadow-slate-900/10 backdrop-blur">
                <p className="mb-1 text-sm font-semibold"
                   style={{ color: payload[0].payload.fillColor }}>
                    {payload[0].name}
                </p>
                <p className="text-sm">
                    Количество: <span className="font-semibold">{payload[0].value}</span>
                </p>
                <p className="text-xs text-slate-500">
                    {payload[0].payload.percentage}% от общего числа
                </p>
            </div>
        );
    }

    return null;
};

CustomTooltip.propTypes = {
    active: PropTypes.bool,
    payload: PropTypes.array,
};

export default function WasteTypePieChart({ data }) {
    const { chartData, totalValue } = useMemo(() => {
        const safeData = Array.isArray(data) ? data.filter(item => item && item.value > 0) : [];
        const total = safeData.reduce((sum, item) => sum + item.value, 0);
        return {
            totalValue: total,
            chartData: total > 0
                ? safeData.map(item => ({
                    ...item,
                    percentage: Math.round((item.value / total) * 100),
                }))
                : []
        };
    }, [data]);

    if (chartData.length === 0) {
        return (
            <div className="flex h-72 w-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">
                Нет данных для отображения
            </div>
        );
    }

    return (
        <div className="grid h-72 w-full grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
            <div className="relative min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <defs>
                            {chartData.map((entry, index) => (
                                <linearGradient key={`gradient-${index}`} id={`wasteTypeGradient-${index}`} x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0%" stopColor={entry.fillColor} stopOpacity={0.96} />
                                    <stop offset="100%" stopColor={entry.fillColor} stopOpacity={0.58} />
                                </linearGradient>
                            ))}
                        </defs>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius="78%"
                            innerRadius="58%"
                            paddingAngle={3}
                            cornerRadius={7}
                            dataKey="value"
                            nameKey="name"
                            stroke="#ffffff"
                            strokeWidth={3}
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={`url(#wasteTypeGradient-${index})`} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-slate-900">{totalValue}</div>
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-400">контейнеров</div>
                    </div>
                </div>
            </div>
            <ul className="flex min-w-0 flex-col justify-center gap-2 overflow-hidden">
                {chartData.slice(0, 6).map((entry, index) => (
                    <li key={`${entry.name}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2">
                        <div className="flex min-w-0 items-center gap-2">
                            <span
                                className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                                style={{ backgroundColor: entry.fillColor }}
                            />
                            <span className="truncate text-xs font-medium text-slate-700">{entry.name}</span>
                        </div>
                        <span className="flex-shrink-0 text-xs font-semibold text-slate-500">{entry.percentage}%</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

WasteTypePieChart.propTypes = {
    data: PropTypes.arrayOf(
        PropTypes.shape({
            name: PropTypes.string.isRequired,
            value: PropTypes.number.isRequired,
            fillColor: PropTypes.string.isRequired,
        })
    ).isRequired,
};
