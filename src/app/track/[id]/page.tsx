'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

interface OrderItem {
  id: string;
  productTitleSnapshot: string;
  priceAtPurchase: number;
  quantity: number;
  status: string;
  selectedSize?: string | null;
  selectedColor?: string | null;
  variant?: {
    title: string;
    product?: {
      images?: { url: string }[];
    };
  };
}

interface Order {
  id: string;
  status: string;
  totalAmount: number;
  shippingFee: number;
  discountAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  shippingAddressSnapshot: string;
  items: OrderItem[];
}

const STATUS_STEPS = [
  { key: 'PENDING_PAYMENT', label: 'Order Placed', icon: '📋' },
  { key: 'CONFIRMED', label: 'Confirmed', icon: '✔️' },
  { key: 'PROCESSING', label: 'Processing', icon: '📦' },
  { key: 'SHIPPED', label: 'Shipped', icon: '🚚' },
  { key: 'DELIVERED', label: 'Delivered', icon: '🏠' },
];

export default function TrackOrderPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orderId = params.id as string;
  const email = searchParams.get('email');

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchEmail, setSearchEmail] = useState(email || '');
  const [searchOrderId, setSearchOrderId] = useState(orderId || '');

  useEffect(() => {
    if (orderId && email) {
      fetchOrder(orderId, email);
    } else {
      // We landed on /track/<id> without an email param (e.g. from the order
      // confirmation page). Stop the spinner so the email-entry form renders.
      setLoading(false);
    }
  }, [orderId, email]);

  const fetchOrder = async (oid: string, em: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${oid}/track?email=${encodeURIComponent(em)}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Order not found');
      }
      const data = await res.json();
      setOrder(data.order);
    } catch (error: unknown) {
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const oid = (searchOrderId || orderId || '').trim();
    const em = searchEmail.trim();
    if (!oid || !em) {
      setError('Please enter both order ID and email');
      return;
    }
    fetchOrder(oid, em);
  };

  const getCurrentStepIndex = () => {
    if (!order) return 0;
    const idx = STATUS_STEPS.findIndex(s => s.key === order.status);
    return idx >= 0 ? idx : 0;
  };

  const address = order?.shippingAddressSnapshot ? JSON.parse(order.shippingAddressSnapshot) : null;

  return (
    <main className="min-h-screen bg-[#f9f8f6]">
      <Navbar />

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-black text-gray-900 mb-8">Track Your Order</h1>

        {/* Search Form — shown until we successfully load an order. When the
            URL already includes an order ID we just ask for the email. */}
        {!order && !loading && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mb-8">
            <p className="text-sm text-gray-500 mb-4">
              {orderId
                ? 'Enter the email you used at checkout to view this order.'
                : 'Enter your order ID and the email you used at checkout.'}
            </p>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Order ID</label>
                  <input
                    type="text"
                    value={searchOrderId}
                    onChange={e => setSearchOrderId(e.target.value)}
                    placeholder="e.g., abc12345-6789-..."
                    readOnly={Boolean(orderId)}
                    className={`w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#1e3b8a] outline-none ${
                      orderId ? 'bg-gray-50 text-gray-500' : ''
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={searchEmail}
                    onChange={e => setSearchEmail(e.target.value)}
                    placeholder="your@email.com"
                    autoFocus={Boolean(orderId)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#1e3b8a] outline-none"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-[#1e3b8a] text-white font-bold py-3 rounded-lg hover:bg-[#152c6e] transition-colors"
              >
                Track Order
              </button>
            </form>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 mb-6">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-[#1e3b8a] border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-500">Loading order details...</p>
          </div>
        )}

        {/* Order Details */}
        {order && !loading && (
          <div className="space-y-6">
            {/* Order Header */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Order ID</div>
                  <div className="text-xl font-bold text-gray-900">{order.id}</div>
                </div>
                <div className="text-right">
                  <span
                    className={`px-4 py-2 rounded-full text-sm font-bold ${
                      order.status === 'DELIVERED'
                        ? 'bg-green-100 text-green-800'
                        : order.status === 'SHIPPED'
                          ? 'bg-blue-100 text-blue-800'
                          : order.status === 'CANCELLED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {order.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
              <div className="text-gray-600 text-sm">
                Placed on {new Date(order.createdAt).toLocaleDateString()} •{' '}
                {order.paymentMethod.replace(/_/g, ' ')}
              </div>
            </div>

            {/* Tracking Progress */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-6">Order Progress</h2>
              <div className="flex items-center justify-between">
                {STATUS_STEPS.map((step, idx) => {
                  const isCompleted = idx <= getCurrentStepIndex();
                  const isCurrent = idx === getCurrentStepIndex();
                  return (
                    <div key={step.key} className="flex flex-col items-center flex-1 relative">
                      {idx > 0 && (
                        <div
                          className={`absolute top-5 -left-1/2 w-full h-1 ${isCompleted ? 'bg-[#1e3b8a]' : 'bg-gray-200'}`}
                        />
                      )}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-lg mb-2 ${
                          isCompleted ? 'bg-[#1e3b8a] text-white' : 'bg-gray-200 text-gray-400'
                        } ${isCurrent ? 'ring-4 ring-[#1e3b8a]/20' : ''}`}
                      >
                        {step.icon}
                      </div>
                      <div
                        className={`text-xs font-medium text-center ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}
                      >
                        {step.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Shipping Address */}
            {address && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Shipping Address</h2>
                <div className="text-gray-600">
                  <p>{address.street}</p>
                  <p>
                    {address.city}, {address.governorate}
                  </p>
                  <p>Egypt</p>
                </div>
              </div>
            )}

            {/* Order Items */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Order Items</h2>
              <div className="space-y-4">
                {order.items.map(item => (
                  <div
                    key={item.id}
                    className="flex gap-4 py-4 border-b border-gray-100 last:border-0"
                  >
                    <div className="w-16 h-16 bg-gray-50 rounded-lg overflow-hidden shrink-0">
                      {item.variant?.product?.images?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.variant.product.images[0].url}
                          alt={item.productTitleSnapshot}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">
                          📦
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{item.productTitleSnapshot}</div>
                      <div className="text-sm text-gray-500">
                        Qty: {item.quantity}
                        {item.selectedColor && ` • Color: ${item.selectedColor}`}
                        {item.selectedSize && ` • Size: ${item.selectedSize}`}
                        {!item.selectedColor &&
                          !item.selectedSize &&
                          item.variant?.title &&
                          ` • Variant: ${item.variant.title}`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">
                        {(item.priceAtPurchase * item.quantity).toLocaleString()} EGP
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${item.status === 'DELIVERED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
                      >
                        {item.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">
                    {(
                      order.totalAmount -
                      order.shippingFee -
                      (order.discountAmount || 0)
                    ).toLocaleString()}{' '}
                    EGP
                  </span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-{order.discountAmount.toLocaleString()} EGP</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">{order.shippingFee.toLocaleString()} EGP</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-100">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="font-bold text-xl text-[#1e3b8a]">
                    {order.totalAmount.toLocaleString()} EGP
                  </span>
                </div>
              </div>
            </div>

            {/* Help */}
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
              <h3 className="font-bold text-gray-900 mb-2">Need Help?</h3>
              <p className="text-sm text-gray-600 mb-4">
                Contact our support team if you have any questions about your order.
              </p>
              <Link href="/help" className="text-[#1e3b8a] font-medium hover:underline">
                Contact Support →
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
