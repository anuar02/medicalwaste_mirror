import React, {useState, useMemo} from 'react';
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
    Area,
    ComposedChart,
    Brush,
    Legend,
} from 'recharts';
import {formatTime} from '../../utils/formatters';

// Enhanced custom tooltip with more information
const CustomTooltip = ({active, payload, label}) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const currentLevel = payload[0].value;
        const trend = data.trend || 0;
        const prediction = data.prediction;

        return (
            <div className="rounded-lg border border-slate-200 bg-white/95 backdrop-blur-sm p-4 shadow-lg">
                <div className="mb-2">
                    <p className="text-sm font-semibold text-slate-800">{label}</p>
                    <p className="text-xs text-slate-500">
                        {new Date(data.timestamp).toLocaleString('ru-RU')}
                    </p>
                </div>

                <div className="space-y-1">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Заполненность:</span>
                        <span className={`font-semibold text-sm ${
                            currentLevel >= 90 ? 'text-red-600' :
                                currentLevel >= 80 ? 'text-orange-600' :
                                    currentLevel >= 60 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                            {currentLevel.toFixed(1)}%
                        </span>
                    </div>

                    {trend !== 0 && (
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">Тенденция:</span>
                            <span className={`text-xs flex items-center ${
                                trend > 0 ? 'text-red-500' : 'text-green-500'
                            }`}>
                                {trend > 0 ? '↗' : '↘'} {Math.abs(trend).toFixed(1)}%/ч
                            </span>
                        </div>
                    )}

                    {prediction && (
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">Прогноз:</span>
                            <span className="text-xs text-blue-600">
                                {prediction.timeToFull ? `${prediction.timeToFull} до заполнения` : 'Стабильно'}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return null;
};

// Time period selector component
const TimePeriodSelector = ({selectedPeriod, onPeriodChange, className = ''}) => {
    const periods = [
        {key: '1h', label: '1ч', hours: 1},
        {key: '6h', label: '6ч', hours: 6},
        {key: '24h', label: '24ч', hours: 24},
        {key: '7d', label: '7д', hours: 168},
        {key: '30d', label: '30д', hours: 720},
    ];

    return (
        <div className={`flex bg-slate-100 rounded-lg p-1 ${className}`}>
            {periods.map(period => (
                <button
                    key={period.key}
                    onClick={() => onPeriodChange(period.key, period.hours)}
                    className={`px-3 py-1 text-sm rounded-md transition-all duration-200 ${
                        selectedPeriod === period.key
                            ? 'bg-white text-teal-700 shadow-sm font-medium'
                            : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                >
                    {period.label}
                </button>
            ))}
        </div>
    );
};

const WasteLevelHistoryChart = ({
                                    data,
                                    alertThreshold = 80,
                                    criticalThreshold = 95,
                                    showPrediction = true,
                                    showTrend = true,
                                    showBrush = true,
                                    height = 400,
                                    className = '',
                                    onPeriodChange // Make sure this is properly destructured from props
                                }) => {
    const [selectedPeriod, setSelectedPeriod] = useState('24h');
    const [hoveredPoint, setHoveredPoint] = useState(null);

    // Handler for period changes
    const handlePeriodChange = (period, hours) => {
        setSelectedPeriod(period);
        if (onPeriodChange) {
            onPeriodChange(period, hours);
        }
    };

    // Enhanced data processing with trend calculation and predictions
    const processedData = useMemo(() => {
        const chartData = data.map((item, index) => {
            const processed = {
                ...item,
                formattedTime: formatTime(item.timestamp),
                timestamp: new Date(item.timestamp),
            };

            // Calculate trend (rate of change)
            if (index > 0 && showTrend) {
                const prevItem = data[index - 1];
                const timeDiff = (new Date(item.timestamp) - new Date(prevItem.timestamp)) / (1000 * 60 * 60); // hours
                processed.trend = timeDiff > 0 ? (item.fullness - prevItem.fullness) / timeDiff : 0;
            }

            // Simple prediction based on trend
            if (showPrediction && processed.trend && processed.trend > 0) {
                const remainingCapacity = 100 - item.fullness;
                const hoursToFull = remainingCapacity / processed.trend;

                if (hoursToFull < 48) { // Only show if less than 48 hours
                    processed.prediction = {
                        timeToFull: hoursToFull < 1 ?
                            `${Math.round(hoursToFull * 60)}мин` :
                            `${Math.round(hoursToFull)}ч`
                    };
                }
            }

            return processed;
        });

        return chartData.sort((a, b) => a.timestamp - b.timestamp);
    }, [data, showTrend, showPrediction]);

    // Get status color based on fullness level
    const getStatusColor = (fullness) => {
        if (fullness >= criticalThreshold) return '#dc2626';
        if (fullness >= alertThreshold) return '#f59e0b';
        if (fullness >= 60) return '#eab308';
        return '#059669';
    };

    // Custom dot renderer for different status levels
    const CustomDot = (props) => {
        const {cx, cy, payload} = props;
        if (!payload) return null;

        const color = getStatusColor(payload.fullness);
        const isHovered = hoveredPoint === payload;

        return (
            <circle
                cx={cx}
                cy={cy}
                r={isHovered ? 6 : 4}
                fill={color}
                stroke="#fff"
                strokeWidth={2}
                className="transition-all duration-200"
                style={{
                    filter: isHovered ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' : 'none'
                }}
            />
        );
    };

    // Enhanced gradient definition
    const gradientId = `wasteLevelGradient-${Math.random().toString(36).substr(2, 9)}`;

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Header with controls */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <h3 className="text-lg font-semibold text-slate-800">
                        История уровня заполнения
                    </h3>
                    {processedData.length > 0 && (
                        <div className="flex items-center space-x-2 text-sm text-slate-600">
                            <div className="flex items-center space-x-1">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{backgroundColor: getStatusColor(processedData[processedData.length - 1]?.fullness || 0)}}
                                />
                                <span>Текущий: {processedData[processedData.length - 1]?.fullness.toFixed(1)}%</span>
                            </div>
                        </div>
                    )}
                </div>

                <TimePeriodSelector
                    selectedPeriod={selectedPeriod}
                    onPeriodChange={handlePeriodChange} // Use the local handler
                />
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                    <div className="w-3 h-0.5 bg-teal-600 rounded-full"/>
                    <span className="text-slate-600">Уровень заполнения</span>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="w-3 h-0.5 bg-amber-500 border-dashed border-t-2 border-amber-500"/>
                    <span className="text-slate-600">Порог предупреждения ({alertThreshold}%)</span>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="w-3 h-0.5 bg-red-500 border-dashed border-t-2 border-red-500"/>
                    <span className="text-slate-600">Критический порог ({criticalThreshold}%)</span>
                </div>
            </div>

            {/* Chart container */}
            <div className="relative bg-white rounded-lg border border-slate-200 p-4">
                <ResponsiveContainer width="100%" height={height}>
                    <ComposedChart
                        data={processedData}
                        margin={{top: 20, right: 30, left: 20, bottom: showBrush ? 80 : 20}}
                        onMouseMove={(state) => {
                            if (state?.activePayload?.[0]?.payload) {
                                setHoveredPoint(state.activePayload[0].payload);
                            }
                        }}
                        onMouseLeave={() => setHoveredPoint(null)}
                    >
                        <defs>
                            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#0d9488" stopOpacity={0.3}/>
                                <stop offset="100%" stopColor="#0d9488" stopOpacity={0.05}/>
                            </linearGradient>
                        </defs>

                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e2e8f0"
                            vertical={false}
                            horizontal={true}
                        />

                        <XAxis
                            dataKey="formattedTime"
                            stroke="#64748b"
                            tick={{fontSize: 12}}
                            tickMargin={10}
                            interval="preserveStartEnd"
                        />

                        <YAxis
                            domain={[0, 100]}
                            stroke="#64748b"
                            tick={{fontSize: 12}}
                            tickMargin={10}
                            tickCount={6}
                            label={{
                                value: 'Заполненность (%)',
                                angle: -90,
                                position: 'insideLeft',
                                style: {textAnchor: 'middle', fontSize: '12px', fill: '#64748b'}
                            }}
                        />

                        <Tooltip content={<CustomTooltip/>}/>

                        {/* Critical threshold reference line */}
                        <ReferenceLine
                            y={criticalThreshold}
                            stroke="#dc2626"
                            strokeDasharray="4 4"
                            strokeWidth={2}
                            label={{
                                value: `Критический (${criticalThreshold}%)`,
                                position: 'insideTopRight',
                                fill: '#dc2626',
                                fontSize: 11,
                                fontWeight: 600,
                            }}
                        />

                        {/* Alert threshold reference line */}
                        <ReferenceLine
                            y={alertThreshold}
                            stroke="#f59e0b"
                            strokeDasharray="3 3"
                            strokeWidth={2}
                            label={{
                                value: `Предупреждение (${alertThreshold}%)`,
                                position: 'insideTopRight',
                                fill: '#f59e0b',
                                fontSize: 11,
                                fontWeight: 600,
                            }}
                        />

                        {/* Area under the curve */}
                        <Area
                            type="monotone"
                            dataKey="fullness"
                            stroke="none"
                            fill={`url(#${gradientId})`}
                            animationDuration={1200}
                            animationBegin={0}
                        />

                        {/* Main line with custom dots */}
                        <Line
                            type="monotone"
                            dataKey="fullness"
                            stroke="#0d9488"
                            strokeWidth={3}
                            dot={<CustomDot/>}
                            activeDot={{
                                r: 7,
                                fill: '#0d9488',
                                stroke: '#fff',
                                strokeWidth: 3,
                                style: {filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'}
                            }}
                            animationDuration={1200}
                            animationBegin={200}
                        />

                        {/* Brush for zooming */}
                        {showBrush && processedData.length > 10 && (
                            <Brush
                                dataKey="formattedTime"
                                height={30}
                                stroke="#0d9488"
                                fill="#f0fdfa"
                                tickFormatter={(value) => value}
                            />
                        )}
                    </ComposedChart>
                </ResponsiveContainer>

                {/* Status indicators */}
                <div className="absolute top-6 right-6 flex space-x-2">
                    {processedData.length > 0 && (
                        <>
                            {processedData[processedData.length - 1]?.fullness >= criticalThreshold && (
                                <div
                                    className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full font-medium animate-pulse">
                                    Критический уровень
                                </div>
                            )}
                            {processedData[processedData.length - 1]?.fullness >= alertThreshold &&
                                processedData[processedData.length - 1]?.fullness < criticalThreshold && (
                                    <div
                                        className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full font-medium">
                                        Требует внимания
                                    </div>
                                )}
                        </>
                    )}
                </div>
            </div>

            {/* Statistics summary */}
            {processedData.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="bg-slate-50 rounded-lg p-3">
                        <div className="text-slate-600 text-xs uppercase tracking-wide">Максимум</div>
                        <div className="text-lg font-semibold text-slate-800">
                            {Math.max(...processedData.map(d => d.fullness)).toFixed(1)}%
                        </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                        <div className="text-slate-600 text-xs uppercase tracking-wide">Среднее</div>
                        <div className="text-lg font-semibold text-slate-800">
                            {(processedData.reduce((sum, d) => sum + d.fullness, 0) / processedData.length).toFixed(1)}%
                        </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                        <div className="text-slate-600 text-xs uppercase tracking-wide">Последние 24ч</div>
                        <div className="text-lg font-semibold text-slate-800">
                            {processedData.length > 24 ?
                                (processedData.slice(-24).reduce((sum, d) => sum + d.fullness, 0) / 24).toFixed(1) :
                                'Н/Д'
                            }%
                        </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                        <div className="text-slate-600 text-xs uppercase tracking-wide">Тенденция</div>
                        <div className={`text-lg font-semibold ${
                            processedData[processedData.length - 1]?.trend > 0 ? 'text-red-600' :
                                processedData[processedData.length - 1]?.trend < 0 ? 'text-green-600' : 'text-slate-600'
                        }`}>
                            {processedData[processedData.length - 1]?.trend ?
                                `${processedData[processedData.length - 1].trend > 0 ? '+' : ''}${processedData[processedData.length - 1].trend.toFixed(1)}%/ч` :
                                'Стабильно'
                            }
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

WasteLevelHistoryChart.propTypes = {
    data: PropTypes.arrayOf(
        PropTypes.shape({
            time: PropTypes.string,
            fullness: PropTypes.number.isRequired,
            timestamp: PropTypes.oneOfType([
                PropTypes.string,
                PropTypes.instanceOf(Date)
            ]).isRequired,
        })
    ).isRequired,
    alertThreshold: PropTypes.number,
    criticalThreshold: PropTypes.number,
    showPrediction: PropTypes.bool,
    showTrend: PropTypes.bool,
    showBrush: PropTypes.bool,
    height: PropTypes.number,
    className: PropTypes.string,
    onPeriodChange: PropTypes.func,
    selectedPeriod: PropTypes.string,
};

CustomTooltip.propTypes = {
    active: PropTypes.bool,
    payload: PropTypes.array,
    label: PropTypes.string,
};

TimePeriodSelector.propTypes = {
    selectedPeriod: PropTypes.string.isRequired,
    onPeriodChange: PropTypes.func.isRequired,
    className: PropTypes.string,
};

export default WasteLevelHistoryChart;