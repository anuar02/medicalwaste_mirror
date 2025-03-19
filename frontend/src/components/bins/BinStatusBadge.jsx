// components/bins/BinStatusBadge.jsx
import React from 'react';
import PropTypes from 'prop-types';

const BinStatusBadge = ({ status, size = 'small' }) => {
    // Status configuration for different states
    const statusConfig = {
        active: {
            label: 'Активен',
            bg: 'bg-emerald-100',
            text: 'text-emerald-800',
            dot: 'bg-emerald-500',
        },
        maintenance: {
            label: 'Обслуживание',
            bg: 'bg-amber-100',
            text: 'text-amber-800',
            dot: 'bg-amber-500',
        },
        offline: {
            label: 'Офлайн',
            bg: 'bg-slate-100',
            text: 'text-slate-800',
            dot: 'bg-slate-500',
        },
        decommissioned: {
            label: 'Выведен',
            bg: 'bg-red-100',
            text: 'text-red-800',
            dot: 'bg-red-500',
        },
    };

    // Default to offline if status not found
    const config = statusConfig[status] || statusConfig.offline;

    // Size configurations
    const sizeConfig = {
        small: {
            padding: 'px-2 py-0.5',
            text: 'text-xs',
            dot: 'w-1.5 h-1.5 mr-1',
        },
        medium: {
            padding: 'px-2.5 py-1',
            text: 'text-sm',
            dot: 'w-2 h-2 mr-1.5',
        },
        large: {
            padding: 'px-3 py-1.5',
            text: 'text-base',
            dot: 'w-2.5 h-2.5 mr-2',
        },
    };

    const sizeClasses = sizeConfig[size];

    return (
        <span
            className={`
        inline-flex items-center rounded-full 
        ${config.bg} ${config.text} 
        ${sizeClasses.padding} ${sizeClasses.text}
        font-medium
      `}
        >
      <span className={`${sizeClasses.dot} inline-block rounded-full ${config.dot}`}></span>
            {config.label}
    </span>
    );
};

BinStatusBadge.propTypes = {
    status: PropTypes.oneOf(['active', 'maintenance', 'offline', 'decommissioned']).isRequired,
    size: PropTypes.oneOf(['small', 'medium', 'large']),
};

export default BinStatusBadge;