import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/admin-settings-registry';

export const revalidate = 0; // Disable static caching so admin toggles apply immediately

export async function GET() {
  try {
    const s = await getSettings<{
      PAY_COD_ENABLED: boolean;
      PAY_STRIPE_ENABLED: boolean;
      PAY_PAYSKY_ENABLED: boolean;
      PAY_PAYMOB_ENABLED: boolean;
      PAY_FAWRY_ENABLED: boolean;
      PAY_WALLET_ENABLED: boolean;
      PAY_INSTAPAY_ENABLED: boolean;
      PAY_VODAFONE_CASH_ENABLED: boolean;
    }>([
      'PAY_COD_ENABLED',
      'PAY_STRIPE_ENABLED',
      'PAY_PAYSKY_ENABLED',
      'PAY_PAYMOB_ENABLED',
      'PAY_FAWRY_ENABLED',
      'PAY_WALLET_ENABLED',
      'PAY_INSTAPAY_ENABLED',
      'PAY_VODAFONE_CASH_ENABLED',
    ]);

    return NextResponse.json({
      CASH_ON_DELIVERY: s.PAY_COD_ENABLED ?? true,
      CREDIT_CARD: s.PAY_STRIPE_ENABLED ?? true,
      MOBILE_WALLET: s.PAY_WALLET_ENABLED ?? true,
      PAYSKY: s.PAY_PAYSKY_ENABLED ?? true,
      FAWRY: s.PAY_FAWRY_ENABLED ?? true,
      INSTAPAY: s.PAY_INSTAPAY_ENABLED ?? true,
      VODAFONE_CASH: s.PAY_VODAFONE_CASH_ENABLED ?? true,
    });
  } catch (error) {
    console.error('Failed to load payment methods config:', error);
    // Fallback: enable all
    return NextResponse.json({
      CASH_ON_DELIVERY: true,
      CREDIT_CARD: true,
      MOBILE_WALLET: true,
      PAYSKY: true,
      FAWRY: true,
      INSTAPAY: true,
      VODAFONE_CASH: true,
    });
  }
}
