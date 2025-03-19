// components/dashboard/DashboardCard.jsx
import React from 'react';
import PropTypes from 'prop-types';

const DashboardCard = ({
                           title,
                           children,
                           icon,
                           action,
                           footer,
                           className = '',
                           padding = true
                       }) => {
    return (
        <div className={`overflow-hidden rounded-xl bg-white shadow-sm ${className}`}>
            {/* Card Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div className="flex items-center space-x-2">
                    {icon && <div className="text-slate-400">{icon}</div>}
                    <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
                </div>
                {action && <div>{action}</div>}
            </div>

            {/* Card Content */}
            <div className={padding ? 'p-6' : ''}>
                {children}
            </div>

            {/* Card Footer (optional) */}
            {footer && (
                <div className="border-t border-slate-100 bg-slate-50 px-6 py-3">
                    {footer}
                </div>
            )}
        </div>
    );
};

DashboardCard.propTypes = {
    title: PropTypes.string.isRequired,
    children: PropTypes.node.isRequired,
    icon: PropTypes.node,
    action: PropTypes.node,
    footer: PropTypes.node,
    className: PropTypes.string,
    padding: PropTypes.bool,
};

export default DashboardCard;