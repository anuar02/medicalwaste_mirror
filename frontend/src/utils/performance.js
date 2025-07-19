export const createSmartInvalidation = (queryClient) => {
    let pendingInvalidations = new Set();
    let timeout = null;

    const batchInvalidate = (queryKeys) => {
        queryKeys.forEach(key => pendingInvalidations.add(key));

        if (timeout) clearTimeout(timeout);

        timeout = setTimeout(() => {
            const keys = Array.from(pendingInvalidations);
            keys.forEach(key => queryClient.invalidateQueries(key));
            pendingInvalidations.clear();
        }, 100); // Batch invalidations within 100ms
    };

    return { batchInvalidate };
};

export const useBackgroundSync = (queryClient) => {
    const [syncQueue, setSyncQueue] = useLocalStorage('sync-queue', []);
    const [isSyncing, setIsSyncing] = useState(false);

    const addToSyncQueue = (operation) => {
        setSyncQueue(prev => [...prev, {
            ...operation,
            timestamp: Date.now(),
            id: Math.random().toString(36).substr(2, 9)
        }]);
    };

    const processSyncQueue = async () => {
        if (syncQueue.length === 0 || !navigator.onLine) return;

        setIsSyncing(true);
        const processed = [];

        for (const operation of syncQueue) {
            try {
                // Process the operation based on type
                switch (operation.type) {
                    case 'UPDATE_BIN_STATUS':
                        await apiService.wasteBins.updateStatus(operation.binId, operation.data);
                        break;
                    case 'ADD_COLLECTION_RECORD':
                        await apiService.collections.create(operation.data);
                        break;
                    // Add more operation types as needed
                }
                processed.push(operation.id);
            } catch (error) {
                console.error('Failed to sync operation:', operation, error);
                // Keep failed operations in queue for retry
            }
        }

        // Remove successfully processed operations
        setSyncQueue(prev => prev.filter(op => !processed.includes(op.id)));
        setIsSyncing(false);

        if (processed.length > 0) {
            queryClient.invalidateQueries();
            toast.success(`Синхронизировано ${processed.length} операций`);
        }
    };

    // Auto-sync when coming online
    useEffect(() => {
        const handleOnline = () => {
            if (syncQueue.length > 0) {
                setTimeout(processSyncQueue, 1000);
            }
        };

        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [syncQueue.length]);

    return {
        syncQueue,
        isSyncing,
        addToSyncQueue,
        processSyncQueue,
        hasPendingSync: syncQueue.length > 0
    };
};

// Performance monitoring hook
export const usePerformanceMonitor = () => {
    const [metrics, setMetrics] = useState({
        renderTime: 0,
        apiLatency: {},
        errorCount: 0
    });

    const measureRender = (componentName, renderFn) => {
        const start = performance.now();
        const result = renderFn();
        const end = performance.now();

        setMetrics(prev => ({
            ...prev,
            renderTime: end - start
        }));

        return result;
    };

    const measureApiCall = async (apiName, apiCall) => {
        const start = performance.now();
        try {
            const result = await apiCall();
            const end = performance.now();

            setMetrics(prev => ({
                ...prev,
                apiLatency: {
                    ...prev.apiLatency,
                    [apiName]: end - start
                }
            }));

            return result;
        } catch (error) {
            setMetrics(prev => ({
                ...prev,
                errorCount: prev.errorCount + 1
            }));
            throw error;
        }
    };

    return { metrics, measureRender, measureApiCall };
};
