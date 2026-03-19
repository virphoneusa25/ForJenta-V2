/**
 * InsufficientCreditsModal — Shown when user attempts action without enough credits
 *
 * Displays:
 * - Required credits for the action
 * - Current balance
 * - Shortfall
 * - Upgrade CTA
 * - Buy credit pack CTA
 */

import { Link } from 'react-router-dom';
import { Zap, ShoppingCart, Crown, AlertTriangle, X } from 'lucide-react';
import type { CreditCheckResult } from '@/types/credits';

interface InsufficientCreditsModalProps {
  check: CreditCheckResult;
  actionLabel?: string;
  onClose: () => void;
}

export default function InsufficientCreditsModal({
  check,
  actionLabel = 'this action',
  onClose,
}: InsufficientCreditsModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-backdrop">
      <div className="relative w-full max-w-md rounded-2xl border border-white/[0.08] bg-zinc-950 p-6 shadow-2xl shadow-black/60">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-gray-500 transition-colors hover:bg-white/5 hover:text-white"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-500/10">
            <AlertTriangle className="size-6 text-amber-400" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-white">Insufficient Credits</h2>
            <p className="text-xs text-gray-400">You need more credits for {actionLabel}</p>
          </div>
        </div>

        {/* Credit breakdown */}
        <div className="mb-6 rounded-xl border border-white/[0.06] bg-zinc-900/50 p-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Required</span>
              <span className="flex items-center gap-1 text-sm font-semibold text-white">
                <Zap className="size-3.5 text-amber-400" />
                {check.requiredCredits}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Your balance</span>
              <span className="flex items-center gap-1 text-sm font-semibold text-red-400">
                <Zap className="size-3.5 text-red-400" />
                {check.currentBalance}
              </span>
            </div>
            <div className="border-t border-white/[0.06] pt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-300">Shortfall</span>
                <span className="text-sm font-bold text-amber-400">
                  {check.shortfall} credit{check.shortfall !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3">
          <Link
            to="/billing"
            onClick={onClose}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <ShoppingCart className="size-4" />
            Buy Credit Packs
          </Link>
          <Link
            to="/pricing"
            onClick={onClose}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm font-medium text-gray-300 transition-colors hover:bg-white/[0.05]"
          >
            <Crown className="size-4 text-amber-400" />
            Upgrade Plan
          </Link>
        </div>
      </div>
    </div>
  );
}
