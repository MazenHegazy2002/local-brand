import { prisma } from '@/lib/prisma';
import { getShippingRate } from '@/lib/constants';

/**
 * Resolves the shipping rate for a given Egyptian Governorate, querying the
 * database's active `ShippingZone` configuration, and falling back to the
 * hardcoded fallback rates if not customized.
 */
export async function resolveShippingRate(governorate: string): Promise<number> {
  if (!governorate) return getShippingRate('');
  try {
    const key = governorate.toLowerCase().trim();
    // In our DB, governorates are stored as serialized JSON strings e.g. '["cairo"]'
    // Find the first active zone where the list of governorates contains this key.
    const zones = await prisma.shippingZone.findMany({
      where: { isActive: true },
    });

    for (const z of zones) {
      try {
        const list = JSON.parse(z.governorates);
        if (Array.isArray(list) && list.map(g => g.toLowerCase().trim()).includes(key)) {
          return Number(z.rateEgp);
        }
      } catch {
        // tolerate corrupt JSON
      }
    }
  } catch (e) {
    console.error('[resolveShippingRate] DB lookup failed, falling back:', e);
  }
  return getShippingRate(governorate);
}
