// components/ui/Loader.jsx
import React from 'react';
import PropTypes from 'prop-types';

const Loader = ({ size = 'default', text = 'Загрузка...' }) => {
    const sizeClasses = {
        small:   'h-4 w-4 border-2',
        default: 'h-8 w-8 border-2',
        large:   'h-12 w-12 border-2',
        xl:      'h-16 w-16 border-4',
    };

    return (
        <div className="flex h-full w-full flex-col items-center justify-center p-8">
            <div className="relative">
                <div
                    className={`animate-spin rounded-full border-transparent border-t-teal-500 ${sizeClasses[size]}`}
                    style={{ borderStyle: 'solid', boxShadow: '0 0 12px rgba(20,184,166,0.35)' }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-pulse" />
                </div>
            </div>
            {text && (
                <p className="mt-4 font-chakra text-[11px] tracking-widest uppercase text-slate-600">
                    {text}
                </p>
            )}
        </div>
    );
};

Loader.propTypes = {
    size: PropTypes.oneOf(['small', 'default', 'large', 'xl']),
    text: PropTypes.string,
};

export default Loader;
