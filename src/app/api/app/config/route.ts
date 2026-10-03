// GET /api/app/config?version=1.2.3&platform=ios|android|web
// Public, unauthenticated version gate for the mobile app. Reachable during
// maintenance (exempted in proxy.ts) so the app can show the stop screen.
import { NextRequest, NextResponse } from 'next/server';
import { getSettings } from '@/lib/admin-settings-registry';
import { resolveAppStatus } from '@/lib/app-version';

const HEADERS = {
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: HEADERS });
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const raw = q.get('version') ?? '';
  const version = /^\d+(\.\d+)*$/.test(raw) ? raw : '0.0.0';
  const platform = q.get('platform');

  const s = await getSettings<{
    MOBILE_LATEST_VERSION: string;
    MOBILE_MIN_VERSION: string;
    MOBILE_UPDATE_MESSAGE: string;
    MOBILE_KILL_SWITCH: boolean;
    MOBILE_KILL_MESSAGE: string;
    MOBILE_IOS_STORE_URL: string;
    MOBILE_ANDROID_STORE_URL: string;
    MAINTENANCE_MODE: boolean;
    MAINTENANCE_MESSAGE: string;
  }>([
    'MOBILE_LATEST_VERSION',
    'MOBILE_MIN_VERSION',
    'MOBILE_UPDATE_MESSAGE',
    'MOBILE_KILL_SWITCH',
    'MOBILE_KILL_MESSAGE',
    'MOBILE_IOS_STORE_URL',
    'MOBILE_ANDROID_STORE_URL',
    'MAINTENANCE_MODE',
    'MAINTENANCE_MESSAGE',
  ]);

  const status = resolveAppStatus({
    version,
    latest: s.MOBILE_LATEST_VERSION,
    min: s.MOBILE_MIN_VERSION,
    killSwitch: s.MOBILE_KILL_SWITCH,
    maintenance: s.MAINTENANCE_MODE,
  });

  const message =
    status === 'stopped'
      ? s.MOBILE_KILL_SWITCH
        ? s.MOBILE_KILL_MESSAGE
        : s.MAINTENANCE_MESSAGE
      : status === 'ok'
        ? ''
        : s.MOBILE_UPDATE_MESSAGE;

  const storeUrl =
    (platform === 'ios'
      ? s.MOBILE_IOS_STORE_URL
      : platform === 'android'
        ? s.MOBILE_ANDROID_STORE_URL
        : '') || null;

  return NextResponse.json(
    {
      status,
      latestVersion: s.MOBILE_LATEST_VERSION,
      minVersion: s.MOBILE_MIN_VERSION,
      message,
      storeUrl,
    },
    { headers: HEADERS }
  );
}
