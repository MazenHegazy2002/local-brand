// src/app/api/affiliate/apply/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generatePromoCode, isPromoCodeAvailable, getGlobalSettings } from '@/lib/affiliate';
import { z } from 'zod';
import { AffiliatePayoutMethod } from '@/generated/client';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { BCRYPT_COST } from '@/lib/constants';
import { sendEmail } from '@/lib/email';
import { generateEmailVerificationEmail } from '@/lib/email-verification';

const ApplySchema = z.object({
  requestedCode: z
    .string()
    .min(3)
    .max(16)
    .regex(/^[A-Z0-9]+$/, 'Code must be letters and numbers only')
    .optional(),
  platform: z.string().min(2, 'Platform name is required'),
  platformFollowers: z.number().int().nonnegative().optional(),
  categoryFocus: z.string().optional(),
  applicationNote: z.string().optional(),
  payoutMethod: z.string(),
  payoutDetails: z.string().min(5, 'Valid payout details required'),
  // Optional registration fields
  name: z.string().optional(),
  email: z.string().optional(),
  password: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const body = await req.json();

  const parsed = ApplySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const {
    requestedCode,
    platform,
    platformFollowers,
    categoryFocus,
    applicationNote,
    payoutMethod,
    payoutDetails,
    name,
    email,
    password,
    phone,
    whatsapp,
  } = parsed.data;

  let userId = session?.user?.id;
  let userName = session?.user?.name || 'USER';
  let finalApplicationNote = applicationNote || '';

  // If user is not authenticated, validate and create user account
  if (!userId) {
    if (!name || !email || !password || !phone || !whatsapp) {
      return NextResponse.json(
        {
          error:
            'Account details (Name, Email, Password, Phone, WhatsApp) are required when not signed in.',
        },
        { status: 400 }
      );
    }

    const regParsed = z
      .object({
        name: z.string().min(2, 'Name must be at least 2 characters').max(100),
        email: z.string().email('Please enter a valid email address'),
        password: z.string().min(8, 'Password must be at least 8 characters').max(100),
        phone: z.string().min(5, 'Phone number must be at least 5 characters').max(20),
        whatsapp: z.string().min(5, 'WhatsApp number must be at least 5 characters').max(20),
      })
      .safeParse({ name, email, password, phone, whatsapp });

    if (!regParsed.success) {
      const errorMsg = regParsed.error.errors[0]?.message || 'Invalid registration details';
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please sign in first.' },
        { status: 409 }
      );
    }

    // Hash password using BCRYPT_COST
    const hashedPassword = await bcrypt.hash(password, BCRYPT_COST);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hashedPassword,
        role: 'BUYER',
        phone,
      },
    });

    userId = newUser.id;
    userName = newUser.name;

    // Append WhatsApp number to applicationNote
    finalApplicationNote = `WhatsApp: ${whatsapp}\n\n${finalApplicationNote}`.trim();

    // Create email verification token and send verification email
    try {
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 min

      await prisma.passwordResetToken.create({
        data: { email, token, expires },
      });

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const verifyUrl = `${appUrl}/api/auth/verify-email?token=${token}`;

      await sendEmail({
        to: email,
        subject: 'Verify your Brandy email address',
        html: generateEmailVerificationEmail(name, verifyUrl),
      });
    } catch (emailErr) {
      console.error('Failed to send verification email during dynamic registration:', emailErr);
    }
  } else {
    // If authenticated user provides WhatsApp number, format and append it
    if (whatsapp) {
      const cleanWhatsapp = whatsapp.trim();
      if (cleanWhatsapp.length >= 5) {
        finalApplicationNote = `WhatsApp: ${cleanWhatsapp}\n\n${finalApplicationNote}`.trim();
      }
    }

    // Check if logged-in user already has an application
    const existing = await prisma.affiliate.findUnique({
      where: { userId },
    });
    if (existing) {
      if (existing.status === 'ACTIVE') {
        return NextResponse.json(
          { error: 'You already have an active affiliate profile.' },
          { status: 400 }
        );
      }

      // If program is disabled
      const settings = await getGlobalSettings();
      if (!settings.programEnabled) {
        return NextResponse.json(
          { error: 'The affiliate program is currently disabled.' },
          { status: 400 }
        );
      }

      // Otherwise, allow they to re-apply / update their application!
      let candidateCode = existing.promoCode;
      if (requestedCode && requestedCode.toUpperCase() !== existing.promoCode) {
        const clean = requestedCode.toUpperCase();
        const available = await isPromoCodeAvailable(clean);
        if (!available) {
          return NextResponse.json(
            { error: 'Requested promo code is already taken.' },
            { status: 400 }
          );
        }
        candidateCode = clean;
      }

      const updated = await prisma.affiliate.update({
        where: { id: existing.id },
        data: {
          promoCode: candidateCode,
          referralSlug: candidateCode,
          status: 'PENDING', // Reset status back to PENDING so admin reviews it
          platform,
          platformFollowers,
          categoryFocus,
          applicationNote: finalApplicationNote,
          payoutMethod: payoutMethod as AffiliatePayoutMethod,
          payoutDetails,
        },
      });

      return NextResponse.json(
        { success: true, affiliateId: updated.id, promoCode: updated.promoCode, updated: true },
        { status: 200 }
      );
    }
  }

  const settings = await getGlobalSettings();
  if (!settings.programEnabled) {
    return NextResponse.json(
      { error: 'The affiliate program is currently disabled.' },
      { status: 400 }
    );
  }

  let candidateCode = '';
  if (requestedCode) {
    const clean = requestedCode.toUpperCase();
    const available = await isPromoCodeAvailable(clean);
    if (!available) {
      return NextResponse.json(
        { error: 'Requested promo code is already taken.' },
        { status: 400 }
      );
    }
    candidateCode = clean;
  } else {
    candidateCode = generatePromoCode(userName, Number(settings.defaultDiscountPct));
  }

  const affiliate = await prisma.affiliate.create({
    data: {
      userId,
      promoCode: candidateCode,
      referralSlug: candidateCode,
      status: 'PENDING',
      tier: 'STARTER',
      platform,
      platformFollowers,
      categoryFocus,
      applicationNote: finalApplicationNote,
      payoutMethod: payoutMethod as AffiliatePayoutMethod,
      payoutDetails,
    },
  });

  // ── Referral bonus attribution ──────────────────────────────────────────
  // If the applicant arrived via a brandy_ref cookie, wire up the referral chain
  // and create signup bonuses for both the joiner and the referrer.
  if (settings.bonusesEnabled) {
    const refSlug = req.cookies.get('brandy_ref')?.value;
    if (refSlug) {
      try {
        const referrer = await prisma.affiliate.findFirst({
          where: { referralSlug: refSlug.toUpperCase() },
        });
        if (referrer && referrer.id !== affiliate.id) {
          const expiresAt = settings.bonusExpiryDays
            ? new Date(Date.now() + settings.bonusExpiryDays * 24 * 60 * 60 * 1000)
            : null;

          // Joiner gets their bonus immediately (ACTIVE — usable on first order)
          const joinerBonus = await prisma.affiliateBonus.create({
            data: {
              affiliateId: affiliate.id,
              type: 'JOINER_SIGNUP',
              amountEgp: settings.joinerBonusEgp,
              status: 'ACTIVE',
              activatedAt: new Date(),
              expiresAt,
            },
          });

          // Referrer bonus stays PENDING until joiner's first order completes
          const referrerBonus = await prisma.affiliateBonus.create({
            data: {
              affiliateId: referrer.id,
              type: 'REFERRER_SIGNUP',
              amountEgp: settings.referrerBonusEgp,
              status: 'PENDING',
              expiresAt,
            },
          });

          // Link them through an AffiliateReferral record
          await prisma.affiliateReferral.create({
            data: {
              referrerAffiliateId: referrer.id,
              newAffiliateId: affiliate.id,
              referrerBonusId: referrerBonus.id,
              joinerBonusId: joinerBonus.id,
            },
          });
        }
      } catch (refErr) {
        console.error('Failed to wire affiliate referral bonuses:', refErr);
      }
    }
  }

  return NextResponse.json(
    { success: true, affiliateId: affiliate.id, promoCode: affiliate.promoCode },
    { status: 201 }
  );
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const affiliate = await prisma.affiliate.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json({ affiliate });
}
