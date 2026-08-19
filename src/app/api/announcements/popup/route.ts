import { NextResponse } from 'next/server';
import { getSetting } from '@/lib/admin-settings-registry';

export async function GET() {
  try {
    const enabled = await getSetting<boolean>('BUYER_POPUP_ENABLED');
    const title = await getSetting<string>('BUYER_POPUP_TITLE');
    const titleAr = await getSetting<string>('BUYER_POPUP_TITLE_AR');
    const message = await getSetting<string>('BUYER_POPUP_MESSAGE');
    const messageAr = await getSetting<string>('BUYER_POPUP_MESSAGE_AR');
    const type = await getSetting<string>('BUYER_POPUP_TYPE');
    const target = await getSetting<string>('BUYER_POPUP_TARGET');
    const popupId = await getSetting<string>('BUYER_POPUP_ID');
    const readOnlyMode = await getSetting<boolean>('READ_ONLY_MODE');

    return NextResponse.json(
      {
        enabled: Boolean(enabled),
        title: title || 'Important Notice',
        titleAr: titleAr || 'تنويه هام',
        message: message || '',
        messageAr: messageAr || '',
        type: type || 'info',
        target: target || 'all',
        popupId: popupId || 'v1',
        readOnlyMode: Boolean(readOnlyMode),
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=5, stale-while-revalidate=15',
        },
      }
    );
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { message: err.message || 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}
