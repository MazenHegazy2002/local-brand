import { cookies, headers } from 'next/headers';
import { ar, fk, en } from './dicts';

export async function getDictionary(): Promise<typeof en> {
  try {
    const cookieStore = await cookies();
    const googTrans = cookieStore.get('googtrans')?.value;
    const headersList = await headers();
    const xLang = headersList.get('x-lang');

    const isArabic = (googTrans ? googTrans.includes('/ar') : false) || xLang === 'ar';
    if (isArabic) return { ...en, ...ar };

    if (xLang === 'fk') return { ...en, ...fk };

    return en;
  } catch {
    return en;
  }
}
