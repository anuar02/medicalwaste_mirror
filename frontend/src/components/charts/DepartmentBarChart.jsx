// components/charts/DepartmentBarChart.jsx
import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';

// ── helpers (must be declared before the components that reference them) ─────

const SHORT_NAMES = {
    'Хирургическое Отделение': 'Хирургия',
    'Терапевтическое Отделение': 'Терапия',
    'Педиатрическое Отделение': 'Педиатрия',
    'Акушерское Отделение': 'Акушерство',
    'Инфекционное Отделение': 'Инфекция',
    'Реанимация': 'Реанимация',
    'Лаборатория': 'Лаборатория',
};

function shortenDepartmentName(name) {
    if (!name) return 'Unknown';
    return SHORT_NAMES[name] || name;
}

function getColorByFullness(fullness) {
    if (fullness > 80) return 'url(#criticalGradient)';
    if (fullness > 60) return 'url(#warningGradient)';
    return 'url(#fullnessGradient)';
}

// ── CustomTooltip ─────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    return (
        <div className="rounded-xl border border-slate-200 bg-white/95 p-3 shadow-xl shadow-slate-900/10 backdrop-blur">
            <p className="mb-2 text-sm font-semibold text-slate-800">{label || 'Unknown'}</p>
            <div className="space-y-1.5">
                {payload[0] && (
                    <p className="text-sm text-slate-600">
                        <span className="mr-2 inline-block h-2 w-2 rounded-full bg-teal-500" />
                        Заполненность:{' '}
                        <span className="font-semibold">
                            {payload[0].value !== undefined ? `${payload[0].value.toFixed(1)}%` : 'N/A'}
                        </span>
                    </p>
                )}
                {payload[1] && (
                    <p className="text-sm text-slate-600">
                        <span className="mr-2 inline-block h-2 w-2 rounded-full bg-blue-500" />
                        Контейнеров:{' '}
                        <span className="font-semibold">
                            {payload[1].value !== undefined ? payload[1].value : 'N/A'}
                        </span>
                    </p>
                )}
                {payload[2] && (
                    <p className="text-sm text-purple-600">
                        <span className="inline-block h-2 w-2 rounded-full bg-purple-500 mr-1" />
                        Общий вес:{' '}
                        <span className="font-semibold">
                            {payload[2].value !== undefined ? `${payload[2].value.toFixed(1)} кг` : 'N/A'}
                        </span>
                    </p>
                )}
            </div>
        </div>
    );
};

CustomTooltip.propTypes = {
    active:  PropTypes.bool,
    payload: PropTypes.array,
    label:   PropTypes.string,
};

// ── DepartmentBarChart ────────────────────────────────────────────────────────

export default function DepartmentBarChart({ data }) {
    const chartData = useMemo(() => {
        if (!Array.isArray(data) || data.length === 0) return [];
        return data
            .map((item) => {
                if (!item) return null;
                return {
                    department:      item.department || 'Unknown',
                    shortDepartment: shortenDepartmentName(item.department || 'Unknown'),
                    binCount:        item.binCount    || 0,
                    avgFullness:     item.avgFullness  || 0,
                    totalWeight:     item.totalWeight  || 0,
                };
            })
            .filter(Boolean);
    }, [data]);

    if (chartData.length === 0) {
        return (
            <div className="flex h-full w-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-slate-400">
                Нет данных для отображения
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
                data={chartData}
                margin={{ top: 18, right: 18, left: 0, bottom: 32 }}
                barCategoryGap="24%"
            >
                <defs>
                    <linearGradient id="fullnessGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#14b8a6" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="#99f6e4" stopOpacity={0.55} />
                    </linearGradient>
                    <linearGradient id="criticalGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#ef4444" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="#fecaca" stopOpacity={0.65} />
                    </linearGradient>
                    <linearGradient id="warningGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#f59e0b" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="#fde68a" stopOpacity={0.70} />
                    </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="4 8" stroke="#e2e8f0" vertical={false} />

                <XAxis
                    dataKey="shortDepartment"
                    stroke="#64748b"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    interval={0}
                    angle={-28}
                    textAnchor="end"
                    height={52}
                />
                <YAxis
                    yAxisId="left"
                    orientation="left"
                    stroke="#0d9488"
                    domain={[0, 100]}
                    tickCount={6}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#3b82f6"
                    domain={[0, 'dataMax + 2']}
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                />

                <Tooltip content={<CustomTooltip />} />

                <Bar
                    yAxisId="left"
                    dataKey="avgFullness"
                    name="avgFullness"
                    fill="url(#fullnessGradient)"
                    radius={[8, 8, 2, 2]}
                    maxBarSize={42}
                >
                    {chartData.map((entry, index) => (
                        <Cell
                            key={`cell-${index}`}
                            fill={getColorByFullness(entry.avgFullness || 0)}
                        />
                    ))}
                </Bar>

                <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="binCount"
                    name="binCount"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#ffffff', stroke: '#2563eb', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: '#2563eb', stroke: '#ffffff', strokeWidth: 2 }}
                />

                <Bar
                    yAxisId="right"
                    dataKey="totalWeight"
                    name="totalWeight"
                    fill="#8b5cf6"
                    radius={[4, 4, 0, 0]}
                    hide
                />
            </ComposedChart>
        </ResponsiveContainer>
    );
}

DepartmentBarChart.propTypes = {
    data: PropTypes.arrayOf(
        PropTypes.shape({
            department:  PropTypes.string,
            binCount:    PropTypes.number,
            avgFullness: PropTypes.number,
            totalWeight: PropTypes.number,
        })
    ),
};
