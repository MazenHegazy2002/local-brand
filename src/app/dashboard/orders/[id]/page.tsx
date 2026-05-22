import Navbar from '@/components/Navbar';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function OrderTrackingPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const order = await prisma.order.findUnique({
    where: { id: params.id, userId: session.user.id },
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
      <main className="min-h-screen bg-[hsl(var(--background))]">
        <Navbar />
        <div className="container py-12 text-center text-white">
          <h1 className="text-4xl font-serif mb-4">Order Not Found</h1>
          <p>We couldn&apos;t find an order with this ID.</p>
          <Link href="/dashboard" className="btn btn-accent mt-6">
            Return to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  const steps = ['PENDING_PAYMENT', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
  const currentStepIndex = steps.indexOf(order.status);

  return (
    <main className="min-h-screen bg-[hsl(var(--background))]">
      <Navbar />

      <div className="container py-12">
        <Link href="/dashboard" className="text-white/40 hover:text-white mb-8 inline-block">
          &larr; Back to Dashboard
        </Link>

        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-4xl font-serif font-bold text-white mb-2">
              Order <span className="text-[hsl(var(--accent))]">#{order.id.split('-')[0]}</span>
            </h1>
            <p className="text-white/40 text-sm tracking-widest uppercase font-bold">
              Placed on {new Date(order.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-serif text-white">
              {order.totalAmount.toLocaleString()} EGP
            </p>
            <p className="text-[hsl(var(--accent))] text-sm font-bold uppercase tracking-widest">
              {order.paymentStatus}
            </p>
          </div>
        </div>

        {/* Tracking Timeline */}
        <div className="glass p-8 rounded-3xl border border-white/5 mb-8">
          <h2 className="text-xl font-serif font-bold text-white mb-8">Tracking Status</h2>

          <div className="relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-white/10 rounded-full hidden md:block"></div>
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-[hsl(var(--accent))] rounded-full transition-all duration-500 hidden md:block"
              style={{ width: `${Math.max(0, currentStepIndex) * 25}%` }}
            ></div>

            <div className="relative flex flex-col md:flex-row justify-between gap-4">
              {steps.map((step, index) => {
                const isActive = index <= currentStepIndex;
                return (
                  <div key={step} className="flex flex-row md:flex-col items-center gap-4 md:gap-0">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center border-4 border-[hsl(var(--background))] z-10 ${isActive ? 'bg-[hsl(var(--accent))] text-[hsl(var(--background))]' : 'bg-white/20 text-transparent'}`}
                    >
                      {isActive && '✓'}
                    </div>
                    <span
                      className={`md:mt-4 text-xs font-bold tracking-widest uppercase ${isActive ? 'text-white' : 'text-white/40'}`}
                    >
                      {step.replace('_', ' ')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {order.shipments.length > 0 && (
            <div className="mt-8 pt-8 border-t border-white/5">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">
                Shipment Details
              </h3>
              {order.shipments.map(shipment => (
                <div key={shipment.id} className="flex gap-4 items-center">
                  <div className="bg-white/5 p-4 rounded-xl">
                    <span className="block text-white/40 text-xs mb-1">Courier</span>
                    <span className="text-white font-bold">
                      {shipment.courier || 'Standard Shipping'}
                    </span>
                  </div>
                  <div className="bg-white/5 p-4 rounded-xl">
                    <span className="block text-white/40 text-xs mb-1">Tracking Number</span>
                    <span className="text-[hsl(var(--accent))] font-bold tracking-widest">
                      {shipment.trackingNumber || 'Pending'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Order Items */}
        <h2 className="text-xl font-serif font-bold text-white mb-6">Items in this order</h2>
        <div className="grid gap-4">
          {order.items.map(item => {
            const product = item.variant.product;
            const primaryImage =
              product.images.find(img => img.isPrimary)?.url ||
              product.images[0]?.url ||
              '/placeholder.png';

            return (
              <div
                key={item.id}
                className="glass p-6 rounded-2xl border border-white/5 flex gap-6 items-center"
              >
                <div className="w-24 h-24 relative rounded-xl overflow-hidden bg-white/5 hidden sm:block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={primaryImage}
                    alt={item.productTitleSnapshot}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div className="flex-grow">
                  <h3 className="text-lg font-bold text-white mb-1">{item.productTitleSnapshot}</h3>
                  <p className="text-white/40 text-sm mb-2">Sold by: {item.sellerNameSnapshot}</p>
                  <div className="flex gap-4 flex-wrap">
                    <span className="text-white/60 text-sm">Qty: {item.quantity}</span>
                    <span className="text-white/60 text-sm">
                      Price: {item.priceAtPurchase.toLocaleString()} EGP
                    </span>
                  </div>
                  {(item.variant?.sku || item.variant?.upc) && (
                    <div className="mt-2 text-[11px] text-white/40 font-mono">
                      {item.variant.sku && <span>SKU: {item.variant.sku}</span>}
                      {item.variant.sku && item.variant.upc && <span className="mx-2">·</span>}
                      {item.variant.upc && <span>UPC: {item.variant.upc}</span>}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                      item.status === 'DELIVERED'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : item.status === 'CANCELLED'
                          ? 'bg-red-500/10 text-red-400 border-red-500/20'
                          : 'bg-white/5 text-white/60 border-white/10'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
