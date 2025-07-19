import { toast } from 'react-hot-toast';

export const notify = {
    success: (message, options = {}) => toast.success(message, {
        duration: 4000,
        position: 'top-right',
        style: {
            background: '#10b981',
            color: 'white',
        },
        ...options
    }),

    error: (message, options = {}) => toast.error(message, {
        duration: 5000,
        position: 'top-right',
        style: {
            background: '#ef4444',
            color: 'white',
        },
        ...options
    }),

    warning: (message, options = {}) => toast(message, {
        duration: 4000,
        position: 'top-right',
        icon: '⚠️',
        style: {
            background: '#f59e0b',
            color: 'white',
        },
        ...options
    }),

    info: (message, options = {}) => toast(message, {
        duration: 4000,
        position: 'top-right',
        icon: 'ℹ️',
        style: {
            background: '#3b82f6',
            color: 'white',
        },
        ...options
    })
};