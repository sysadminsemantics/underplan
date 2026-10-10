/**
 * Mirrors `underplan_*` localStorage keys to the server's JSON store (/api/state).
 * Server copy wins on load; browser stays the working copy, writes are debounced.
 * Silently no-ops if the API is absent (e.g. vite dev, static hosting).
 */
const PREFIX = 'underplan_';

export async function hydrateFromServer(): Promise<void> {
  try {
    const res = await fetch('/api/state', { cache: 'no-store' });
    if (!res.ok || !(res.headers.get('content-type') || '').includes('json')) return;
    const data: Record<string, string> = await res.json();
    for (const [k, v] of Object.entries(data)) if (k.startsWith(PREFIX)) localStorage.setItem(k, v);
  } catch { /* offline / no API: keep local state */ }
}

export function startServerSync(): void {
  const orig = Storage.prototype.setItem;
  const timers = new Map<string, number>();
  Storage.prototype.setItem = function (this: Storage, key: string, value: string) {
    orig.call(this, key, value);
    if (this !== localStorage || !key.startsWith(PREFIX)) return;
    clearTimeout(timers.get(key));
    timers.set(key, window.setTimeout(() => {
      fetch(`/api/state/${key}`, { method: 'PUT', body: value }).catch(() => {});
    }, 500));
  };
}
