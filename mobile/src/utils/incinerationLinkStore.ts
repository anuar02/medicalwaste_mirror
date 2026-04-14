import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Persists incineration-handoff confirmation links for the lifetime of a
 * collection session. The backend only returns the raw token once (at creation
 * time); if the driver leaves the screen we lose it unless we save it locally.
 *
 * Entries are keyed by session id so they're naturally scoped and can be
 * cleared when the session ends.
 */

export interface StoredIncinerationLink {
  handoffId: string;
  url: string;
  createdAt: string;
  expiresAt?: string;
}

const KEY_PREFIX = 'incineration-link:';

function keyFor(sessionId: string) {
  return `${KEY_PREFIX}${sessionId}`;
}

export async function saveIncinerationLink(
  sessionId: string,
  link: StoredIncinerationLink,
): Promise<void> {
  if (!sessionId) return;
  try {
    await AsyncStorage.setItem(keyFor(sessionId), JSON.stringify(link));
  } catch {
    // storage failures are non-fatal — the link is still shown in-memory
  }
}

export async function loadIncinerationLink(
  sessionId: string,
): Promise<StoredIncinerationLink | null> {
  if (!sessionId) return null;
  try {
    const raw = await AsyncStorage.getItem(keyFor(sessionId));
    if (!raw) return null;
    return JSON.parse(raw) as StoredIncinerationLink;
  } catch {
    return null;
  }
}

export async function clearIncinerationLink(sessionId: string): Promise<void> {
  if (!sessionId) return;
  try {
    await AsyncStorage.removeItem(keyFor(sessionId));
  } catch {
    // ignore
  }
}

/**
 * Removes any stored links that don't belong to a currently-active session.
 * Call this when transitioning away from an active session to keep storage
 * tidy without risking deletion of an in-progress link.
 */
export async function pruneIncinerationLinks(
  activeSessionIds: string[],
): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const linkKeys = keys.filter((k) => k.startsWith(KEY_PREFIX));
    const active = new Set(activeSessionIds.map((id) => keyFor(id)));
    const stale = linkKeys.filter((k) => !active.has(k));
    if (stale.length) await AsyncStorage.multiRemove(stale);
  } catch {
    // ignore
  }
}
