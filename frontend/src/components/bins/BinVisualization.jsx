// components/bins/BinVisualization.jsx
import React from 'react';
import PropTypes from 'prop-types';

const BinVisualization = ({ fullness, size = 'medium', showLabels = false }) => {
    // Define size classes
    const sizeClasses = {
        small: {
            container: 'w-24 h-32',
            lid: 'h-4',
            lines: 'text-xs',
        },
        medium: {
            container: 'w-36 h-48',
            lid: 'h-6',
            lines: 'text-sm',
        },
        large: {
            container: 'w-48 h-64',
            lid: 'h-8',
            lines: 'text-base',
        },
    };

    // Get color based on fullness level
    const getColor = () => {
        if (fullness > 80) return 'from-red-600 to-red-500';
        if (fullness > 60) return 'from-amber-600 to-amber-500';
        return 'from-teal-700 to-teal-500';
    };

    // Fill levels for marker lines
    const fillLevels = [0, 25, 50, 75, 100];

    return (
        <div className={`relative ${sizeClasses[size].container}`}>
            {/* Improved shadow effects */}
            <div className="absolute inset-0 -rotate-3 rounded-lg bg-slate-50 shadow-xl"></div>

            <div className="relative flex h-full flex-col overflow-hidden rounded-lg border-2 border-slate-200 bg-white shadow-lg">
                {/* Medical symbol */}
                <div className="absolute left-1/2 top-8 -translate-x-1/2 text-2xl text-slate-400">
                    ☤
                </div>

                {/* Enhanced lid design */}
                <div className={`bg-gradient-to-r from-slate-700 to-slate-800 ${sizeClasses[size].lid}`}>
                    <div className="h-1 bg-slate-900 opacity-50"></div>
                </div>

                <div className="relative flex-1 p-8">
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

                    {/* Waste fill visualization */}
                    <div
                        className={`absolute bottom-0 w-full transition-all duration-1000 bg-gradient-to-t ${getColor()}`}
                        style={{ height: `${Math.min(100, Math.max(0, fullness))}%` }}
                    >
                        {/* Highlight effect on top of liquid */}
                        <div className="absolute top-0 h-2 w-full bg-white opacity-20"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

BinVisualization.propTypes = {
    fullness: PropTypes.number.isRequired,
    size: PropTypes.oneOf(['small', 'medium', 'large']),
    showLabels: PropTypes.bool,
};

export default BinVisualization;