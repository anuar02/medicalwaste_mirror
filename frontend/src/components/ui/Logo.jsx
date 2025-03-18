// components/ui/Logo.jsx
import React from 'react';
import PropTypes from 'prop-types';

const Logo = ({ size = 24, className = '' }) => {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <path
                d="M3 6h18v2H3V6m2.5 0a.5.5 0 01-.5-.5v-1a.5.5 0 01.5-.5h13a.5.5 0 01.5.5v1a.5.5 0 01-.5.5h-13zM5 10h14l-1 14H6l-1-14zm7 11c.8 0 1.5-.7 1.5-1.5v-9c0-.8-.7-1.5-1.5-1.5s-1.5.7-1.5 1.5v9c0 .8.7 1.5 1.5 1.5zm3.5-1.5c0 .8.7 1.5 1.5 1.5s1.5-.7 1.5-1.5v-9c0-.8-.7-1.5-1.5-1.5s-1.5.7-1.5 1.5v9zM5.5 8.5c0 .8.7 1.5 1.5 1.5s1.5-.7 1.5-1.5v-9c0-.8-.7-1.5-1.5-1.5s-1.5.7-1.5 1.5v9z"
                fill="#0D9488"
            />
            <circle cx="14" cy="8" r="6" fill="#EF4444" fillOpacity="0.7" />
            <path
                d="M13.5 11h1v-6h-1v6zm0 2h1v-1h-1v1z"
                fill="white"
            />
        </svg>
    );
};

Logo.propTypes = {
    size: PropTypes.number,
    className: PropTypes.string,
};

export default Logo;