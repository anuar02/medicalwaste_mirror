import { useQuery } from '@tanstack/react-query';

import { fetchIncinerationPlants } from '../services/incinerationPlants';

export function useIncinerationPlants() {
  return useQuery({
    queryKey: ['incineration-plants'],
    queryFn: fetchIncinerationPlants,
  });
}
