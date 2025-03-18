// components/charts/WasteLevelHistoryChart.jsx
import React from 'react';
import PropTypes from 'prop-types';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
} from 'recharts';
import { formatTime } from '../../utils/formatters';

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
                <p className="mb-1 text-sm font-semibold text-slate-700">{label}</p>
                <p className="text-sm text-teal-600">
                    Заполненность: <span className="font-semibold">{payload[0].value.toFixed(1)}%</span>
                </p>
                <p className="text-xs text-slate-500">
                    {new Date(payload[0].payload.timestamp).toLocaleString()}
                </p>
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

const WasteLevelHistoryChart = ({ data, alertThreshold = 80 }) => {
    // Format data for chart if needed
    const chartData = data.map(item => ({
        ...item,
        formattedTime: formatTime(item.timestamp),
    }));

    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                    dataKey="formattedTime"
                    stroke="#64748b"
                    tick={{ fontSize: 12 }}
                    tickMargin={10}
                />
                <YAxis
                    domain={[0, 100]}
                    stroke="#64748b"
                    tick={{ fontSize: 12 }}
                    tickMargin={10}
                    tickCount={6}
                />
                <Tooltip content={<CustomTooltip />} />

                {/* Alert threshold reference line */}
                <ReferenceLine
                    y={alertThreshold}
                    stroke="#f59e0b"
                    strokeDasharray="3 3"
                    label={{
                        value: `Порог (${alertThreshold}%)`,
                        position: 'insideTopRight',
                        fill: '#f59e0b',
                        fontSize: 12,
                    }}
                />

                {/* Main line */}
                <Line
                    type="monotone"
                    dataKey="fullness"
                    stroke="#0d9488"
                    strokeWidth={3}
                    dot={{ fill: '#0d9488', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: '#0d9488', stroke: '#fff', strokeWidth: 2 }}
                    animationDuration={1000}
                />
            </LineChart>
        </ResponsiveContainer>
    );
};

WasteLevelHistoryChart.propTypes = {
    data: PropTypes.arrayOf(
        PropTypes.shape({
            time: PropTypes.string,
            fullness: PropTypes.number,
            timestamp: PropTypes.instanceOf(Date),
        })
    ).isRequired,
    alertThreshold: PropTypes.number,
};

export default WasteLevelHistoryChart;