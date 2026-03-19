/**
 * CreditDisplay — Topbar credit balance + plan badge (dark theme)
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, ChevronDown, ShoppingCart, Crown, Clock } from 'lucide-react';
import { useCredits } from '@/hooks/useCredits';

export default function CreditDisplay() {
  const { balance, planName, isTrialActive, trialDaysLeft, loading } = useCredits();
  const [open, setOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 rounded-lg bg-white/[0.04] px-3 py-1.5">
        <div className="size-3.5 rounded-full bg-white/10 animate-pulse" />
        <div className="h-3 w-10 rounded bg-white/10 animate-pulse" />
      </div>
    );
  }

  const planLabel = planName === 'trial' ? 'Trial' : planName === 'pro' ? 'Pro' : planName === 'enterprise' ? 'Enterprise' : planName;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-1.5 text-xs transition-colors hover:bg-white/[0.08]"
      >
        <Zap className="size-3.5 text-amber-400" />
        <span className="font-semibold tabular-nums text-white">{balance}</span>
        <span className="text-gray-500">credits</span>
        {isTrialActive && (
          <span className="flex items-center gap-1 rounded-full bg-violet-500/20 px-1.5 py-0.5 text-[9px] font-medium text-violet-300">
            <Clock className="size-2.5" />
            {trialDaysLeft}d
          </span>
        )}
        <ChevronDown className="size-3 text-gray-500" />
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-white/[0.08] bg-zinc-900 p-4 shadow-xl">
            {/* Balance section */}
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500">Balance</p>
                <p className="font-display text-2xl font-bold text-white">{balance}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-gray-300">
                  <Crown className="size-2.5 text-amber-400" />
                  {planLabel}
                </span>
                {isTrialActive && (
                  <span className="text-[10px] text-gray-500">{trialDaysLeft} days left</span>
                )}
              </div>
            </div>

            {/* Usage bar */}
            {isTrialActive && (
              <div className="mb-4">
                <div className="mb-1 flex justify-between text-[10px] text-gray-500">
                  <span>Trial credits used</span>
                  <span>{25 - balance}/25</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all"
                    style={{ width: `${Math.min(100, ((25 - balance) / 25) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Link
                to="/billing"
                onClick={() => setOpen(false)}
                className="gradient-primary flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90"
              >
                <ShoppingCart className="size-3.5" />
                Buy Credits
              </Link>
              <Link
                to="/billing"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-xs text-gray-400 transition-colors hover:bg-white/[0.06] hover:text-gray-200"
              >
                View Usage & Billing
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
