// components/charts/WasteTypePieChart.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

// Custom tooltip component
const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        return (
            <div className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
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

// Custom legend
const CustomLegend = ({ payload }) => {
    return (
        <ul className="flex flex-col space-y-1 text-xs">
            {payload.map((entry, index) => (
                <li key={`legend-${index}`} className="flex items-center">
          <span
              className="mr-2 inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: entry.color }}
          />
                    <span className="text-slate-800">
            {entry.value} ({entry.payload.percentage}%)
          </span>
                </li>
            ))}
        </ul>
    );
};

CustomLegend.propTypes = {
    payload: PropTypes.array,
};

const WasteTypePieChart = ({ data }) => {
    // Calculate percentages
    const totalValue = data.reduce((sum, item) => sum + item.value, 0);
    const chartData = data.map(item => ({
        ...item,
        percentage: Math.round((item.value / totalValue) * 100),
    }));

    return (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius="70%"
                    innerRadius="40%"
                    dataKey="value"
                    nameKey="name"
                    stroke="#ffffff"
                    strokeWidth={2}
                >
                    {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fillColor} />
                    ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend content={<CustomLegend />} verticalAlign="middle" align="right" />
            </PieChart>
        </ResponsiveContainer>
    );
};

WasteTypePieChart.propTypes = {
    data: PropTypes.arrayOf(
        PropTypes.shape({
            name: PropTypes.string.isRequired,
            value: PropTypes.number.isRequired,
            fillColor: PropTypes.string.isRequired,
        })
    ).isRequired,
};

export default WasteTypePieChart;