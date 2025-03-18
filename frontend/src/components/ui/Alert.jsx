// components/ui/Alert.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { X, AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';

const Alert = ({
                   children,
                   variant = 'default',
                   title,
                   icon,
                   dismissible = false,
                   onDismiss
               }) => {
    // Define styles based on variant
    const variantStyles = {
        default: {
            wrapper: 'bg-slate-50 text-slate-800 border-slate-200',
            icon: <Info className="h-5 w-5 text-slate-500" />,
            title: 'text-slate-800'
        },
        info: {
            wrapper: 'bg-blue-50 text-blue-800 border-blue-200',
            icon: <Info className="h-5 w-5 text-blue-500" />,
            title: 'text-blue-800'
        },
        success: {
            wrapper: 'bg-emerald-50 text-emerald-800 border-emerald-200',
            icon: <CheckCircle className="h-5 w-5 text-emerald-500" />,
            title: 'text-emerald-800'
        },
        warning: {
            wrapper: 'bg-amber-50 text-amber-800 border-amber-200',
            icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
            title: 'text-amber-800'
        },
        error: {
            wrapper: 'bg-red-50 text-red-800 border-red-200',
            icon: <AlertCircle className="h-5 w-5 text-red-500" />,
            title: 'text-red-800'
        },
    };

    // Get current variant styles
    const currentVariant = variantStyles[variant] || variantStyles.default;

    return (
        <div className={`flex rounded-lg border p-4 ${currentVariant.wrapper}`}>
            <div className="mr-3 flex-shrink-0 pt-0.5">
                {icon || currentVariant.icon}
            </div>
            <div className="flex-grow">
                {title && <h3 className={`mb-1 font-medium ${currentVariant.title}`}>{title}</h3>}
                <div className="text-sm">{children}</div>
            </div>
            {dismissible && (
                <button
                    onClick={onDismiss}
                    className="ml-3 flex-shrink-0 self-start rounded hover:bg-black/5"
                >
                    <X className="h-5 w-5" />
                </button>
            )}
        </div>
    );
};

Alert.propTypes = {
    children: PropTypes.node.isRequired,
    variant: PropTypes.oneOf(['default', 'info', 'success', 'warning', 'error']),
    title: PropTypes.string,
    icon: PropTypes.node,
    dismissible: PropTypes.bool,
    onDismiss: PropTypes.func
};

export default Alert;