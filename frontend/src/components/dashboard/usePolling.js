export const usePolling = (queryKey, queryFn, options = {}) => {
    const {
        interval = 30000,
        enabled = true,
        onSuccess,
        onError,
        aggressive = false // For critical data that needs frequent updates
    } = options;

    const [isPolling, setIsPolling] = useState(enabled);

    // Adaptive interval based on page visibility and connection
    const getAdaptiveInterval = () => {
        if (!navigator.onLine) return false;
        if (document.hidden) return interval * 3; // Slower when tab is hidden
        if (aggressive) return interval / 2; // Faster for critical data
        return interval;
    };

    return useQuery(queryKey, queryFn, {
        refetchInterval: isPolling ? getAdaptiveInterval() : false,
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        staleTime: interval / 2,
        onSuccess,
        onError
    });
};