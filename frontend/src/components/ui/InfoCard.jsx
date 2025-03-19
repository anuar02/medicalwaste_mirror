// components/ui/InfoCard.jsx
import React from 'react';
import PropTypes from 'prop-types';

const InfoCard = ({ title, items = [] }) => {
    return (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-4">
                <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
            </div>
            <div className="divide-y divide-slate-100">
                {items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between px-6 py-3">
                        <span className="text-sm font-medium text-slate-600">{item.label}</span>
                        <div className="flex items-center space-x-2">
                            {item.icon && <div className="text-slate-400">{item.icon}</div>}
                            <span className="text-sm font-semibold text-slate-800">{item.value}</span>
                        </div>
                    </div>
                ))}
                {items.length === 0 && (
                    <div className="px-6 py-4 text-center text-sm text-slate-500">
                        Нет данных для отображения
                    </div>
                )}
            </div>
        </div>
    );
};

InfoCard.propTypes = {
    title: PropTypes.string.isRequired,
    items: PropTypes.arrayOf(
        PropTypes.shape({
            label: PropTypes.string.isRequired,
            value: PropTypes.node.isRequired,
            icon: PropTypes.node,
        })
    ),
};

export default InfoCard;