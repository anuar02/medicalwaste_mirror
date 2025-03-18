// components/ui/Loader.jsx
import React from 'react';
import PropTypes from 'prop-types';

const Loader = ({ size = 'default', text = 'Загрузка...' }) => {
    // Size classes
    const sizeClasses = {
        small: 'h-4 w-4 border-2',
        default: 'h-8 w-8 border-2',
        large: 'h-12 w-12 border-3',
        xl: 'h-16 w-16 border-4',
    };

    return (
        <div className="flex h-full w-full flex-col items-center justify-center p-8">
            <div
                className={`animate-spin rounded-full border-b-transparent border-l-transparent border-teal-500 ${sizeClasses[size]}`}
            ></div>
            {text && <p className="mt-4 text-sm text-slate-500">{text}</p>}
        </div>
    );
};

Loader.propTypes = {
    size: PropTypes.oneOf(['small', 'default', 'large', 'xl']),
    text: PropTypes.string,
};

export default Loader;