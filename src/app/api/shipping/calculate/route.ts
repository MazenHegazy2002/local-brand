import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Shipping cost calculation utility (Aramex/Bosta Egypt estimate)
// In production: replace with real Aramex API call
function calculateShippingCost(governorate: string, weightGrams: number): number {
  const governorateRates: Record<string, number> = {
    'Cairo': 40,
    'Giza': 40,
    'Alexandria': 55,
    'Luxor': 80,
    'Aswan': 85,
    'Sharm El Sheikh': 90,
    'Hurghada': 85,
    'Mansoura': 65,
    'Tanta': 65,
    'Ismailia': 70,
  };

  const baseRate = governorateRates[governorate] || 75; // Default for unlisted governorates
  const weightSurcharge = weightGrams > 2000 ? Math.ceil((weightGrams - 2000) / 1000) * 10 : 0;
  return baseRate + weightSurcharge;
}

export async function POST(req: Request) {
  try {
    const { cartItems, governorate } = await req.json();

    if (!cartItems || !governorate) {
      return NextResponse.json({ message: 'cartItems and governorate required' }, { status: 400 });
    }

    let totalWeightGrams = 0;

    for (const item of cartItems) {
      const product = await prisma.product.findUnique({
        where: { id: item.id },
        select: { weightGrams: true }
      });
      if (product?.weightGrams) {
        totalWeightGrams += product.weightGrams * item.qty;
      } else {
        totalWeightGrams += 500 * item.qty; // default 500g if not specified
      }
    }

    const shippingCost = calculateShippingCost(governorate, totalWeightGrams);
    const estimatedDays = ['Cairo', 'Giza', 'Alexandria'].includes(governorate) ? '1-2' : '3-5';

    return NextResponse.json({
      shippingCost,
      currency: 'EGP',
      estimatedDelivery: `${estimatedDays} business days`,
      courier: 'Aramex Egypt',
      weightGrams: totalWeightGrams,
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
