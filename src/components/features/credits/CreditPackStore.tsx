/**
 * CreditPackStore — Premium credit pack purchase UI
 *
 * Shows available packs with prices, badges, and buy CTAs.
 * After purchase → adds credits immediately via addCredits.
 */

import { useState, useEffect } from 'react';
import { Zap, Check, Loader2, ShoppingCart, Sparkles } from 'lucide-react';
import { fetchCreditPacks, addCredits } from '@/lib/credits';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/hooks/use-toast';
import type { CreditPack } from '@/types/credits';

interface CreditPackStoreProps {
  onPurchaseComplete?: (newBalance: number) => void;
}

export default function CreditPackStore({ onPurchaseComplete }: CreditPackStoreProps) {
  const user = useAuthStore((s) => s.user);
  const { toast } = useToast();
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    fetchCreditPacks().then((data) => {
      setPacks(data);
      setLoading(false);
    });
  }, []);

  const handlePurchase = async (pack: CreditPack) => {
    if (!user || purchasing) return;

    // In production, this would open Stripe Checkout first.
    // For now, simulate payment success and add credits directly.
    setPurchasing(pack.id);

    try {
      // Simulate payment processing delay
      await new Promise((r) => setTimeout(r, 1500));

      const result = await addCredits({
        userId: user.id,
        amount: pack.credits_amount,
        transactionType: 'credit_pack_purchase',
        source: 'credit_pack',
        description: `Purchased ${pack.name}: ${pack.credits_amount} credits`,
        metadata: {
          pack_id: pack.id,
          pack_name: pack.name,
          price: pack.price,
          currency: pack.currency,
          // payment_intent_id would come from Stripe in production
        },
      });

      if (result.success) {
        toast({
          title: 'Credits added!',
          description: `${pack.credits_amount} credits from ${pack.name} have been added to your account.`,
        });
        onPurchaseComplete?.(result.newBalance);
      } else {
        toast({ title: 'Purchase failed', description: result.error || 'Unknown error' });
      }
    } catch (err: any) {
      toast({ title: 'Purchase failed', description: err.message });
    } finally {
      setPurchasing(null);
    }
  };

  const getEffectiveValue = (pack: CreditPack) => {
    const perCredit = pack.price / pack.credits_amount;
    return `$${perCredit.toFixed(2)}/credit`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 text-gray-500 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20">
          <ShoppingCart className="size-5 text-amber-400" />
        </div>
        <div>
          <h3 className="font-display text-lg font-bold text-white">Credit Packs</h3>
          <p className="text-xs text-gray-400">One-time purchase. Credits never expire.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {packs.map((pack) => {
          const isPurchasing = purchasing === pack.id;

          return (
            <div
              key={pack.id}
              className={`relative flex flex-col rounded-xl border p-5 transition-all ${
                pack.badge_text
                  ? 'border-violet-500/20 bg-gradient-to-br from-violet-500/[0.03] to-fuchsia-500/[0.03]'
                  : 'border-white/[0.06] bg-zinc-900/50 hover:border-white/10'
              }`}
            >
              {/* Badge */}
              {pack.badge_text && (
                <div className="absolute -top-2.5 left-4 flex items-center gap-1 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-0.5 text-[10px] font-semibold text-white shadow-lg shadow-violet-500/20">
                  <Sparkles className="size-2.5" />
                  {pack.badge_text}
                </div>
              )}

              {/* Pack info */}
              <div className="mb-4">
                <h4 className="font-display text-sm font-semibold text-white">{pack.name}</h4>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="flex items-center gap-1 text-2xl font-bold text-white">
                    <Zap className="size-5 text-amber-400" />
                    {pack.credits_amount}
                  </span>
                  <span className="text-xs text-gray-500">credits</span>
                </div>
              </div>

              {/* Price + value */}
              <div className="mb-4 flex items-center justify-between">
                <span className="font-display text-xl font-bold text-gradient">
                  ${pack.price.toFixed(2)}
                </span>
                <span className="text-[10px] text-gray-500">{getEffectiveValue(pack)}</span>
              </div>

              {/* Buy button */}
              <button
                onClick={() => handlePurchase(pack)}
                disabled={isPurchasing || !user}
                className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-all ${
                  pack.badge_text
                    ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/20 hover:opacity-90'
                    : 'border border-white/10 bg-white/5 text-white hover:bg-white/10'
                } disabled:opacity-50`}
              >
                {isPurchasing ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Check className="size-3.5" />
                    Buy Now
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
