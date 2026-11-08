import { getSetting } from '@/lib/admin-settings-registry';

/**
 * VAT added on top of product prices at checkout, controlled from
 * Admin OS > Settings > Tax ("Charge VAT" + "VAT rate"). Returns 0 when off.
 */
export async function getVatRate(): Promise<number> {
  try {
    const enabled = await getSetting<boolean>('VAT_ENABLED');
    if (!enabled) return 0;
    const rate = Number(await getSetting<number>('VAT_RATE'));
    return Number.isFinite(rate) && rate > 0 && rate < 1 ? rate : 0;
  } catch {
    return 0;
  }
}
