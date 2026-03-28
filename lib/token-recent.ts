const RECENT_WINDOW_MS = 1000 * 60 * 60 * 24;

export function isRecentlyUpdated(iso?: string): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < RECENT_WINDOW_MS;
}

export function recentUpdateLabel(iso?: string): string | null {
  if (!isRecentlyUpdated(iso)) return null;
  const t = new Date(iso!).getTime();
  const diff = Date.now() - t;
  if (diff < 45_000) return "just now";
  if (diff < 3600_000) return `${Math.max(1, Math.floor(diff / 60000))}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}
