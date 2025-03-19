// components/bins/BinVisualization.jsx
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const BinVisualization = ({
                              fullness,
                              temperature,
                              batteryLevel,
                              lastUpdated,
                              size = 'medium',
                              showLabels = false,
                              alertThreshold = 80
                          }) => {
    // Add ripple animation state
    const [ripple, setRipple] = useState(0);

    // Ripple animation effect
    useEffect(() => {
        const interval = setInterval(() => {
            setRipple(prev => (prev + 1) % 3);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    // Define size classes
    const sizeClasses = {
        small: {
            container: 'w-24 h-32',
            lid: 'h-4',
            lines: 'text-xs',
            info: 'text-xs',
        },
        medium: {
            container: 'w-36 h-48',
            lid: 'h-6',
            lines: 'text-sm',
            info: 'text-sm',
        },
        large: {
            container: 'w-48 h-64',
            lid: 'h-8',
            lines: 'text-base',
            info: 'text-base',
        },
    };

    // Get color based on fullness level
    const getColor = () => {
        if (fullness > alertThreshold) return 'from-red-600 to-red-500';
        if (fullness > alertThreshold * 0.75) return 'from-amber-600 to-amber-500';
        return 'from-teal-700 to-teal-500';
    };

    // Get status text
    const getStatusText = () => {
        if (fullness > alertThreshold) return 'Требуется очистка';
        if (fullness > alertThreshold * 0.75) return 'Заполняется';
        return 'Нормальный';
    };

    // Get status color
    const getStatusColor = () => {
        if (fullness > alertThreshold) return 'text-red-600';
        if (fullness > alertThreshold * 0.75) return 'text-amber-600';
        return 'text-teal-600';
    };

    // Fill levels for marker lines
    const fillLevels = [0, 25, 50, 75, 100];

    // Format the last updated date
    const formatDate = (dateString) => {
        if (!dateString) return 'Не доступно';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    // Get battery icon based on level
    const getBatteryIcon = () => {
        if (!batteryLevel) return '⚡'; // Unknown
        if (batteryLevel < 20) return '🪫'; // Empty
        if (batteryLevel < 60) return '🔋'; // Medium
        return '🔋'; // Full
    };

    return (
        <div className="flex flex-col items-center">
            <div className={`relative ${sizeClasses[size].container}`}
                 aria-label={`Контейнер заполнен на ${fullness}%`}>
                {/* Improved shadow effects */}
                <div className="absolute inset-0 -rotate-3 rounded-lg bg-slate-50 shadow-xl"></div>

                <div className="relative flex h-full flex-col overflow-hidden rounded-lg border-2 border-slate-200 bg-white shadow-lg">
                    {/* Medical symbol */}
                    <div className="absolute left-1/2 top-8 -translate-x-1/2 text-2xl text-slate-400 z-10">
                        ☤
                    </div>

                    {/* Alert indicator for high fullness */}
                    {fullness > alertThreshold && (
                        <div className="absolute top-2 right-2 z-10 animate-pulse">
                            <span className="flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                        </div>
                    )}

                    {/* Enhanced lid design with shadow */}
                    <div className={`bg-gradient-to-r from-slate-700 to-slate-800 ${sizeClasses[size].lid} shadow-inner`}>
                        <div className="h-1 bg-slate-900 opacity-50"></div>
                    </div>

                    {/* IMPORTANT: Changed this from p-8 to px-0 to fix the alignment issue */}
                    <div className="relative flex-1 px-0">
                        {/* Fill level lines */}
                        {fillLevels.map((level) => (
                            <div
                                key={level}
                                className="absolute w-full border-b border-dashed border-slate-200"
                                style={{ bottom: `${level}%` }}
                            >
                                {showLabels && (
                                    <span className={`absolute -right-6 text-slate-500 ${sizeClasses[size].lines}`}>
                                        {level}%
                                    </span>
                                )}
                            </div>
                        ))}

                        {/* Waste fill visualization with ripple effect - FIXED the width to be 100% of container */}
                        <div
                            className="absolute bottom-0 left-0 right-0 w-full transition-all duration-1000 bg-gradient-to-t"
                            style={{
                                height: `${Math.min(100, Math.max(0, fullness))}%`,
                                backgroundImage: `linear-gradient(to top, #ef4444, #f87171)`
                            }}
                        >
                            {/* Highlight effect on top of liquid */}
                            <div className="absolute top-0 h-2 w-full bg-white opacity-20"></div>

                            {/* Ripple animations */}
                            {[0, 1, 2].map(i => (
                                <div
                                    key={i}
                                    className={`absolute w-full h-1 bg-white opacity-10 transition-all duration-1000 ease-in-out`}
                                    style={{
                                        bottom: `${20 + i * 30}%`,
                                        transform: `scaleX(${ripple === i ? 1.05 : 0.95})`,
                                        opacity: ripple === i ? 0.2 : 0.1
                                    }}
                                ></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Fullness percentage and status */}
            <div className="mt-2 text-center">
                <div className="text-2xl font-bold">{fullness}%</div>
                <div className="text-sm text-slate-500">Текущая заполненность</div>

                <div className={`mt-1 font-medium ${getStatusColor()}`}>
                    {getStatusText()}
                </div>

                {/* Additional sensor info */}
                <div className="mt-2 flex justify-center space-x-4 text-xs text-slate-500">
                    {temperature && (
                        <div title="Температура">
                            🌡️ {temperature}°C
                        </div>
                    )}
                    {batteryLevel && (
                        <div title="Заряд батареи">
                            {getBatteryIcon()} {batteryLevel}%
                        </div>
                    )}
                </div>

                {/* Last updated timestamp */}
                <div className={`mt-1 text-slate-400 ${sizeClasses[size].info}`}>
                    Обновлено: {formatDate(lastUpdated)}
                </div>
            </div>

            {/* Alert threshold indicator */}
            <div className="mt-3 w-full max-w-xs">
                <div className="flex justify-between text-xs text-slate-500">
                    <span>0%</span>
                    <span>Порог оповещения</span>
                    <span>100%</span>
                </div>
                <div className="relative h-2 w-full rounded-full bg-slate-200 mt-1">
                    <div className="absolute h-full rounded-full bg-slate-400"
                         style={{ width: `${fullness}%` }}>
                    </div>
                    <div className="absolute h-4 w-0.5 bg-red-500 -top-1"
                         style={{ left: `${alertThreshold}%` }}>
                    </div>
                </div>
            </div>
        </div>
    );
};

BinVisualization.propTypes = {
    fullness: PropTypes.number.isRequired,
    temperature: PropTypes.number,
    batteryLevel: PropTypes.number,
    lastUpdated: PropTypes.string,
    size: PropTypes.oneOf(['small', 'medium', 'large']),
    showLabels: PropTypes.bool,
    alertThreshold: PropTypes.number
};

export default BinVisualization;