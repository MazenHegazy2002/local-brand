import { cookies, headers } from 'next/headers';
import { ar, en } from './dicts';

export async function getDictionary(): Promise<typeof en> {
  const cookieStore = await cookies();
  const googTrans = cookieStore.get('googtrans')?.value;
  const isArabicCookie = googTrans ? googTrans.includes('/ar') : false;

  const headersList = await headers();
  const xLang = headersList.get('x-lang');
  const isArabicHeader = xLang === 'ar';

  const isArabic = isArabicCookie || isArabicHeader;
  return isArabic ? (ar as typeof en) : en;
}
