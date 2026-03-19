/**
 * Billing — Credits, Usage, Transaction History & Credit Pack Store
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Zap,
  Clock,
  CreditCard,
  Activity,
  Crown,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  ChevronRight,
  Loader2,
  FileCode2,
  Wrench,
  Image,
  Download,
  Globe,
  Layers,
  ShoppingCart,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useCredits } from '@/hooks/useCredits';
import CreditPackStore from '@/components/features/credits/CreditPackStore';
import logoImg from '@/assets/logo.png';
import type { CreditTransaction } from '@/types/credits';

// ─── Transaction type config ──────────────────────────────────────

const TX_TYPE_CONFIG: Record<string, { icon: typeof Zap; color: string; label: string }> = {
  trial_grant:           { icon: Zap,          color: 'text-emerald-400', label: 'Trial Grant' },
  subscription_grant:    { icon: Crown,        color: 'text-violet-400',  label: 'Plan Credits' },
  credit_pack_purchase:  { icon: ShoppingCart,  color: 'text-blue-400',    label: 'Pack Purchase' },
  manual_admin_grant:    { icon: Crown,        color: 'text-amber-400',   label: 'Admin Grant' },
  usage_deduction:       { icon: TrendingDown, color: 'text-red-400',     label: 'Usage' },
  refund:                { icon: TrendingUp,   color: 'text-emerald-400', label: 'Refund' },
  reversal:              { icon: RefreshCw,    color: 'text-amber-400',   label: 'Reversal' },
  expiration:            { icon: Clock,        color: 'text-gray-500',    label: 'Expired' },
};

const SOURCE_ICONS: Record<string, typeof Zap> = {
  ai_generation:      FileCode2,
  repair_generation:  Wrench,
  image_generation:   Image,
  export_zip:         Download,
  deploy_attempt:     Globe,
  premium_template:   Layers,
  credit_pack:        ShoppingCart,
  signup_trial:       Zap,
  monthly_subscription: Crown,
  admin_adjustment:   Crown,
};

// ─── Component ─────────────────────────────────────────────────────

export default function Billing() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const {
    account,
    subscription,
    transactions,
    pricingRules,
    loading,
    balance,
    isTrialActive,
    trialDaysLeft,
    planName,
    refresh,
  } = useCredits();

  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'packs' | 'pricing'>('overview');

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  if (!user) return null;

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: Zap },
    { id: 'history' as const,  label: 'History',  icon: Activity },
    { id: 'packs' as const,    label: 'Buy Credits', icon: ShoppingCart },
    { id: 'pricing' as const,  label: 'Pricing Rules', icon: CreditCard },
  ];

  // Usage stats from transactions
  const usageDeductions = transactions.filter((t) => t.transaction_type === 'usage_deduction');
  const usageBySource = usageDeductions.reduce<Record<string, number>>((acc, t) => {
    acc[t.transaction_source] = (acc[t.transaction_source] || 0) + Math.abs(t.amount);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-white/[0.06] bg-zinc-950">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white" aria-label="Back">
              <ArrowLeft className="size-4" />
            </button>
            <div className="flex items-center gap-2">
              <img src={logoImg} alt="ForJenta" className="size-9 rounded-lg object-contain" />
              <span className="font-display text-sm font-semibold text-white">Billing & Credits</span>
            </div>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
          >
            <RefreshCw className={`size-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-white">Credits & Billing</h1>
          <p className="mt-1 text-sm text-gray-400">Manage your credits, view usage, and purchase credit packs.</p>
        </div>

        {/* Tabs */}
        <div className="mb-8 flex gap-1 rounded-xl bg-zinc-900/50 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.id ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <tab.icon className="size-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="size-6 text-gray-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* ═══ OVERVIEW ═══ */}
            {activeTab === 'overview' && (
              <div className="flex flex-col gap-6">
                {/* Stats */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Balance */}
                  <div className="rounded-xl border border-white/[0.06] bg-zinc-900/50 p-5">
                    <div className="flex items-center gap-2 text-gray-500 mb-3">
                      <Zap className="size-4 text-amber-400" />
                      <span className="text-xs uppercase tracking-wider">Balance</span>
                    </div>
                    <p className="font-display text-3xl font-bold text-white">{balance}</p>
                    <p className="mt-1 text-xs text-gray-500">available credits</p>
                  </div>

                  {/* Plan */}
                  <div className="rounded-xl border border-white/[0.06] bg-zinc-900/50 p-5">
                    <div className="flex items-center gap-2 text-gray-500 mb-3">
                      <Crown className="size-4 text-violet-400" />
                      <span className="text-xs uppercase tracking-wider">Plan</span>
                    </div>
                    <p className="font-display text-3xl font-bold text-white capitalize">{planName}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {isTrialActive ? `${trialDaysLeft} days left in trial` : subscription?.billing_status || 'No active plan'}
                    </p>
                  </div>

                  {/* Lifetime earned */}
                  <div className="rounded-xl border border-white/[0.06] bg-zinc-900/50 p-5">
                    <div className="flex items-center gap-2 text-gray-500 mb-3">
                      <TrendingUp className="size-4 text-emerald-400" />
                      <span className="text-xs uppercase tracking-wider">Earned</span>
                    </div>
                    <p className="font-display text-3xl font-bold text-white">{account?.lifetime_earned ?? 0}</p>
                    <p className="mt-1 text-xs text-gray-500">lifetime credits</p>
                  </div>

                  {/* Lifetime used */}
                  <div className="rounded-xl border border-white/[0.06] bg-zinc-900/50 p-5">
                    <div className="flex items-center gap-2 text-gray-500 mb-3">
                      <TrendingDown className="size-4 text-red-400" />
                      <span className="text-xs uppercase tracking-wider">Used</span>
                    </div>
                    <p className="font-display text-3xl font-bold text-white">{account?.lifetime_used ?? 0}</p>
                    <p className="mt-1 text-xs text-gray-500">lifetime credits</p>
                  </div>
                </div>

                {/* Usage by feature */}
                {Object.keys(usageBySource).length > 0 && (
                  <div className="rounded-xl border border-white/[0.06] bg-zinc-900/50 p-5">
                    <h3 className="text-sm font-semibold text-white mb-4">Usage by Feature</h3>
                    <div className="flex flex-col gap-2">
                      {Object.entries(usageBySource)
                        .sort((a, b) => b[1] - a[1])
                        .map(([source, total]) => {
                          const SourceIcon = SOURCE_ICONS[source] || Zap;
                          const maxUsage = Math.max(...Object.values(usageBySource));
                          return (
                            <div key={source} className="flex items-center gap-3">
                              <SourceIcon className="size-4 shrink-0 text-gray-500" />
                              <span className="w-32 shrink-0 truncate text-xs text-gray-300 capitalize">
                                {source.replace(/_/g, ' ')}
                              </span>
                              <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                                  style={{ width: `${(total / maxUsage) * 100}%` }}
                                />
                              </div>
                              <span className="shrink-0 text-xs font-medium tabular-nums text-white">{total}</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Trial / subscription info */}
                <div className="rounded-xl border border-white/[0.06] bg-zinc-900/50 p-5">
                  <h3 className="text-sm font-semibold text-white mb-4">Subscription</h3>
                  <div className="flex items-center justify-between rounded-lg bg-black/20 px-4 py-3">
                    <div>
                      <p className="text-xs font-medium text-white capitalize">{planName} Plan</p>
                      <p className="mt-0.5 text-[10px] text-gray-500">
                        {isTrialActive
                          ? `Trial ends ${subscription?.trial_end ? new Date(subscription.trial_end).toLocaleDateString() : 'soon'}`
                          : subscription?.renewal_date
                          ? `Renews ${new Date(subscription.renewal_date).toLocaleDateString()}`
                          : 'No renewal scheduled'}
                      </p>
                    </div>
                    <Link
                      to="/pricing"
                      className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-xs font-medium text-white"
                    >
                      {isTrialActive ? 'Upgrade' : 'View Plans'}
                      <ChevronRight className="size-3" />
                    </Link>
                  </div>
                </div>

                {/* Recent transactions preview */}
                <div className="rounded-xl border border-white/[0.06] bg-zinc-900/50 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-white">Recent Transactions</h3>
                    <button
                      onClick={() => setActiveTab('history')}
                      className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300"
                    >
                      View all <ChevronRight className="size-3" />
                    </button>
                  </div>
                  <TransactionList transactions={transactions.slice(0, 5)} />
                </div>
              </div>
            )}

            {/* ═══ HISTORY ═══ */}
            {activeTab === 'history' && (
              <div className="rounded-xl border border-white/[0.06] bg-zinc-900/50 p-5">
                <h3 className="text-sm font-semibold text-white mb-4">
                  Transaction History ({transactions.length})
                </h3>
                {transactions.length === 0 ? (
                  <div className="py-12 text-center">
                    <Activity className="mx-auto size-8 text-gray-600 mb-2" />
                    <p className="text-sm text-gray-500">No transactions yet</p>
                  </div>
                ) : (
                  <TransactionList transactions={transactions} />
                )}
              </div>
            )}

            {/* ═══ BUY CREDITS ═══ */}
            {activeTab === 'packs' && (
              <CreditPackStore onPurchaseComplete={() => refresh()} />
            )}

            {/* ═══ PRICING RULES ═══ */}
            {activeTab === 'pricing' && (
              <div className="rounded-xl border border-white/[0.06] bg-zinc-900/50 p-5">
                <h3 className="text-sm font-semibold text-white mb-4">Credit Costs per Action</h3>
                <div className="flex flex-col gap-2">
                  {pricingRules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between rounded-lg bg-black/20 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <Zap className="size-4 text-amber-400" />
                        <div>
                          <p className="text-xs font-medium text-white capitalize">
                            {rule.feature_key.replace(/_/g, ' ')}
                          </p>
                          <p className="text-[10px] text-gray-500 capitalize">
                            {rule.action_type} · {rule.pricing_mode}
                          </p>
                        </div>
                      </div>
                      <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">
                        <Zap className="size-3" />
                        {rule.credit_cost}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Transaction list sub-component ────────────────────────────────

function TransactionList({ transactions }: { transactions: CreditTransaction[] }) {
  return (
    <div className="flex flex-col gap-2">
      {transactions.map((tx) => {
        const config = TX_TYPE_CONFIG[tx.transaction_type] || TX_TYPE_CONFIG.usage_deduction;
        const Icon = config.icon;
        const isPositive = tx.amount > 0;

        return (
          <div
            key={tx.id}
            className="flex items-center gap-3 rounded-lg bg-black/20 px-4 py-3 transition-colors hover:bg-black/30"
          >
            <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
              isPositive ? 'bg-emerald-500/10' : 'bg-red-500/10'
            }`}>
              <Icon className={`size-4 ${config.color}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-200">{config.label}</span>
                <span className="text-[10px] text-gray-600 capitalize">
                  {tx.transaction_source.replace(/_/g, ' ')}
                </span>
              </div>
              {tx.description && (
                <p className="mt-0.5 truncate text-[10px] text-gray-500">{tx.description}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-0.5 shrink-0">
              <span className={`text-xs font-semibold tabular-nums ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                {isPositive ? '+' : ''}{tx.amount}
              </span>
              <span className="text-[9px] text-gray-600 tabular-nums">
                bal: {tx.balance_after}
              </span>
            </div>
            <span className="shrink-0 text-[9px] text-gray-700 tabular-nums">
              {new Date(tx.created_at).toLocaleDateString()}
            </span>
          </div>
        );
      })}
    </div>
  );
}
