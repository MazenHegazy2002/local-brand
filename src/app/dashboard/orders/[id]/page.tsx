import Navbar from '@/components/Navbar';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';

export default async function OrderTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  // Language detection (mirrors root layout)
  const cookieStore = await cookies();
  const googTrans = cookieStore.get('googtrans')?.value;
  const isAr = googTrans ? googTrans.includes('/ar') : false;

  // i18n helper for this page
  const t = (en: string, ar: string) => (isAr ? ar : en);
  const locale = isAr ? 'ar-EG' : 'en-EG';
  const currency = isAr ? 'ج.م' : 'EGP';

  const order = await prisma.order.findUnique({
    where: { id, userId: session.user.id },
    include: {
      items: {
        include: {
          variant: {
            include: { product: { include: { images: true } } },
          },
        },
      },
      shipments: true,
    },
  });

  if (!order) {
    return (
      <main className="min-h-screen bg-[#f9f8f6] font-[Cairo,system-ui,sans-serif]">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-black text-slate-900 mb-3">
            {t('Order Not Found', 'الطلب غير موجود')}
          </h1>
          <p className="text-slate-600 mb-6">
            {t("We couldn't find an order with this ID.", 'لم نتمكن من العثور على هذا الطلب.')}
          </p>
          <Link
            href="/dashboard"
            className="inline-block bg-[#1e3b8a] text-white font-bold py-3 px-6 rounded-xl hover:bg-[#16307a] transition-colors"
          >
            {t('Return to Dashboard', 'العودة إلى لوحة التحكم')}
          </Link>
        </div>
      </main>
    );
  }

  const steps = ['PENDING_PAYMENT', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
  const stepLabels: Record<string, string> = {
    PENDING_PAYMENT: t('Awaiting Payment', 'في انتظار الدفع'),
    CONFIRMED: t('Confirmed', 'تم التأكيد'),
    PROCESSING: t('Processing', 'قيد التجهيز'),
    SHIPPED: t('Shipped', 'تم الشحن'),
    DELIVERED: t('Delivered', 'تم التوصيل'),
  };
  const currentStepIndex = steps.indexOf(order.status);

  // Parse shipping address snapshot for display
  let shippingAddress: {
    fullName?: string;
    phone?: string;
    street?: string;
    city?: string;
    governorate?: string;
  } | null = null;
  try {
    if (order.shippingAddressSnapshot) {
      shippingAddress = JSON.parse(order.shippingAddressSnapshot);
    }
  } catch {
    /* ignore */
  }

  return (
    <main
      className="min-h-screen bg-[#f9f8f6]"
      style={{ fontFamily: 'Cairo, system-ui, -apple-system, sans-serif' }}
      dir={isAr ? 'rtl' : 'ltr'}
      lang={isAr ? 'ar' : 'en'}
    >
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Link
          href="/dashboard"
          className="text-slate-500 hover:text-[#1e3b8a] text-sm font-semibold mb-6 inline-flex items-center gap-1 transition-colors"
        >
          <span aria-hidden>{isAr ? '→' : '←'}</span>{' '}
          {t('Back to Dashboard', 'العودة إلى لوحة التحكم')}
        </Link>

        {/* ── Order Header ──────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
            <div>
              <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">
                {t('Order', 'طلب')}
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900">
                #{order.id.split('-')[0].toUpperCase()}
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                {t('Placed on', 'بتاريخ')}{' '}
                <span className="font-semibold text-slate-700">
                  {new Date(order.createdAt).toLocaleDateString(locale, {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </p>
            </div>
            <div className={isAr ? 'md:text-left' : 'md:text-right'}>
              <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">
                {t('Total', 'الإجمالي')}
              </div>
              <p className="text-2xl md:text-3xl font-black text-[#1e3b8a]">
                {order.totalAmount.toLocaleString()}{' '}
                <span className="text-base font-bold text-slate-400">{currency}</span>
              </p>
              <span
                className={`inline-block mt-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  order.paymentStatus === 'PAID'
                    ? 'bg-emerald-50 text-emerald-700'
                    : order.paymentStatus === 'FAILED' || order.paymentStatus === 'REFUNDED'
                      ? 'bg-red-50 text-red-700'
                      : 'bg-amber-50 text-amber-700'
                }`}
              >
                {order.paymentStatus} · {order.paymentMethod?.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* ── Tracking Timeline ─────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 mb-6">
          <h2 className="text-lg font-black text-slate-900 mb-6">
            {t('Tracking Status', 'حالة الطلب')}
          </h2>

          <div className="relative">
            {/* Desktop horizontal track */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 rounded-full hidden md:block"></div>
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-emerald-500 rounded-full transition-all duration-500 hidden md:block"
              style={{ width: `${Math.max(0, currentStepIndex) * 25}%` }}
            ></div>
            {/* Mobile vertical track */}
            <div className="absolute left-4 top-4 w-1 h-[calc(100%-2rem)] bg-slate-100 rounded-full md:hidden"></div>
            <div
              className="absolute left-4 top-4 w-1 bg-emerald-500 rounded-full transition-all duration-500 md:hidden"
              style={{
                height: `${Math.max(0, currentStepIndex) * 25}%`,
              }}
            ></div>

            <div className="relative flex flex-col md:flex-row md:justify-between gap-6 md:gap-4">
              {steps.map((step, index) => {
                const isActive = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                return (
                  <div key={step} className="flex flex-row md:flex-col items-center gap-4 md:gap-0">
                    <div
                      className={`relative w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shrink-0 z-10 ring-4 ring-white transition-all ${
                        isActive
                          ? isCurrent
                            ? 'bg-[#1e3b8a] text-white shadow-lg shadow-[#1e3b8a]/30 scale-110'
                            : 'bg-emerald-500 text-white'
                          : 'bg-slate-200 text-slate-400'
                      }`}
                    >
                      {isActive ? '✓' : index + 1}
                    </div>
                    <span
                      className={`md:mt-3 text-xs md:text-center ${
                        isCurrent
                          ? 'text-[#1e3b8a] font-black'
                          : isActive
                            ? 'text-slate-700 font-bold'
                            : 'text-slate-400 font-semibold'
                      }`}
                    >
                      {stepLabels[step]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {order.shipments.length > 0 && (
            <div className="mt-8 pt-6 border-t border-slate-100">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                {t('Shipment Details', 'تفاصيل الشحنة')}
              </h3>
              {order.shipments.map(shipment => (
                <div key={shipment.id} className="flex flex-wrap gap-3">
                  <div className="bg-slate-50 px-4 py-3 rounded-xl flex-1 min-w-[180px]">
                    <span className="block text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">
                      {t('Courier', 'شركة الشحن')}
                    </span>
                    <span className="text-slate-900 font-bold">
                      {shipment.courier || t('Standard Shipping', 'شحن عادي')}
                    </span>
                  </div>
                  <div className="bg-slate-50 px-4 py-3 rounded-xl flex-1 min-w-[180px]">
                    <span className="block text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">
                      {t('Tracking Number', 'رقم التتبع')}
                    </span>
                    <span className="text-[#1e3b8a] font-bold tracking-wider font-mono text-sm">
                      {shipment.trackingNumber || t('Pending', 'في الانتظار')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Shipping Address ──────────────────────────────────────── */}
        {shippingAddress && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 mb-6">
            <h2 className="text-lg font-black text-slate-900 mb-4">
              {t('Shipping To', 'عنوان التوصيل')}
            </h2>
            <div className="text-sm text-slate-700">
              <div className="font-bold text-slate-900 text-base">{shippingAddress.fullName}</div>
              {shippingAddress.phone && (
                <div className="text-slate-500">{shippingAddress.phone}</div>
              )}
              <div className="mt-2 leading-relaxed">
                {shippingAddress.street}
                <br />
                {shippingAddress.city}
                {shippingAddress.governorate && `, ${shippingAddress.governorate}`}
              </div>
            </div>
          </div>
        )}

        {/* ── Order Items ──────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8">
          <h2 className="text-lg font-black text-slate-900 mb-6">
            {t('Items in this Order', 'منتجات الطلب')}
            <span className="ms-2 text-sm font-bold text-slate-400">({order.items.length})</span>
          </h2>
          <div className="space-y-4">
            {order.items.map(item => {
              const product = item.variant.product;
              const primaryImage =
                product.images.find(img => img.isPrimary)?.url ||
                product.images[0]?.url ||
                '/placeholder.png';

              // Parse variant attributes (color, size, etc.) — Task 11 carryover
              let attrs: Record<string, string> | null = null;
              try {
                if (item.variant.attributes) attrs = JSON.parse(item.variant.attributes);
              } catch {
                /* ignore */
              }

              return (
                <div
                  key={item.id}
                  className="border border-slate-100 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-start hover:border-slate-200 transition-colors"
                >
                  <div className="w-24 h-24 relative rounded-xl overflow-hidden bg-slate-50 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={primaryImage}
                      alt={item.productTitleSnapshot}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <div className="flex-grow min-w-0">
                    <h3 className="text-base font-bold text-slate-900 mb-1">
                      {item.productTitleSnapshot}
                    </h3>
                    <p className="text-slate-500 text-xs mb-2">
                      {t('Sold by', 'بائع')}{' '}
                      <span className="font-semibold text-slate-700">
                        {item.sellerNameSnapshot}
                      </span>
                    </p>
                    {item.variant?.title && item.variant.title !== item.productTitleSnapshot && (
                      <p className="text-xs text-[#1e3b8a] font-semibold mb-2">
                        {t('Variant:', 'النوع:')} {item.variant.title}
                      </p>
                    )}
                    {attrs && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {attrs.color && (
                          <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-1 rounded-full font-bold">
                            {t('Color:', 'اللون:')} {attrs.color}
                          </span>
                        )}
                        {(attrs.size || attrs.sizes) && (
                          <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-1 rounded-full font-bold">
                            {t('Size:', 'المقاس:')} {attrs.size || attrs.sizes}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-3 text-sm">
                      <span className="text-slate-600">
                        {t('Qty:', 'الكمية:')}{' '}
                        <span className="font-bold text-slate-900">{item.quantity}</span>
                      </span>
                      <span className="text-slate-600">
                        {t('Price:', 'السعر:')}{' '}
                        <span className="font-bold text-slate-900">
                          {item.priceAtPurchase.toLocaleString()} {currency}
                        </span>
                      </span>
                    </div>
                    {(item.variant?.sku || item.variant?.upc) && (
                      <div className="mt-1.5 text-[10px] text-slate-400 font-mono">
                        {item.variant.sku && <span>SKU: {item.variant.sku}</span>}
                        {item.variant.sku && item.variant.upc && <span className="mx-2">·</span>}
                        {item.variant.upc && <span>UPC: {item.variant.upc}</span>}
                      </div>
                    )}
                  </div>
                  <div className="sm:text-right shrink-0">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        item.status === 'DELIVERED'
                          ? 'bg-emerald-50 text-emerald-700'
                          : item.status === 'SHIPPED'
                            ? 'bg-blue-50 text-blue-700'
                            : item.status === 'CONFIRMED'
                              ? 'bg-indigo-50 text-indigo-700'
                              : item.status === 'CANCELLED' || item.status === 'RETURNED'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {item.status === 'CONFIRMED'
                        ? t('Ready', 'جاهز')
                        : item.status === 'DELIVERED'
                          ? t('Delivered', 'تم التوصيل')
                          : item.status === 'SHIPPED'
                            ? t('Shipped', 'تم الشحن')
                            : item.status === 'CANCELLED'
                              ? t('Cancelled', 'ملغي')
                              : item.status === 'RETURNED'
                                ? t('Returned', 'مُعاد')
                                : item.status.replace(/_/g, ' ')}
                    </span>
                    <div className="mt-2 text-base font-black text-slate-900">
                      {(item.priceAtPurchase * item.quantity).toLocaleString()} {currency}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Order totals breakdown */}
          {(() => {
            const subtotal = order.items.reduce(
              (sum, i) => sum + i.priceAtPurchase * i.quantity,
              0
            );
            return (
              <div className="mt-6 pt-6 border-t border-slate-100 space-y-1.5 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>{t('Subtotal', 'المجموع الفرعي')}</span>
                  <span className="font-semibold text-slate-900">
                    {subtotal.toLocaleString()} {currency}
                  </span>
                </div>
                {order.shippingFee > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>{t('Shipping', 'الشحن')}</span>
                    <span className="font-semibold text-slate-900">
                      {order.shippingFee.toLocaleString()} {currency}
                    </span>
                  </div>
                )}
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>{t('Discount', 'الخصم')}</span>
                    <span className="font-semibold">
                      −{order.discountAmount.toLocaleString()} {currency}
                    </span>
                  </div>
                )}
                {order.giftWrapping && (
                  <div className="flex justify-between text-slate-600">
                    <span>{t('Gift wrapping', 'تغليف هدية')}</span>
                    <span className="font-semibold text-slate-900">25 {currency}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg pt-3 mt-2 border-t border-slate-100">
                  <span className="font-bold text-slate-900">{t('Total', 'الإجمالي')}</span>
                  <span className="font-black text-[#1e3b8a]">
                    {order.totalAmount.toLocaleString()} {currency}
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </main>
  );
}
