import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { sendEmail } from '@/lib/email';
import { notifyAdminNewRegistration } from '@/lib/admin-registration-alerts';

const SellerApplySchema = z.object({
  storeName: z.string().min(2, 'Store name must be at least 2 characters').max(100),
  type: z.enum(['INDIVIDUAL', 'BUSINESS']).default('INDIVIDUAL'),
  taxNumber: z.string().optional(),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  phone: z.string().min(5, 'Phone number must be at least 5 characters').max(20).optional(),
  governorate: z.string().min(1, 'Pickup governorate is required'),
  city: z.string().min(1, 'Pickup city/area is required'),
  pickupStreet: z.string().min(5, 'Detailed pickup street address is required'),
  pickupBuilding: z.string().optional(),
  pickupPhone: z.string().min(5, 'Pickup contact phone number is required'),
  pickupContactName: z.string().optional(),
  pickupGeo: z.string().optional(),
  pickupZone: z.string().optional(),
  pickupSubzone: z.string().optional(),
  logisticsHub: z.string().optional(),
  facebookUrl: z.string().url().or(z.literal('')).optional(),
  instagramUrl: z.string().url().or(z.literal('')).optional(),
  tiktokUrl: z.string().url().or(z.literal('')).optional(),
  logoUrl: z.string().url().or(z.literal('')).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();

    const parsed = SellerApplySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const {
      storeName,
      type,
      taxNumber,
      description,
      phone,
      governorate,
      city,
      pickupStreet,
      pickupBuilding,
      pickupPhone,
      pickupContactName,
      pickupGeo,
      pickupZone,
      pickupSubzone,
      logisticsHub,
      facebookUrl,
      instagramUrl,
      tiktokUrl,
      logoUrl,
    } = parsed.data;

    // Check for duplicate store name
    const existingStore = await prisma.sellerProfile.findUnique({
      where: { storeName: storeName.trim() },
    });
    if (existingStore) {
      return NextResponse.json(
        { error: { storeName: ['A store with this name already exists.'] } },
        { status: 409 }
      );
    }

    // Check if user already has a seller profile
    const existingProfile = await prisma.sellerProfile.findUnique({
      where: { userId },
    });
    if (existingProfile) {
      return NextResponse.json(
        { error: 'You have already applied or registered as a seller.' },
        { status: 400 }
      );
    }

    // Create the SellerProfile in PENDING_APPROVAL status with Pickup Address & Geolocation
    const profile = await prisma.sellerProfile.create({
      data: {
        userId,
        storeName: storeName.trim(),
        description: description.trim(),
        type,
        governorate: governorate.trim(),
        city: city.trim(),
        pickupStreet: pickupStreet.trim(),
        pickupBuilding: pickupBuilding?.trim() || null,
        pickupPhone: pickupPhone.trim(),
        pickupContactName: pickupContactName?.trim() || null,
        pickupGeo: pickupGeo?.trim() || null,
        pickupZone: pickupZone?.trim() || null,
        pickupSubzone: pickupSubzone?.trim() || null,
        logisticsHub: logisticsHub?.trim() || null,
        taxNumber: taxNumber || null,
        facebookUrl: facebookUrl || null,
        instagramUrl: instagramUrl || null,
        tiktokUrl: tiktokUrl || null,
        logoUrl: logoUrl || null,
        status: 'PENDING_APPROVAL',
      },
    });

    // Update User details (role to SELLER, and phone number if not present)
    const updateData: any = { role: 'SELLER' };
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user && !user.phone && phone) {
      updateData.phone = phone.trim();
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // Send application confirmation email
    const recipientEmail = user?.email || session.user.email;
    const recipientName = user?.name || session.user.name || 'Seller';
    if (recipientEmail) {
      try {
        await sendEmail({
          to: recipientEmail,
          subject: 'We have received your seller application! 🏪',
          html: `<p>Hi ${recipientName},</p><p>Thank you for applying to sell on Brandy! We have received your application for <strong>${storeName}</strong>.</p><p>Our admin team is currently reviewing your details. This process typically takes 1-2 business days. We will notify you via email once your account has been activated.</p><p>Best regards,<br/>The Brandy Team</p>`,
        });
      } catch (emailErr) {
        console.error('[seller application] Failed to send email:', emailErr);
      }
    }

    // Send admin notification to mazenhegazy6@gmail.com
    notifyAdminNewRegistration({
      type: 'SELLER',
      userId,
      name: recipientName,
      email: recipientEmail || user?.email || session.user.email || '',
      phone: phone || user?.phone || null,
      role: 'SELLER',
      storeName: storeName.trim(),
      sellerType: type,
      description: description.trim(),
      taxNumber: taxNumber || null,
      governorate: governorate.trim(),
      city: city.trim(),
      pickupStreet: pickupStreet.trim(),
      pickupPhone: pickupPhone.trim(),
      facebookUrl: facebookUrl || null,
      instagramUrl: instagramUrl || null,
      tiktokUrl: tiktokUrl || null,
      logoUrl: logoUrl || null,
    }).catch(err => console.error('[seller apply] Admin notification error:', err));

    return NextResponse.json({ success: true, profileId: profile.id }, { status: 201 });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[seller-apply] POST error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
