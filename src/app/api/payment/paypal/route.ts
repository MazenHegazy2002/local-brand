import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, amount } = body;

    if (!orderId || !amount) {
      return NextResponse.json({ 
        message: 'Order ID and amount are required',
        available: false
      }, { status: 400 });
    }

    return NextResponse.json({
      message: 'PayPal integration not yet available',
      available: false,
      alternative: 'Use Stripe credit/debit card payment',
      note: 'PayPal integration requires PayPal business account setup and API credentials'
    }, { status: 501 });

  } catch (error) {
    console.error('PayPal Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    provider: 'PayPal',
    status: 'not_configured',
    message: 'PayPal is not currently integrated. Stripe is the primary payment provider.',
    supported_methods: ['Credit Card', 'Cash on Delivery'],
    coming_soon: ['PayPal', 'Apple Pay', 'Google Pay']
  }, { status: 200 });
}