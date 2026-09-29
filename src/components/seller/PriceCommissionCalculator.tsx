'use client';

import React, { useState } from 'react';

interface PriceCommissionCalculatorProps {
  basePrice: number | string;
  commissionRate?: number;
  onApplyPrice?: (newPrice: number) => void;
}

export function PriceCommissionCalculator({
  basePrice,
  commissionRate = 0.1,
  onApplyPrice,
}: PriceCommissionCalculatorProps) {
  const [mode, setMode] = useState<'deduct' | 'add'>('add');
  const price = typeof basePrice === 'number' ? basePrice : parseFloat(basePrice) || 0;
  const pct = Math.round(commissionRate * 100);

  // Mode calculations
  // 'deduct': Customer pays `price`. Platform takes `price * commissionRate`. Seller receives `price * (1 - commissionRate)`.
  // 'add': Seller wants to receive `price`. Markup of `price * commissionRate` is added. Customer price becomes `price * (1 + commissionRate)`.
  const feeAmount = price > 0 ? price * commissionRate : 0;
  const customerPriceWithAdd = price > 0 ? Math.round(price * (1 + commissionRate) * 100) / 100 : 0;
  const sellerNetWithDeduct = price > 0 ? Math.round(price * (1 - commissionRate) * 100) / 100 : 0;

  return (
    <div className="mt-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 text-xs select-none">
      {/* Top row: Label, % badge, and Mode switch buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5 font-bold text-slate-700">
          <span className="text-sm">💰</span>
          <span>Platform Fee Breakdown</span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[#0F6E56] text-[11px] font-black border border-emerald-200/60">
            {pct}% Fee
          </span>
        </div>

        {/* 2 Options Switch */}
        <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-200/70 border border-slate-300/60">
          <button
            type="button"
            onClick={() => setMode('deduct')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
              mode === 'deduct'
                ? 'bg-[#0F6E56] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Take from me
          </button>
          <button
            type="button"
            onClick={() => setMode('add')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
              mode === 'add'
                ? 'bg-[#0F6E56] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Add percentage
          </button>
        </div>
      </div>

      {/* Result Boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
        {mode === 'deduct' ? (
          <>
            {/* Box 1: Platform Cut */}
            <div className="p-2.5 rounded-lg bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Platform Cut ({pct}%)
              </div>
              <div className="text-sm font-black text-amber-600 mt-1">
                -{feeAmount.toFixed(2)} EGP
              </div>
            </div>

            {/* Box 2: Seller Net Receive */}
            <div className="p-2.5 rounded-lg bg-emerald-50/80 border border-emerald-200/80 shadow-xs flex flex-col justify-between">
              <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-800">
                You Receive (Net Payout)
              </div>
              <div className="text-sm font-black text-[#0F6E56] mt-1">
                {sellerNetWithDeduct.toFixed(2)} EGP
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Box 1: Markup Added */}
            <div className="p-2.5 rounded-lg bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Markup Added (+{pct}%)
              </div>
              <div className="text-sm font-black text-blue-600 mt-1">
                +{feeAmount.toFixed(2)} EGP
              </div>
            </div>

            {/* Box 2: New Customer Price */}
            <div className="p-2.5 rounded-lg bg-blue-50/80 border border-blue-200/80 shadow-xs flex flex-col justify-between">
              <div className="text-[10px] uppercase font-bold tracking-wider text-blue-800">
                New Customer Price
              </div>
              <div className="text-sm font-black text-blue-700 mt-1">
                <span>{customerPriceWithAdd.toFixed(2)} EGP</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Helper text explanation */}
      <div className="text-[10px] text-slate-500 mt-2 leading-relaxed bg-white/70 p-1.5 rounded border border-slate-100">
        {mode === 'deduct' ? (
          <span>
            Customer pays <strong>{price.toFixed(2)} EGP</strong> on store. Platform retains{' '}
            <strong>
              {pct}% ({feeAmount.toFixed(2)} EGP)
            </strong>
            , and you receive <strong>{sellerNetWithDeduct.toFixed(2)} EGP</strong>.
          </span>
        ) : (
          <span>
            {pct}% platform fee (<strong>{feeAmount.toFixed(2)} EGP</strong>) is added on top.
            Customer price becomes <strong>{customerPriceWithAdd.toFixed(2)} EGP</strong> so your
            net earnings remain <strong>{price.toFixed(2)} EGP</strong>.
          </span>
        )}
      </div>
    </div>
  );
}
