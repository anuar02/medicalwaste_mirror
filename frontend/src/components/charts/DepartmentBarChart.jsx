// components/charts/DepartmentBarChart.jsx
import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell,
} from 'recharts';

// Custom tooltip component with extra safety checks
const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) {
        return null;
    }

    return (
        <div className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
            <p className="mb-1 text-sm font-semibold text-slate-700">{label || 'Unknown'}</p>
            <div className="space-y-1">
                {payload[0] && (
                    <p className="text-sm text-teal-600">
                        <span className="inline-block h-2 w-2 rounded-full bg-teal-500 mr-1"></span>
                        Заполненность: <span className="font-semibold">
                            {payload[0].value !== undefined ? `${payload[0].value.toFixed(1)}%` : 'N/A'}
                        </span>
                    </p>
                )}
                {payload[1] && (
                    <p className="text-sm text-blue-600">
                        <span className="inline-block h-2 w-2 rounded-full bg-blue-500 mr-1"></span>
                        Контейнеров: <span className="font-semibold">
                            {payload[1].value !== undefined ? payload[1].value : 'N/A'}
                        </span>
                    </p>
                )}
                {payload[2] && (
                    <p className="text-sm text-purple-600">
                        <span className="inline-block h-2 w-2 rounded-full bg-purple-500 mr-1"></span>
                        Общий вес: <span className="font-semibold">
                            {payload[2].value !== undefined ? `${payload[2].value.toFixed(1)} кг` : 'N/A'}
                        </span>
                    </p>
                )}
            </div>
        </div>
    );
};

CustomTooltip.propTypes = {
    active: PropTypes.bool,
    payload: PropTypes.array,
    label: PropTypes.string,
};

const DepartmentBarChart = ({ data }) => {
    // Format department names and ensure data integrity
    const chartData = useMemo(() => {
        if (!data || !Array.isArray(data) || data.length === 0) {
            return [];
        }

        return data.map(item => {
            if (!item) return null;

            return {
                department: item.department || 'Unknown',
                shortDepartment: shortenDepartmentName(item.department || 'Unknown'),
                // Provide defaults for potentially missing data
                binCount: item.binCount || 0,
                avgFullness: item.avgFullness || 0,
                totalWeight: item.totalWeight || 0
            };
        }).filter(Boolean); // Remove null items
    }, [data]);

    // Don't render chart if no data
    if (chartData.length === 0) {
        return (
            <div className="flex h-full w-full items-center justify-center text-slate-400">
                Нет данных для отображения
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                    dataKey="shortDepartment"
                    stroke="#64748b"
                    tick={{ fontSize: 12 }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                />
                <YAxis
                    yAxisId="left"
                    orientation="left"
                    stroke="#0d9488"
                    domain={[0, 100]}
                    tickCount={6}
                    tick={{ fontSize: 12 }}
                    label={{
                        value: 'Заполненность (%)',
                        angle: -90,
                        position: 'insideLeft',
                        style: { textAnchor: 'middle', fill: '#0d9488', fontSize: 12 }
                    }}
                />
                <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#3b82f6"
                    domain={[0, 'dataMax + 2']}
                    allowDecimals={false}
                    tick={{ fontSize: 12 }}
                    label={{
                        value: 'Количество',
                        angle: 90,
                        position: 'insideRight',
                        style: { textAnchor: 'middle', fill: '#3b82f6', fontSize: 12 }
                    }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                    verticalAlign="top"
                    height={40}
                    formatter={(value) => {
                        const colors = {
                            'avgFullness': '#0d9488',
                            'binCount': '#3b82f6',
                            'totalWeight': '#8b5cf6'
                        };
                        return <span style={{ color: colors[value] }}>{getLegendLabel(value)}</span>;
                    }}
                />

                {/* Bars */}
                <Bar
                    yAxisId="left"
                    dataKey="avgFullness"
                    name="avgFullness"
                    fill="#0d9488"
                    radius={[4, 4, 0, 0]}
                >
                    {chartData.map((entry, index) => (
                        <Cell
                            key={`cell-${index}`}
                            fill={getColorByFullness(entry.avgFullness || 0)}
                        />
                    ))}
                </Bar>
                <Bar
                    yAxisId="right"
                    dataKey="binCount"
                    name="binCount"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                />
                <Bar
                    yAxisId="right"
                    dataKey="totalWeight"
                    name="totalWeight"
                    fill="#8b5cf6"
                    radius={[4, 4, 0, 0]}
                    hide
                />
            </BarChart>
        </ResponsiveContainer>
    );
};

DepartmentBarChart.propTypes = {
    data: PropTypes.arrayOf(
        PropTypes.shape({
            department: PropTypes.string,
            binCount: PropTypes.number,
            avgFullness: PropTypes.number,
            totalWeight: PropTypes.number,
        })
    ),
};

// Helper functions
const shortenDepartmentName = (name) => {
    if (!name) return 'Unknown';

    const shortNames = {
        'Хирургическое Отделение': 'Хирургия',
        'Терапевтическое Отделение': 'Терапия',
        'Педиатрическое Отделение': 'Педиатрия',
        'Акушерское Отделение': 'Акушерство',
        'Инфекционное Отделение': 'Инфекция',
        'Реанимация': 'Реанимация',
        'Лаборатория': 'Лаборатория',
    };

    return shortNames[name] || name;
};

const getColorByFullness = (fullness) => {
    if (fullness > 80) return '#ef4444'; // Red
    if (fullness > 60) return '#f59e0b'; // Amber
    return '#0d9488'; // Teal
};

const getLegendLabel = (value) => {
    const labels = {
        'avgFullness': 'Средняя заполненность',
        'binCount': 'Количество контейнеров',
        'totalWeight': 'Общий вес'
    };

    return labels[value] || value;
};

export default DepartmentBarChart;