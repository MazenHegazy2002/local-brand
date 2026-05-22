/**
 * seed-affiliate-demo.ts
 * Creates a ready-to-use affiliate test account with sample data.
 * Run: npx tsx scripts/seed-affiliate-demo.ts
 */

import { PrismaClient } from '../src/generated/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const BCRYPT_COST = 12;

const AFFILIATE_EMAIL = 'affiliate@demo.com';
const AFFILIATE_PASSWORD = 'affiliate1234';
const AFFILIATE_NAME = 'Sara Hassan';
const PROMO_CODE = 'SARA15';

async function main() {
  console.log('Creating affiliate demo account…');

  // 1. Tier config
  const tiers = [
    { tier: 'STARTER', name: 'Starter', minConversions: 0, commissionPct: 5 },
    { tier: 'SILVER', name: 'Silver', minConversions: 10, commissionPct: 7 },
    { tier: 'GOLD', name: 'Gold', minConversions: 30, commissionPct: 10 },
    { tier: 'PLATINUM', name: 'Platinum', minConversions: 100, commissionPct: 12 },
  ];
  for (const t of tiers) {
    await prisma.affiliateTierConfig.upsert({
      where: { tier: t.tier as never },
      create: { ...t, commissionPct: t.commissionPct } as never,
      update: {},
    });
  }

  // 2. Global settings
  await prisma.affiliateGlobalSettings.upsert({
    where: { id: 'global' },
    create: {
      id: 'global',
      programEnabled: true,
      defaultDiscountPct: 15,
      referrerBonusEgp: 50,
      joinerBonusEgp: 30,
      bonusesEnabled: true,
    } as never,
    update: {},
  });

  // 3. Clean up previous run
  const existing = await prisma.user.findUnique({ where: { email: AFFILIATE_EMAIL } });
  if (existing) {
    const aff = await prisma.affiliate.findUnique({ where: { userId: existing.id } });
    if (aff) {
      await prisma.commission.deleteMany({ where: { affiliateId: aff.id } });
      await prisma.affiliateBonus.deleteMany({ where: { affiliateId: aff.id } });
      await prisma.affiliatePayout.deleteMany({ where: { affiliateId: aff.id } });
      await prisma.affiliate.delete({ where: { id: aff.id } });
    }
    await prisma.user.delete({ where: { id: existing.id } });
    console.log('  Removed previous demo user.');
  }

  // 4. Create user
  const user = await prisma.user.create({
    data: {
      name: AFFILIATE_NAME,
      email: AFFILIATE_EMAIL,
      passwordHash: await bcrypt.hash(AFFILIATE_PASSWORD, BCRYPT_COST),
      role: 'BUYER',
      emailVerified: new Date(),
      phone: '01012345678',
    },
  });

  // 5. Create affiliate profile
  const affiliate = await prisma.affiliate.create({
    data: {
      userId: user.id,
      promoCode: PROMO_CODE,
      referralSlug: PROMO_CODE,
      status: 'ACTIVE',
      tier: 'SILVER',
      totalConversions: 14,
      totalEarnedEgp: 386.5,
      pendingEarningsEgp: 192.0,
      platform: 'Instagram',
      platformFollowers: 28000,
      categoryFocus: 'Fashion & Clothing',
      applicationNote: 'WhatsApp: 01012345678\nNiche: Egyptian fashion & clothing.',
      payoutMethod: 'VODAFONE_CASH',
      payoutDetails: '01012345678',
      approvedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    },
  });

  // 6. Get or create a dummy buyer for orders
  const buyer = await prisma.user.upsert({
    where: { email: 'dummy-buyer@seed.internal' },
    create: {
      name: 'Test Buyer',
      email: 'dummy-buyer@seed.internal',
      passwordHash: await bcrypt.hash('x', 4),
      role: 'BUYER',
      emailVerified: new Date(),
    },
    update: {},
  });

  const addrSnapshot = JSON.stringify({
    name: 'Test Buyer',
    line1: '123 Tahrir St',
    city: 'Cairo',
    governorate: 'Cairo',
    postalCode: '11511',
    phone: '01099999999',
  });

  // 7. Sample orders → commissions
  const ordersData = [
    { total: 850, daysAgo: 2, commEgp: 59.5, confirmed: true },
    { total: 1200, daysAgo: 5, commEgp: 84.0, confirmed: true },
    { total: 430, daysAgo: 9, commEgp: 30.1, confirmed: true },
    { total: 650, daysAgo: 14, commEgp: 45.5, confirmed: false },
    { total: 920, daysAgo: 17, commEgp: 64.4, confirmed: false },
    { total: 310, daysAgo: 22, commEgp: 21.7, confirmed: false },
  ];

  for (const o of ordersData) {
    const createdAt = new Date(Date.now() - o.daysAgo * 86_400_000);
    const order = await prisma.order.create({
      data: {
        user: { connect: { id: buyer.id } },
        status: 'DELIVERED',
        paymentMethod: 'CASH_ON_DELIVERY',
        paymentStatus: 'PAID',
        totalAmount: o.total,
        shippingAddressSnapshot: addrSnapshot,
        idempotencyKey: `demo-aff-${o.daysAgo}-${Date.now()}`,
        createdAt,
        deliveredAt: o.confirmed ? new Date(createdAt.getTime() + 5 * 86_400_000) : null,
      },
    });

    await prisma.commission.create({
      data: {
        affiliateId: affiliate.id,
        orderId: order.id,
        orderTotalEgp: o.total,
        commissionPct: 7,
        commissionEgp: o.commEgp,
        status: o.confirmed ? 'CONFIRMED' : 'PENDING',
        confirmedAt: o.confirmed ? new Date(createdAt.getTime() + 14 * 86_400_000) : null,
        createdAt,
      },
    });
  }

  // 8. Referral bonus (active, expires in 30 days)
  await prisma.affiliateBonus.create({
    data: {
      affiliateId: affiliate.id,
      type: 'REFERRER_SIGNUP',
      amountEgp: 50,
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 30 * 86_400_000),
      activatedAt: new Date(Date.now() - 20 * 86_400_000),
    },
  });

  // 9. One completed payout
  await prisma.affiliatePayout.create({
    data: {
      affiliateId: affiliate.id,
      amountEgp: 194.5,
      method: 'VODAFONE_CASH',
      payoutDetails: '01012345678',
      status: 'PAID',
      processedAt: new Date(Date.now() - 35 * 86_400_000),
      createdAt: new Date(Date.now() - 38 * 86_400_000),
    },
  });

  // ── Done ─────────────────────────────────────────────────────────────────
  console.log('\n✅  Affiliate demo account ready!\n');
  console.log('┌──────────────────────────────────────────────┐');
  console.log('│         AFFILIATE DASHBOARD LOGIN             │');
  console.log('├──────────────────────────────────────────────┤');
  console.log('│  Page      : /affiliate/dashboard            │');
  console.log(`│  Email     : ${AFFILIATE_EMAIL.padEnd(30)} │`);
  console.log(`│  Password  : ${AFFILIATE_PASSWORD.padEnd(30)} │`);
  console.log('├──────────────────────────────────────────────┤');
  console.log(`│  Promo code   : ${PROMO_CODE.padEnd(27)} │`);
  console.log('│  Tier         : Silver  (14 / 30 conversions)│');
  console.log('│  Total earned : 386.50 EGP                   │');
  console.log('│  Pending      : 192.00 EGP                   │');
  console.log('│  Commissions  : 6  (3 confirmed · 3 pending) │');
  console.log('│  Bonus        : 50 EGP referral bonus        │');
  console.log('│  Past payout  : 194.50 EGP (PAID)            │');
  console.log('└──────────────────────────────────────────────┘');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
