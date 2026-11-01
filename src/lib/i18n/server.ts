import { cookies, headers } from 'next/headers';
import { ar, fk, en } from './dicts';
import { uiAr } from './ui-ar';

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

export async function isServerArabic() {
  return (await getDictionary()).HeroTitle === ar.HeroTitle;
}

/** Server counterpart of `tr` from useLanguage: translates English UI copy; other values pass through. */
export async function getServerTr() {
  const isArabic = await isServerArabic();
  return <T>(text: T): T =>
    (isArabic && typeof text === 'string' ? (uiAr[text] ?? text) : text) as T;
}
