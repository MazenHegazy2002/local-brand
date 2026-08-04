import { prisma } from '@/lib/prisma';
import { getShippingRate, normalizeGovernorateName } from '@/lib/shipping-rates';

/**
 * Resolves the shipping rate for a given Egyptian Governorate, querying the
 * database's active `ShippingZone` configuration, and falling back to the
 * Egypt Post calculation logic if not customized.
 */
export async function resolveShippingRate(
  governorate: string,
  originGovernorate: string = 'cairo',
  weightGrams: number = 1000
): Promise<number> {
  if (!governorate) return getShippingRate('', originGovernorate, weightGrams);
  try {
    const key = normalizeGovernorateName(governorate);

    // Find the first active zone where the list of governorates contains this key.
    if (prisma.shippingZone?.findMany) {
      const zones = await prisma.shippingZone.findMany({
        where: { isActive: true },
      });

      for (const z of zones) {
        try {
          const list: string[] = JSON.parse(z.governorates);
          if (Array.isArray(list) && list.map(g => normalizeGovernorateName(g)).includes(key)) {
            const baseRate = Number(z.rateEgp);
            // Check optional weight bands
            if (z.weightBandsJson) {
              try {
                const bands: Array<{ maxGrams: number; rate: number }> = JSON.parse(
                  z.weightBandsJson
                );
                const matchingBand = bands.find(b => weightGrams <= b.maxGrams);
                if (matchingBand) return matchingBand.rate;
              } catch {
                // ignore invalid weight bands json
              }
            }
            return baseRate;
          }
        } catch {
          // tolerate corrupt JSON
        }
      }
    }
  } catch (e) {
    console.error('[resolveShippingRate] DB lookup failed, falling back:', e);
  }

  return getShippingRate(governorate, originGovernorate, weightGrams);
}
