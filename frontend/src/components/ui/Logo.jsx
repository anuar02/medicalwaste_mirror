// components/ui/Logo.jsx
import React from 'react';
import PropTypes from 'prop-types';
import logoPng from '../../assets/logo2.png';

const Logo = ({ size = 24, className = '' }) => {
    return (
        <img
            src={logoPng}
            alt="MedWaste Logo"
            width={size}
            height={size}
            className={className}
        />
    );
};

Logo.propTypes = {
    size: PropTypes.number,
    className: PropTypes.string,
};

export default Logo;