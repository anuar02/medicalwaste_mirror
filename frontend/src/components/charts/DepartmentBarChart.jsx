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

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
                <p className="mb-1 text-sm font-semibold text-slate-700">{label}</p>
                <div className="space-y-1">
                    <p className="text-sm text-teal-600">
                        <span className="inline-block h-2 w-2 rounded-full bg-teal-500 mr-1"></span>
                        Заполненность: <span className="font-semibold">{payload[0].value.toFixed(1)}%</span>
                    </p>
                    <p className="text-sm text-blue-600">
                        <span className="inline-block h-2 w-2 rounded-full bg-blue-500 mr-1"></span>
                        Контейнеров: <span className="font-semibold">{payload[1].value}</span>
                    </p>
                    <p className="text-sm text-purple-600">
                        <span className="inline-block h-2 w-2 rounded-full bg-purple-500 mr-1"></span>
                        Общий вес: <span className="font-semibold">{payload[2].value.toFixed(1)} кг</span>
                    </p>
                </div>
            </div>
        );
    }

    return null;
};

CustomTooltip.propTypes = {
    active: PropTypes.bool,
    payload: PropTypes.array,
    label: PropTypes.string,
};

const DepartmentBarChart = ({ data }) => {
    // Format department names (shorten if needed)
    const chartData = useMemo(() => {
        return data.map(item => ({
            ...item,
            shortDepartment: shortenDepartmentName(item.department),
        }));
    }, [data]);

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
                            fill={getColorByFullness(entry.avgFullness)}
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
            department: PropTypes.string.isRequired,
            binCount: PropTypes.number.isRequired,
            avgFullness: PropTypes.number.isRequired,
            totalWeight: PropTypes.number.isRequired,
        })
    ).isRequired,
};

// Helper functions
const shortenDepartmentName = (name) => {
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