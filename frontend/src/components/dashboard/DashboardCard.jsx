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
    padding = true,
    clipped = false,
}) => {
    return (
        <section className={`${clipped ? 'overflow-hidden' : 'overflow-visible'} rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/60 transition-shadow duration-200 hover:shadow-md hover:shadow-slate-200/80 ${className}`}>
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                    {icon && (
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                            {icon}
                        </div>
                    )}
                    <h3 className="truncate font-chakra text-sm font-semibold text-slate-800">{title}</h3>
                </div>
                {action && (
                    <div className="flex flex-shrink-0 items-center justify-start sm:justify-end">
                        {action}
                    </div>
                )}
            </div>

            <div className={padding ? 'p-5' : ''}>
                {children}
            </div>

            {footer && (
                <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-3">
                    {footer}
                </div>
            )}
        </section>
    );
};

DashboardCard.propTypes = {
    title:     PropTypes.string.isRequired,
    children:  PropTypes.node.isRequired,
    icon:      PropTypes.node,
    action:    PropTypes.node,
    footer:    PropTypes.node,
    className: PropTypes.string,
    padding:   PropTypes.bool,
    clipped:   PropTypes.bool,
};

export default DashboardCard;
