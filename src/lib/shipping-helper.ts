import { getShippingRate, getOrderShippingFee } from '@/lib/shipping-rates';
import { prisma } from '@/lib/prisma';

/**
 * Egypt Post price from the seller's governorate (origin) to the customer's
 * governorate, for a parcel of `weightGrams`. Prices come from the Egypt Post
 * list in shipping-rates.ts.
 */
export async function resolveShippingRate(
  governorate: string,
  originGovernorate: string = 'cairo',
  weightGrams: number = 1000
): Promise<number> {
  return getShippingRate(governorate, originGovernorate, weightGrams);
}

/**
 * Shipping for a cart: one parcel per seller, each priced from that seller's
 * governorate. Items are product ids or variant ids.
 */
export async function resolveCartShipping(
  destinationGovernorate: string,
  items: Array<{ id?: string; quantity: number }>
): Promise<{ fee: number; weightGrams: number }> {
  const ids = Array.from(new Set(items.map(i => i.id).filter(Boolean) as string[]));
  const [products, variants] = ids.length
    ? await Promise.all([
        prisma.product.findMany({
          where: { id: { in: ids } },
          select: {
            id: true,
            weightGrams: true,
            sellerId: true,
            seller: { select: { governorate: true } },
          },
        }),
        prisma.productVariant.findMany({
          where: { id: { in: ids } },
          select: {
            id: true,
            product: {
              select: {
                weightGrams: true,
                sellerId: true,
                seller: { select: { governorate: true } },
              },
            },
          },
        }),
      ])
    : [[], []];
  const byId = new Map<
    string,
    { weightGrams: number | null; sellerId: string; seller: { governorate: string | null } | null }
  >();
  for (const p of products) byId.set(p.id, p);
  for (const v of variants) byId.set(v.id, v.product);

  const parcels = new Map<string, { originGovernorate: string | null; weightGrams: number }>();
  let total = 0;
  for (const item of items) {
    const p = item.id ? byId.get(item.id) : undefined;
    const grams = (p?.weightGrams || 500) * item.quantity;
    total += grams;
    const key = p?.sellerId ?? '_unknown';
    const parcel = parcels.get(key) ?? {
      originGovernorate: p?.seller?.governorate ?? null,
      weightGrams: 0,
    };
    parcel.weightGrams += grams;
    parcels.set(key, parcel);
  }
  return {
    fee: getOrderShippingFee(destinationGovernorate, [...parcels.values()]),
    weightGrams: total,
  };
}
