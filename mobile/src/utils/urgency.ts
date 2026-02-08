export type UrgencyLevel = 'critical' | 'warning' | 'normal' | 'unknown';

export function getUrgencyLevel(fullness?: number): UrgencyLevel {
  if (fullness == null) return 'unknown';
  if (fullness >= 85) return 'critical';
  if (fullness >= 60) return 'warning';
  return 'normal';
}

export function getUrgencyColor(fullness?: number): string {
  if (fullness == null) return '#64748b';
  if (fullness >= 85) return '#ef4444';
  if (fullness >= 60) return '#f59e0b';
  return '#10b981';
}

export function getUrgencyBg(fullness?: number): string {
  if (fullness == null) return 'rgba(100, 116, 139, 0.2)';
  if (fullness >= 85) return 'rgba(239, 68, 68, 0.15)';
  if (fullness >= 60) return 'rgba(245, 158, 11, 0.15)';
  return 'rgba(16, 185, 129, 0.15)';
}
