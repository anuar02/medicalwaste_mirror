// components/ui/Button.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { Loader2 } from 'lucide-react';

const Button = ({
                    children,
                    variant = 'default',
                    size = 'default',
                    color = 'teal',
                    disabled = false,
                    isLoading = false,
                    fullWidth = false,
                    className = '',
                    type = 'button',
                    onClick,
                    ...props
                }) => {
    // Base classes
    const baseClasses = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';

    // Size classes
    const sizeClasses = {
        sm: 'px-3 py-1.5 text-xs',
        default: 'px-4 py-2 text-sm',
        lg: 'px-5 py-2.5 text-base',
        xl: 'px-6 py-3 text-lg',
    };

    // Define color variants
    const variants = {
        default: {
            teal: 'bg-teal-600 text-white hover:bg-teal-700 focus:ring-teal-500',
            blue: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
            emerald: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500',
            amber: 'bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-500',
            red: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
            slate: 'bg-slate-700 text-white hover:bg-slate-800 focus:ring-slate-500',
        },
        outline: {
            teal: 'border border-slate-200 text-slate-700 hover:border-teal-500 hover:text-teal-700 focus:ring-teal-500',
            blue: 'border border-slate-200 text-slate-700 hover:border-blue-500 hover:text-blue-700 focus:ring-blue-500',
            emerald: 'border border-slate-200 text-slate-700 hover:border-emerald-500 hover:text-emerald-700 focus:ring-emerald-500',
            amber: 'border border-slate-200 text-slate-700 hover:border-amber-500 hover:text-amber-700 focus:ring-amber-500',
            red: 'border border-slate-200 text-slate-700 hover:border-red-500 hover:text-red-700 focus:ring-red-500',
            slate: 'border border-slate-200 text-slate-700 hover:border-slate-500 hover:text-slate-700 focus:ring-slate-500',
        },
        ghost: {
            teal: 'text-slate-700 hover:bg-teal-50 hover:text-teal-700 focus:ring-teal-500',
            blue: 'text-slate-700 hover:bg-blue-50 hover:text-blue-700 focus:ring-blue-500',
            emerald: 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 focus:ring-emerald-500',
            amber: 'text-slate-700 hover:bg-amber-50 hover:text-amber-700 focus:ring-amber-500',
            red: 'text-slate-700 hover:bg-red-50 hover:text-red-700 focus:ring-red-500',
            slate: 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-500',
        },
        link: {
            teal: 'text-teal-600 underline-offset-4 hover:underline focus:ring-teal-500',
            blue: 'text-blue-600 underline-offset-4 hover:underline focus:ring-blue-500',
            emerald: 'text-emerald-600 underline-offset-4 hover:underline focus:ring-emerald-500',
            amber: 'text-amber-600 underline-offset-4 hover:underline focus:ring-amber-500',
            red: 'text-red-600 underline-offset-4 hover:underline focus:ring-red-500',
            slate: 'text-slate-600 underline-offset-4 hover:underline focus:ring-slate-500',
        },
    };

    // Generate all classes
    const buttonClasses = [
        baseClasses,
        sizeClasses[size],
        variants[variant][color],
        fullWidth ? 'w-full' : '',
        className,
    ].join(' ');

    return (
        <button
            type={type}
            className={buttonClasses}
            disabled={disabled || isLoading}
            onClick={onClick}
            {...props}
        >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {children}
        </button>
    );
};

Button.propTypes = {
    children: PropTypes.node.isRequired,
    variant: PropTypes.oneOf(['default', 'outline', 'ghost', 'link']),
    size: PropTypes.oneOf(['sm', 'default', 'lg', 'xl']),
    color: PropTypes.oneOf(['teal', 'blue', 'emerald', 'amber', 'red', 'slate']),
    disabled: PropTypes.bool,
    isLoading: PropTypes.bool,
    fullWidth: PropTypes.bool,
    className: PropTypes.string,
    type: PropTypes.oneOf(['button', 'submit', 'reset']),
    onClick: PropTypes.func,
};

export default Button;