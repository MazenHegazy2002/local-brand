// Admin Pages API.
//
// GET    /api/admin/pages         — list (filter by status via ?status=)
// POST   /api/admin/pages         — create
// PATCH  /api/admin/pages         — update one (body must include `id`)
// DELETE /api/admin/pages?id=X    — soft-archive (status=ARCHIVED)
//
// Pages are addressed publicly at /p/[slug] and rendered via a dedicated
// route (see src/app/p/[slug]/page.tsx). Drafts return 404 to non-admins.
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { SessionUser } from '@/types';
import { prisma } from '@/lib/prisma';
import { PageStatus } from '@/generated/client';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as SessionUser).role !== 'ADMIN') return null;
  return session.user as SessionUser;
}

// ── GET ────────────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') as PageStatus | null;
  const id = searchParams.get('id');

  if (id) {
    const page = await prisma.page.findUnique({ where: { id } });
    if (!page) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    return NextResponse.json({ page });
  }

  const count = await prisma.page.count();
  if (count === 0) {
    try {
      await prisma.page.createMany({
        data: [
          {
            slug: 'about',
            titleEn: 'About Us',
            titleAr: 'من نحن',
            bodyEn:
              '# About Us\n\nWelcome to Brandy, the premier marketplace for local Egyptian brands! We connect talented local artisans and creators directly with buyers across Egypt.',
            bodyAr: '# من نحن\n\nمرحباً بكم في براندي، المنصة الرائدة للماركات المصرية المحلية!',
            status: PageStatus.PUBLISHED,
            footerOrder: 1,
            navOrder: 0,
            createdBy: admin.id,
            updatedBy: admin.id,
          },
          {
            slug: 'faq',
            titleEn: 'FAQ',
            titleAr: 'الأسئلة الشائعة',
            bodyEn:
              '# FAQ\n\n### 1. What are the delivery times?\nDelivery takes between 3 to 5 business days.\n\n### 2. Can I pay cash on delivery?\nYes, Cash on Delivery (COD) is supported across Egypt.',
            bodyAr:
              '# الأسئلة الشائعة\n\n### 1. ما هي مدة التوصيل؟\nيستغرق التوصيل بين 3 إلى 5 أيام عمل.',
            status: PageStatus.PUBLISHED,
            footerOrder: 2,
            navOrder: 0,
            createdBy: admin.id,
            updatedBy: admin.id,
          },
          {
            slug: 'terms',
            titleEn: 'Terms & Conditions',
            titleAr: 'الشروط والأحكام',
            bodyEn:
              '# Terms & Conditions\n\nWelcome to Brandy. By accessing our platform, you agree to our terms of service and usage policies.',
            bodyAr:
              '# الشروط والأحكام\n\nأهلاً بكم في براندي. باستخدامكم لمنصتنا، فإنكم توافقون على شروط الخدمة.',
            status: PageStatus.PUBLISHED,
            footerOrder: 3,
            navOrder: 0,
            createdBy: admin.id,
            updatedBy: admin.id,
          },
          {
            slug: 'returns',
            titleEn: 'Returns Policy',
            titleAr: 'سياسة الاسترجاع',
            bodyEn:
              '# Returns Policy\n\nYou can return any unused item in its original packaging within 14 days of receipt. Contact support to initiate a return.',
            bodyAr:
              '# سياسة الاسترجاع\n\nيمكنكم استرجاع المنتجات غير المستخدمة في تغليفها الأصلي خلال 14 يوماً من الاستلام.',
            status: PageStatus.PUBLISHED,
            footerOrder: 4,
            navOrder: 0,
            createdBy: admin.id,
            updatedBy: admin.id,
          },
        ],
      });
    } catch (e) {
      console.error('Failed to seed default pages:', e);
    }
  }

  // Always ensure legal pages exist (idempotent — skipDuplicates ignores existing slugs)
  try {
    await prisma.page.createMany({
      skipDuplicates: true,
      data: [
        {
          slug: 'legal-privacy-policy',
          titleEn: 'Privacy Policy (PDPL)',
          titleAr: 'سياسة الخصوصية',
          bodyEn:
            "# Privacy Policy (PDPL)\n\n## Data Controller\n\n**Brandy Egypt** operates this marketplace and is responsible for your personal data under Egypt's Personal Data Protection Law (Law No. 151 of 2020).\n\n## What We Collect\n\n- Account information: name, email, phone, delivery addresses\n- Transaction data: order history, payment references (no card numbers stored)\n- Device & usage data: IP address, browser, pages visited\n\n## How We Use Your Data\n\n- Fulfil and track orders\n- Send transactional emails (order confirmations, shipping updates)\n- Improve the platform via aggregated analytics\n- Comply with legal obligations\n\n## Your Rights\n\nYou may request access, correction, deletion, or portability of your data at any time by emailing **privacy@brandy.eg**.\n\n## Data Retention\n\nAccount data is retained for 5 years after your last transaction, or until you request deletion.\n\n## Cookies\n\nWe use essential cookies for authentication and a CSRF security cookie. Analytics cookies are opt-in via the cookie consent banner.",
          bodyAr:
            '# سياسة الخصوصية (PDPL)\n\n## المتحكم في البيانات\n\nتتولى **براندي مصر** تشغيل هذه المنصة وهي المسؤولة عن بياناتك الشخصية وفقاً لقانون حماية البيانات الشخصية المصري (قانون رقم 151 لسنة 2020).\n\n## ما نجمعه\n\n- معلومات الحساب: الاسم، البريد الإلكتروني، رقم الهاتف، عناوين التوصيل\n- بيانات المعاملات: سجل الطلبات، مراجع الدفع\n- بيانات الجهاز والاستخدام\n\n## حقوقك\n\nيمكنك طلب الوصول أو التصحيح أو الحذف أو نقل بياناتك في أي وقت عبر **privacy@brandy.eg**.',
          status: PageStatus.PUBLISHED,
          footerOrder: 10,
          navOrder: 0,
          createdBy: admin.id,
          updatedBy: admin.id,
        },
        {
          slug: 'legal-returns-refunds',
          titleEn: 'Returns & Refunds Policy',
          titleAr: 'سياسة الاسترجاع والاسترداد',
          bodyEn:
            '# Returns & Refunds Policy\n\n## 14-Day Return Window\n\nYou may return any unused, unopened item in its original packaging within **14 days** of delivery.\n\n## How to Initiate a Return\n\n1. Log in and go to Dashboard → Orders\n2. Click "Request Return" on the relevant order\n3. Select the items and reason\n4. Print the prepaid return label and drop off at any courier point\n\n## Refund Timeline\n\n- Card payments: refunded within 5–7 business days\n- Cash on Delivery: wallet credit issued within 2 business days\n\n## Non-Returnable Items\n\n- Personalised or custom-made products\n- Perishable goods\n- Items marked "Final Sale"\n- Digital products after download\n\n## Damaged or Incorrect Items\n\nContact support within 48 hours of receipt with photos. We will arrange a replacement or full refund at no cost.',
          bodyAr:
            '# سياسة الاسترجاع والاسترداد\n\n## نافذة استرجاع 14 يوماً\n\nيمكنك إرجاع أي منتج غير مستخدم في عبوته الأصلية خلال **14 يوماً** من تاريخ التسليم.\n\n## كيفية بدء الإرجاع\n\n1. سجّل دخولك وانتقل إلى لوحة التحكم → الطلبات\n2. اضغط "طلب استرجاع" على الطلب المعني\n3. اختر العناصر والسبب\n\n## مدة الاسترداد\n\n- بطاقات الدفع: خلال 5-7 أيام عمل\n- الدفع عند الاستلام: رصيد محفظة خلال يومي عمل',
          status: PageStatus.PUBLISHED,
          footerOrder: 11,
          navOrder: 0,
          createdBy: admin.id,
          updatedBy: admin.id,
        },
        {
          slug: 'legal-seller-terms',
          titleEn: 'Seller Terms & Conditions',
          titleAr: 'شروط وأحكام البائع',
          bodyEn:
            '# Seller Terms & Conditions\n\n## Eligibility\n\nTo sell on Brandy you must be a registered Egyptian business or an individual with a valid national ID. Accounts are subject to admin approval before you can publish listings.\n\n## Listing Rules\n\n- Products must be genuine, accurately described, and not counterfeit\n- Prices must include VAT where applicable\n- Images must be your own or properly licensed\n- Prohibited categories: weapons, tobacco, adult content, live animals\n\n## Commission & Fees\n\nBrandy charges a **platform commission** on each completed sale. The exact rate is displayed in your Seller Hub under Finance.\n\n## Escrow & Payouts\n\nFunds are held in escrow for **14 days** after confirmed delivery to protect buyers. After the escrow window, earnings are released to your payout balance.\n\n## Intellectual Property\n\nYou retain ownership of your product images. By listing on Brandy you grant us a non-exclusive licence to display your images on the platform and in marketing.\n\n## Violations\n\nViolation of these terms may result in listing removal, account suspension, or permanent ban.',
          bodyAr:
            '# شروط وأحكام البائع\n\n## الأهلية\n\nللبيع على براندي يجب أن تكون شركة مصرية مسجلة أو فرداً لديه بطاقة هوية وطنية سارية. تخضع الحسابات لموافقة المشرف قبل نشر القوائم.\n\n## قواعد القوائم\n\n- يجب أن تكون المنتجات أصلية وموصوفة بدقة وغير مقلدة\n- يجب أن تتضمن الأسعار ضريبة القيمة المضافة عند الاقتضاء\n\n## الضمان الأمين والمدفوعات\n\nتُحجز الأموال في الضمان لمدة **14 يوماً** بعد التسليم المؤكد لحماية المشترين.',
          status: PageStatus.PUBLISHED,
          footerOrder: 12,
          navOrder: 0,
          createdBy: admin.id,
          updatedBy: admin.id,
        },
        {
          slug: 'legal-shipping-policy',
          titleEn: 'Shipping Policy',
          titleAr: 'سياسة الشحن',
          bodyEn:
            '# Shipping Policy\n\n## Coverage\n\nWe ship to all 27 governorates across Egypt.\n\n## Delivery Times\n\n| Destination | Standard | Express |\n|---|---|---|\n| Cairo & Giza | 1–2 days | Same day |\n| Alexandria | 2–3 days | Next day |\n| Other governorates | 3–5 days | 2–3 days |\n\n## Shipping Fees\n\nShipping fees are calculated at checkout based on your governorate. Free shipping is available on orders above a threshold set by each seller.\n\n## Order Tracking\n\nYou will receive an SMS and email with a tracking number once your order is dispatched. Track your shipment under Dashboard → Orders.\n\n## Missed Deliveries\n\nIf you are unavailable at the delivery address, the courier will attempt re-delivery twice before returning the package to the seller.\n\n## International Shipping\n\nWe currently ship within Egypt only.',
          bodyAr:
            '# سياسة الشحن\n\n## التغطية\n\nنشحن إلى جميع محافظات مصر الـ27.\n\n## مواعيد التسليم\n\n| الوجهة | عادي | سريع |\n|---|---|---|\n| القاهرة والجيزة | 1-2 أيام | نفس اليوم |\n| الإسكندرية | 2-3 أيام | اليوم التالي |\n| المحافظات الأخرى | 3-5 أيام | 2-3 أيام |\n\n## رسوم الشحن\n\nتُحسب رسوم الشحن عند الدفع بناءً على محافظتك.',
          status: PageStatus.PUBLISHED,
          footerOrder: 13,
          navOrder: 0,
          createdBy: admin.id,
          updatedBy: admin.id,
        },
      ],
    });
  } catch (e) {
    console.error('Failed to seed legal pages:', e);
  }

  const pages = await prisma.page.findMany({
    where: status ? { status } : undefined,
    orderBy: { updatedAt: 'desc' },
  });
  return NextResponse.json({ pages });
}

// ── POST ───────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || !body.slug || !body.titleEn || !body.bodyEn) {
    return NextResponse.json({ message: 'slug, titleEn and bodyEn are required' }, { status: 400 });
  }

  // Slug must be URL-safe.
  if (!/^[a-z0-9](?:[a-z0-9-]{0,80}[a-z0-9])?$/.test(body.slug)) {
    return NextResponse.json(
      { message: 'slug must be URL-safe (a-z, 0-9, hyphens, max 82 chars)' },
      { status: 400 }
    );
  }

  try {
    const page = await prisma.page.create({
      data: {
        slug: body.slug,
        titleEn: body.titleEn,
        titleAr: body.titleAr || null,
        bodyEn: body.bodyEn,
        bodyAr: body.bodyAr || null,
        seoTitle: body.seoTitle || null,
        seoDescription: body.seoDescription || null,
        ogImageUrl: body.ogImageUrl || null,
        status: (body.status as PageStatus) || PageStatus.DRAFT,
        footerOrder: body.footerOrder ?? 0,
        navOrder: body.navOrder ?? 0,
        createdBy: admin.id,
        updatedBy: admin.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'PAGE_CREATED',
        targetId: page.id,
        details: JSON.stringify({ slug: page.slug, title: page.titleEn }),
      },
    });

    return NextResponse.json({ page });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e?.code === 'P2002') {
      return NextResponse.json(
        { message: 'A page with that slug already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json({ message: e?.message || 'Create failed' }, { status: 500 });
  }
}

// ── PATCH ──────────────────────────────────────────────────────────────────
export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ message: 'id is required' }, { status: 400 });

  // Build the update set explicitly so we can't accidentally let the
  // caller smuggle in fields like createdBy or createdAt.
  const data: Record<string, unknown> = { updatedBy: admin.id };
  for (const key of [
    'titleEn',
    'titleAr',
    'bodyEn',
    'bodyAr',
    'seoTitle',
    'seoDescription',
    'ogImageUrl',
    'status',
    'footerOrder',
    'navOrder',
    'slug',
  ] as const) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  try {
    const page = await prisma.page.update({ where: { id: body.id }, data });

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'PAGE_UPDATED',
        targetId: page.id,
        details: JSON.stringify({ slug: page.slug, fields: Object.keys(data) }),
      },
    });

    return NextResponse.json({ page });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e?.code === 'P2025')
      return NextResponse.json({ message: 'Page not found' }, { status: 404 });
    if (e?.code === 'P2002')
      return NextResponse.json({ message: 'Slug already in use' }, { status: 409 });
    return NextResponse.json({ message: e?.message || 'Update failed' }, { status: 500 });
  }
}

// ── DELETE (soft-archive) ──────────────────────────────────────────────────
export async function DELETE(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ message: 'id is required' }, { status: 400 });

  try {
    const page = await prisma.page.update({
      where: { id },
      data: { status: PageStatus.ARCHIVED, updatedBy: admin.id },
    });

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'PAGE_ARCHIVED',
        targetId: page.id,
        details: JSON.stringify({ slug: page.slug }),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e?.code === 'P2025')
      return NextResponse.json({ message: 'Page not found' }, { status: 404 });
    return NextResponse.json({ message: e?.message || 'Archive failed' }, { status: 500 });
  }
}
