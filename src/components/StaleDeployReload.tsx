'use client';

import { useEffect } from 'react';
import { isStaleDeployError, reloadForNewVersion } from '@/lib/stale-deploy';

// Mounted once in the root layout: when an open tab hits a server action from
// an older deploy, reload so it gets the new version instead of an error.
export default function StaleDeployReload() {
  useEffect(() => {
    const onRejection = (e: PromiseRejectionEvent) => {
      if (isStaleDeployError(e.reason) && reloadForNewVersion()) e.preventDefault();
    };
    const onError = (e: ErrorEvent) => {
      if (isStaleDeployError(e.error ?? e.message)) reloadForNewVersion();
    };
    window.addEventListener('unhandledrejection', onRejection);
    window.addEventListener('error', onError);
    return () => {
      window.removeEventListener('unhandledrejection', onRejection);
      window.removeEventListener('error', onError);
    };
  }, []);
  return null;
}
