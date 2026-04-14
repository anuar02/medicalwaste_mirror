import { useQuery } from '@tanstack/react-query';

import { fetchIncinerationPlants } from '../services/incinerationPlants';

export function useIncinerationPlants(companyId?: string) {
  return useQuery({
    queryKey: ['incineration-plants', companyId ?? 'all'],
    queryFn: () => fetchIncinerationPlants(companyId),
  });
}
