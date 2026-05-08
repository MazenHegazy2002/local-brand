import { cookies } from "next/headers";
import { ar, en } from "./dicts";

export async function getDictionary(): Promise<typeof en> {
  const cookieStore = await cookies();
  const googTrans = cookieStore.get('googtrans')?.value;
  const isArabic = googTrans ? googTrans.includes('/ar') : false;
  return isArabic ? (ar as typeof en) : en;
}
