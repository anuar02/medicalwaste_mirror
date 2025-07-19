import { useState, useEffect, useRef } from 'react';

export const useAutoRefresh = ({ enabled, interval, onRefresh }) => {
    const [isAutoRefreshing, setIsAutoRefreshing] = useState(enabled);
    const intervalRef = useRef(null);
    const onRefreshRef = useRef(onRefresh);

    // Update ref when onRefresh changes
    useEffect(() => {
        onRefreshRef.current = onRefresh;
    }, [onRefresh]);

    useEffect(() => {
        setIsAutoRefreshing(enabled);

        if (enabled && interval) {
            intervalRef.current = setInterval(() => {
                onRefreshRef.current?.();
            }, interval);

            return () => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
            };
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        }
    }, [enabled, interval]);

    const toggleAutoRefresh = () => {
        setIsAutoRefreshing(prev => !prev);
    };

    return { isAutoRefreshing, toggleAutoRefresh };
};
