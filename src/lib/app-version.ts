// Mobile app version gate — pure helpers used by GET /api/app/config.

export type AppStatus = 'ok' | 'update_available' | 'update_required' | 'stopped';

/** Numeric dotted compare. '1.2' == '1.2.0'; non-numeric parts count as 0. */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const pa = a.split('.').map(n => parseInt(n, 10) || 0);
  const pb = b.split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d > 0 ? 1 : -1;
  }
  return 0;
}

export function resolveAppStatus(o: {
  version: string;
  latest: string;
  min: string;
  killSwitch: boolean;
  maintenance: boolean;
}): AppStatus {
  if (o.killSwitch || o.maintenance) return 'stopped';
  if (compareVersions(o.version, o.min) < 0) return 'update_required';
  if (compareVersions(o.version, o.latest) < 0) return 'update_available';
  return 'ok';
}
