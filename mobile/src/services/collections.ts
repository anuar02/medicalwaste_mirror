import { api } from './api';
import { ApiSuccess } from '../types/api';
import { CollectionSession } from '../types/models';

export interface ActiveCollectionResponse {
  session?: CollectionSession;
}

export interface CollectionHistoryResponse {
  sessions?: CollectionSession[];
}

export async function fetchActiveCollection(): Promise<CollectionSession | null> {
  const response = await api.get<ApiSuccess<ActiveCollectionResponse>>('/api/collections/active');
  if (response.data.status !== 'success') {
    throw new Error('Failed to load active collection');
  }
  const payload = response.data.data;
  return payload?.session ?? null;
}

export async function stopCollection(sessionId: string): Promise<CollectionSession> {
  const response = await api.post<ApiSuccess<{ session: CollectionSession }>>('/api/collections/stop', {
    sessionId,
  });
  if (response.data.status !== 'success' || !response.data.data?.session) {
    throw new Error('Failed to stop collection');
  }
  return response.data.data.session;
}

export async function markCollectionVisited(sessionId: string, containerId: string, collectedWeight?: number) {
  const response = await api.post<ApiSuccess<{ session: CollectionSession }>>('/api/collections/mark-visited', {
    sessionId,
    containerId,
    collectedWeight,
  });
  if (response.data.status !== 'success' || !response.data.data?.session) {
    throw new Error('Failed to mark container visited');
  }
  return response.data.data.session;
}

export async function fetchCollectionHistory(): Promise<CollectionSession[]> {
  const response = await api.get<ApiSuccess<CollectionHistoryResponse>>('/api/collections/history');
  if (response.data.status !== 'success') {
    throw new Error('Failed to load collection history');
  }
  return response.data.data?.sessions ?? [];
}
