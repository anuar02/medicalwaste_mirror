import { useEffect } from 'react';

import { useActiveCollection } from '../hooks/useCollections';
import { startCollectionLocationUpdates, stopCollectionLocationUpdates } from '../services/locationTracking';

export default function DriverLocationTracker() {
  const { data } = useActiveCollection();

  useEffect(() => {
    let isMounted = true;

    const syncTracking = async () => {
      if (!data || data.status !== 'active') {
        await stopCollectionLocationUpdates();
        return;
      }

      try {
        await startCollectionLocationUpdates();
      } catch (error) {
        if (isMounted) {
          console.warn('Unable to start location tracking', error);
        }
      }
    };

    syncTracking();

    return () => {
      isMounted = false;
    };
  }, [data?.status, data?._id]);

  return null;
}
