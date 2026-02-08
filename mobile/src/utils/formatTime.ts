type TFunction = (key: string, options?: Record<string, unknown>) => string;

export function formatRelativeTime(
  isoString: string | undefined,
  t: TFunction,
): string {
  if (!isoString) return '--';
  const ts = new Date(isoString).getTime();
  if (Number.isNaN(ts)) return '--';
  const diff = Date.now() - ts;
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 60) return t('driver.home.time.minutes', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('driver.home.time.hours', { count: hours });
  const days = Math.floor(hours / 24);
  return t('driver.home.time.days', { count: days });
}

export type DataFreshness = 'fresh' | 'stale' | 'old';

export function getDataFreshness(isoString?: string): DataFreshness {
  if (!isoString) return 'old';
  const ts = new Date(isoString).getTime();
  if (Number.isNaN(ts)) return 'old';
  const minutes = (Date.now() - ts) / 60000;
  if (minutes < 2) return 'fresh';
  if (minutes < 10) return 'stale';
  return 'old';
}
