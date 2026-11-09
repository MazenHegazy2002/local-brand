// After a new deploy, a page that was already open still calls the old
// server actions, and Next.js answers "Server Action ... was not found on the
// server". Reloading the page picks up the new version. Reload at most once
// a minute so a real, repeating error can't loop.
export function isStaleDeployError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  return /Server Action .* was not found on the server|Failed to find Server Action/i.test(msg);
}

export function reloadForNewVersion(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const last = Number(sessionStorage.getItem('stale-deploy-reload') || 0);
    if (Date.now() - last < 60_000) return false;
    sessionStorage.setItem('stale-deploy-reload', String(Date.now()));
  } catch {
    /* storage blocked: still reload once */
  }
  window.location.reload();
  return true;
}
