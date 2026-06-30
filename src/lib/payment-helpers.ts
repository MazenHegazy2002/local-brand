import Stripe from 'stripe';
import { STRIPE_API_VERSION } from '@/lib/constants';

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('Stripe secret key not configured');
    return null;
  }

  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: STRIPE_API_VERSION as Stripe.LatestApiVersion,
    });
  }

  return stripeInstance;
}

export async function createStripeRefund(
  paymentIntentId: string,
  amount: number
): Promise<Stripe.Refund> {
  const stripe = getStripe();
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  return stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: Math.round(amount * 100),
  });
}

export async function createStripePayout(
  sellerId: string,
  amount: number,
  stripeAccountId: string
): Promise<Stripe.Payout> {
  const stripe = getStripe();
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  return stripe.payouts.create(
    {
      amount: Math.round(amount * 100),
      currency: 'egp',
      destination: stripeAccountId,
    },
    {
      stripeAccount: stripeAccountId,
    }
  );
}

export async function retrievePaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> {
  const stripe = getStripe();
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  return stripe.paymentIntents.retrieve(paymentIntentId);
}

export async function createPaymentIntent(
  amount: number,
  currency: string = 'egp',
  metadata?: Record<string, string>
): Promise<Stripe.PaymentIntent> {
  const stripe = getStripe();
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  return stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency,
    metadata,
  });
}

export interface InstallmentPlan {
  tenure: number;
  monthlyPayment: number;
  totalAmount: number;
  interestRate: number;
  interestAmount: number;
}

export function calculateInstallment(
  amount: number,
  tenure: number,
  annualInterestRate: number = 0
): InstallmentPlan {
  if (tenure <= 0 || amount <= 0) {
    throw new Error('Invalid tenure or amount');
  }

  if (annualInterestRate === 0) {
    const monthlyPayment = amount / tenure;
    return {
      tenure,
      monthlyPayment: Math.round(monthlyPayment * 100) / 100,
      totalAmount: amount,
      interestRate: 0,
      interestAmount: 0,
    };
  }

  const monthlyRate = annualInterestRate / 12 / 100;
  const monthlyPayment =
    (amount * monthlyRate * Math.pow(1 + monthlyRate, tenure)) /
    (Math.pow(1 + monthlyRate, tenure) - 1);

  const totalAmount = monthlyPayment * tenure;
  const interestAmount = totalAmount - amount;

  return {
    tenure,
    monthlyPayment: Math.round(monthlyPayment * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
    interestRate: annualInterestRate,
    interestAmount: Math.round(interestAmount * 100) / 100,
  };
}

export function getAvailableTenures(minAmount: number = 1000): number[] {
  if (minAmount >= 5000) return [3, 6, 9, 12];
  if (minAmount >= 2000) return [3, 6, 9];
  if (minAmount >= 1000) return [3, 6];
  return [];
}

export async function verifyRefundEligibility(
  orderId: string,
  orderItemId: string
): Promise<{ eligible: boolean; reason?: string; refundableAmount?: number }> {
  const { prisma } = await import('@/lib/prisma');

  const orderItem = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    include: { order: true },
  });

  if (!orderItem) {
    return { eligible: false, reason: 'Order item not found' };
  }

  if (orderItem.orderId !== orderId) {
    return { eligible: false, reason: 'Order item does not belong to this order' };
  }

  if (orderItem.status === 'REFUNDED' || orderItem.status === 'CANCELLED') {
    return { eligible: false, reason: 'Item already refunded or cancelled' };
  }

  const deliveryDate =
    orderItem.order.deliveredAt ||
    (orderItem.order.status === 'DELIVERED' ? orderItem.order.updatedAt : null);
  if (!deliveryDate) {
    return { eligible: false, reason: 'Order item must be delivered to request a refund' };
  }

  const daysSinceDelivery = Math.floor(
    (Date.now() - new Date(deliveryDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceDelivery > 14) {
    return { eligible: false, reason: 'Refund window has expired (14 days from delivery)' };
  }

  return {
    eligible: true,
    refundableAmount: orderItem.priceAtPurchase * orderItem.quantity,
  };
}

export function formatPaymentMethodForDisplay(method: string): string {
  const methodMap: Record<string, string> = {
    CREDIT_CARD: 'Credit/Debit Card',
    MOBILE_WALLET: 'Mobile Wallet',
    CASH_ON_DELIVERY: 'Cash on Delivery',
    PAYMOB: 'Paymob',
    FAWRY: 'Fawry',
    PAYSKY: 'PaySky Card Payment',
  };

  return methodMap[method] || method.replace(/_/g, ' ');
}

export function isPaymentMethodOnline(method: string): boolean {
  const onlineMethods = ['CREDIT_CARD', 'PAYPAL', 'APPLE_PAY', 'GOOGLE_PAY', 'VALU', 'TABBY'];
  return onlineMethods.includes(method);
}
