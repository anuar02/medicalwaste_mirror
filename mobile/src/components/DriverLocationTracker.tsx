import { useEffect } from 'react';

import { useActiveCollection } from '../hooks/useCollections';
import { stopCollectionLocationUpdates } from '../services/locationTracking';

export default function DriverLocationTracker() {
  const { data } = useActiveCollection();

  useEffect(() => {
    const syncTracking = async () => {
      if (!data || data.status !== 'active') {
        await stopCollectionLocationUpdates();
      }
    };

    syncTracking().catch((error) => {
      console.warn('Unable to stop location tracking', error);
    });
  }, [data?.status, data?._id]);

  return null;
}
