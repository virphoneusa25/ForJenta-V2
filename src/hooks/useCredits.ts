/**
 * useCredits — React hook for credit state management
 *
 * Provides:
 * - Real-time credit balance
 * - Subscription info
 * - Transaction history
 * - Pricing rules
 * - Credit check before actions
 * - Deduction triggers
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import {
  fetchCreditAccount,
  fetchSubscription,
  fetchCreditTransactions,
  fetchPricingRules,
  checkCredits,
  deductCredits,
  refundCredits,
  getActionCost,
} from '@/lib/credits';
import type {
  CreditAccount,
  Subscription,
  CreditTransaction,
  UsagePricingRule,
  FeatureKey,
  CreditCheckResult,
  CreditDeductionResult,
} from '@/types/credits';

interface UseCreditReturn {
  // State
  account: CreditAccount | null;
  subscription: Subscription | null;
  transactions: CreditTransaction[];
  pricingRules: UsagePricingRule[];
  loading: boolean;
  error: string | null;

  // Computed
  balance: number;
  isTrialActive: boolean;
  trialDaysLeft: number;
  planName: string;

  // Actions
  refresh: () => Promise<void>;
  checkAction: (featureKey: FeatureKey) => Promise<CreditCheckResult>;
  deductAction: (params: {
    featureKey: FeatureKey;
    source: CreditTransaction['transaction_source'];
    projectId?: string;
    generationRunId?: string;
    description?: string;
  }) => Promise<CreditDeductionResult>;
  refundAction: (amount: number, reason: string, projectId?: string) => Promise<CreditDeductionResult>;
  getCost: (featureKey: FeatureKey) => Promise<number>;
}

export function useCredits(): UseCreditReturn {
  const user = useAuthStore((s) => s.user);
  const [account, setAccount] = useState<CreditAccount | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [pricingRules, setPricingRules] = useState<UsagePricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setError(null);
    try {
      const [acct, sub, txns, rules] = await Promise.all([
        fetchCreditAccount(user.id),
        fetchSubscription(user.id),
        fetchCreditTransactions(user.id, 50),
        fetchPricingRules(),
      ]);
      setAccount(acct);
      setSubscription(sub);
      setTransactions(txns);
      setPricingRules(rules);
    } catch (err: any) {
      console.error('[useCredits] Refresh error:', err);
      setError(err.message || 'Failed to load credits');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Computed
  const balance = account?.current_balance ?? 0;

  const isTrialActive = (() => {
    if (!subscription?.trial_active) return false;
    if (!subscription.trial_end) return false;
    return new Date(subscription.trial_end) > new Date();
  })();

  const trialDaysLeft = (() => {
    if (!subscription?.trial_end) return 0;
    const diff = new Date(subscription.trial_end).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  })();

  const planName = subscription?.current_plan || 'trial';

  // Actions
  const checkAction = useCallback(
    async (featureKey: FeatureKey) => {
      if (!user) {
        return {
          allowed: false,
          currentBalance: 0,
          requiredCredits: 0,
          shortfall: 0,
          message: 'Please sign in to continue.',
        };
      }
      return checkCredits(user.id, featureKey);
    },
    [user]
  );

  const deductAction = useCallback(
    async (params: {
      featureKey: FeatureKey;
      source: CreditTransaction['transaction_source'];
      projectId?: string;
      generationRunId?: string;
      description?: string;
    }) => {
      if (!user) {
        return { success: false, transactionId: null, newBalance: 0, error: 'Not authenticated' };
      }
      const result = await deductCredits({ userId: user.id, ...params });
      // Refresh account after deduction
      if (result.success) {
        const acct = await fetchCreditAccount(user.id);
        setAccount(acct);
      }
      return result;
    },
    [user]
  );

  const refundAction = useCallback(
    async (amount: number, reason: string, projectId?: string) => {
      if (!user) {
        return { success: false, transactionId: null, newBalance: 0, error: 'Not authenticated' };
      }
      const result = await refundCredits({ userId: user.id, amount, reason, projectId });
      if (result.success) {
        const acct = await fetchCreditAccount(user.id);
        setAccount(acct);
      }
      return result;
    },
    [user]
  );

  const getCost = useCallback(async (featureKey: FeatureKey) => {
    return getActionCost(featureKey);
  }, []);

  return {
    account,
    subscription,
    transactions,
    pricingRules,
    loading,
    error,
    balance,
    isTrialActive,
    trialDaysLeft,
    planName,
    refresh,
    checkAction,
    deductAction,
    refundAction,
    getCost,
  };
}
