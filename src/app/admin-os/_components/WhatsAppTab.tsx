'use client';

import React, { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import { triggerWhatsAppManual, overrideWhatsAppStatus } from '@/app/actions/seller';

interface OrderWhatsAppItem {
  id: string;
  customerName: string;
  phone: string;
  email: string;
  totalAmount: number;
  paymentMethod: string;
  orderStatus: string;
  whatsappConfirmStatus: string;
  whatsappMessageId: string | null;
  whatsappLastSentAt: string | null;
  createdAt: string;
}

interface Stats {
  NOT_SENT: number;
  PENDING_RESPONSE: number;
  CONFIRMED: number;
  CANCELLED: number;
  NO_REPLY: number;
  FAILED: number;
  total: number;
}

export default function WhatsAppTab() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<OrderWhatsAppItem[]>([]);
  const [stats, setStats] = useState<Stats>({
    NOT_SENT: 0,
    PENDING_RESPONSE: 0,
    CONFIRMED: 0,
    CANCELLED: 0,
    NO_REPLY: 0,
    FAILED: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  // Simulator State
  const [simPhone, setSimPhone] = useState('');
  const [simReply, setSimReply] = useState('1'); // "1" = Confirm, "2" = Cancel, or custom text
  const [customReplyText, setCustomReplyText] = useState('');
  const [simulating, setSimulating] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/whatsapp/orders?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load orders');
      const data = await res.json();
      setOrders(data.orders || []);
      setStats(data.stats || stats);
    } catch (e: any) {
      toast({
        variant: 'error',
        title: 'Error',
        description: e.message || 'Failed to fetch WhatsApp order stats.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, search]);

  const handleManualSend = async (orderId: string, phone: string) => {
    if (!phone) {
      toast({
        variant: 'error',
        title: 'Validation Error',
        description: 'Customer phone number is missing or invalid.',
      });
      return;
    }
    setActionBusyId(orderId);
    try {
      const result = await triggerWhatsAppManual(orderId, phone);
      if (result.error) {
        toast({
          variant: 'error',
          title: 'Dispatch Failed',
          description: result.error,
        });
      } else {
        toast({
          variant: 'success',
          title: 'Verification Sent',
          description: 'WhatsApp confirmation message triggered.',
        });
        fetchOrders();
      }
    } catch (err: any) {
      toast({
        variant: 'error',
        title: 'Error',
        description: err.message || 'Failed to trigger message.',
      });
    } finally {
      setActionBusyId(null);
    }
  };

  const handleOverride = async (orderId: string, targetStatus: 'CONFIRMED' | 'CANCELLED') => {
    setActionBusyId(orderId);
    try {
      const result = await overrideWhatsAppStatus(orderId, targetStatus);
      if (result.error) {
        toast({
          variant: 'error',
          title: 'Override Failed',
          description: result.error,
        });
      } else {
        toast({
          variant: 'success',
          title: 'Status Overridden',
          description: `Order successfully marked as ${targetStatus}.`,
        });
        fetchOrders();
      }
    } catch (err: any) {
      toast({
        variant: 'error',
        title: 'Error',
        description: err.message || 'Failed to override status.',
      });
    } finally {
      setActionBusyId(null);
    }
  };

  const selectOrderForSimulation = (item: OrderWhatsAppItem) => {
    setSimPhone(item.phone);
    toast({
      variant: 'info',
      title: 'Order Selected',
      description: `Loaded +${item.phone} into the sandbox simulator.`,
    });
  };

  const handleSimulateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simPhone) {
      toast({
        variant: 'error',
        title: 'Validation Error',
        description: 'Please input or select a sender phone number.',
      });
      return;
    }

    setSimulating(true);
    try {
      const text = simReply === 'custom' ? customReplyText : simReply;
      const payload = {
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    {
                      from: simPhone,
                      text: { body: text },
                      type: 'text',
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const res = await fetch('/api/webhooks/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Simulator route error');
      }

      toast({
        variant: 'success',
        title: 'Simulation Injected',
        description: `Successfully simulated reply "${text}" from +${simPhone}.`,
      });
      fetchOrders();
    } catch (err: any) {
      toast({
        variant: 'error',
        title: 'Simulation Failed',
        description: err.message || 'Webhook post simulation failed.',
      });
    } finally {
      setSimulating(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'CANCELLED':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      case 'PENDING_RESPONSE':
        return 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse';
      case 'FAILED':
        return 'bg-red-50 text-red-700 border border-red-200';
      default:
        return 'bg-slate-50 text-slate-700 border border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">
            WhatsApp Confirmation Bot
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Monitor automated WhatsApp messages, track verification statuses, and simulate replies
            in the sandbox.
          </p>
        </div>
      </div>

      {/* Grid: Main Panel and Simulator Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Pending Reply
              </div>
              <div className="text-2xl font-black text-amber-600 mt-1">
                {stats.PENDING_RESPONSE}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Confirmed
              </div>
              <div className="text-2xl font-black text-emerald-600 mt-1">{stats.CONFIRMED}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Cancelled
              </div>
              <div className="text-2xl font-black text-rose-600 mt-1">{stats.CANCELLED}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Dispatched
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {stats.total - stats.NOT_SENT}
              </div>
            </div>
          </div>

          {/* Table Container Card */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Search & Filter Toolbar */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Search input */}
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search ID, customer, or phone..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-3 pr-10 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
              </div>

              {/* Status pills selector */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: 'all', label: 'All' },
                  { value: 'PENDING_RESPONSE', label: 'Pending' },
                  { value: 'CONFIRMED', label: 'Confirmed' },
                  { value: 'CANCELLED', label: 'Cancelled' },
                  { value: 'NOT_SENT', label: 'Not Sent' },
                  { value: 'FAILED', label: 'Failed' },
                ].map(pill => (
                  <button
                    key={pill.value}
                    onClick={() => setStatusFilter(pill.value)}
                    className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                      statusFilter === pill.value
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-100">
                    <th className="p-4">Order ID / Date</th>
                    <th className="p-4">Customer Info</th>
                    <th className="p-4">Phone</th>
                    <th className="p-4">Bot Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-slate-500 animate-ping"></span>
                          <span>Loading bot status logs...</span>
                        </div>
                      </td>
                    </tr>
                  ) : orders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                        No orders match the filters.
                      </td>
                    </tr>
                  ) : (
                    orders.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        {/* ID / Date */}
                        <td className="p-4">
                          <div className="font-bold text-slate-900">#{item.id.substring(0, 8)}</div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {new Date(item.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>

                        {/* Customer */}
                        <td className="p-4">
                          <div className="font-semibold text-slate-800">{item.customerName}</div>
                          <div className="text-xs text-slate-500">{item.email}</div>
                        </td>

                        {/* Phone */}
                        <td className="p-4 font-mono text-slate-700">
                          {item.phone ? (
                            `+${item.phone}`
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="p-4">
                          <span
                            className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusBadgeClass(item.whatsappConfirmStatus)}`}
                          >
                            {item.whatsappConfirmStatus.replace('_', ' ')}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Load into Simulator Trigger */}
                            {item.whatsappConfirmStatus === 'PENDING_RESPONSE' && (
                              <button
                                onClick={() => selectOrderForSimulation(item)}
                                className="p-1 px-2 text-xs font-semibold text-sky-600 bg-sky-50 border border-sky-100 hover:bg-sky-100 rounded transition-colors"
                                title="Load customer number into simulator sandbox"
                              >
                                Sandbox 🧪
                              </button>
                            )}

                            {/* Resend/Send manually */}
                            <button
                              onClick={() => handleManualSend(item.id, item.phone)}
                              disabled={actionBusyId === item.id}
                              className="p-1 px-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded transition-colors"
                            >
                              {item.whatsappConfirmStatus === 'NOT_SENT' ? 'Send 💬' : 'Resend 🔁'}
                            </button>

                            {/* Manual Confirm / Cancel */}
                            {item.whatsappConfirmStatus === 'PENDING_RESPONSE' && (
                              <>
                                <button
                                  onClick={() => handleOverride(item.id, 'CONFIRMED')}
                                  disabled={actionBusyId === item.id}
                                  className="p-1 px-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 rounded transition-colors"
                                >
                                  Confirm ✔
                                </button>
                                <button
                                  onClick={() => handleOverride(item.id, 'CANCELLED')}
                                  disabled={actionBusyId === item.id}
                                  className="p-1 px-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-100 hover:bg-rose-100 rounded transition-colors"
                                >
                                  Cancel ✖
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sandbox Webhook Simulator Panel */}
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm h-fit space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧪</span>
            <h3 className="text-lg font-bold text-slate-900">Webhook Simulator</h3>
          </div>
          <p className="text-xs text-slate-500">
            Mock receiving customer text replies to simulate the WhatsApp bot workflow. Load a
            pending number from the table by clicking its "Sandbox" button.
          </p>

          <form onSubmit={handleSimulateWebhook} className="space-y-4 pt-2">
            {/* Phone Number Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 block">Sender Phone Number</label>
              <input
                type="text"
                placeholder="e.g. 201012345678"
                value={simPhone}
                onChange={e => setSimPhone(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-500 font-mono"
              />
            </div>

            {/* Response Type Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 block">
                Simulate Reply Message
              </label>
              <select
                value={simReply}
                onChange={e => setSimReply(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-500 bg-white"
              >
                <option value="1">Confirm ("1")</option>
                <option value="2">Cancel ("2")</option>
                <option value="custom">Custom Text Message...</option>
              </select>
            </div>

            {/* Custom Reply Text Input */}
            {simReply === 'custom' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 block">
                  Custom Message Body
                </label>
                <input
                  type="text"
                  placeholder="e.g. hello, confirm, etc."
                  value={customReplyText}
                  onChange={e => setCustomReplyText(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-500"
                />
              </div>
            )}

            {/* Submit Simulation */}
            <button
              type="submit"
              disabled={simulating}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              {simulating ? 'Injecting Mock reply...' : 'Inject Webhook Trigger ⚡'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
