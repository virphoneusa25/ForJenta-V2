/**
 * Credit Service — Centralized credit management
 *
 * Responsibilities:
 * - Get current balance
 * - Estimate action cost from pricing rules
 * - Validate enough credits before action
 * - Deduct credits with ledger entry
 * - Refund credits if generation fails
 * - Log all transactions
 */

import { supabase } from '@/lib/supabase';
import type {
  CreditAccount,
  CreditTransaction,
  CreditPack,
  Subscription,
  UsagePricingRule,
  FeatureKey,
  CreditCheckResult,
  CreditDeductionResult,
} from '@/types/credits';

// ─── Developer Emails — unlimited credits ──────────────────────────

const DEVELOPER_EMAILS = new Set([
  'rmcknight@virphoneusa.com',
]);

const DEVELOPER_CREDITS = 999999;
const DEFAULT_TRIAL_CREDITS = 25;

// ─── Cache for pricing rules (refresh every 5 min) ────────────────

let _pricingRulesCache: UsagePricingRule[] | null = null;
let _pricingCacheTime = 0;
const PRICING_CACHE_TTL = 5 * 60 * 1000;

// ─── Fetch Helpers ─────────────────────────────────────────────────

export async function fetchCreditAccount(userId: string): Promise<CreditAccount | null> {
  const { data, error } = await supabase
    .from('credit_accounts')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows — we'll handle that with auto-provision
    console.error('[Credits] Failed to fetch credit account:', error);
  }

  if (data) return data;

  // No account found — try to auto-provision
  console.log('[Credits] No credit account found for user, attempting auto-provision...');
  return autoProvisionCreditAccount(userId);
}

/**
 * Auto-provision a credit account for users who signed up via legacy auth
 * or whose DB trigger didn't fire properly.
 */
async function autoProvisionCreditAccount(userId: string): Promise<CreditAccount | null> {
  // Determine if this user is a developer
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('email')
    .eq('id', userId)
    .single();

  const isDev = profile?.email && DEVELOPER_EMAILS.has(profile.email.toLowerCase());
  const credits = isDev ? DEVELOPER_CREDITS : DEFAULT_TRIAL_CREDITS;
  const planName = isDev ? 'developer' : 'trial';

  console.log(`[Credits] Auto-provisioning ${planName} account with ${credits} credits (email: ${profile?.email || 'unknown'})`);

  // Create credit account
  const { data: acct, error: acctErr } = await supabase
    .from('credit_accounts')
    .insert({
      user_id: userId,
      current_balance: credits,
      lifetime_earned: credits,
      lifetime_used: 0,
    })
    .select()
    .single();

  if (acctErr) {
    // Might be a race condition — try fetching again
    if (acctErr.code === '23505') {
      const { data: existing } = await supabase
        .from('credit_accounts')
        .select('*')
        .eq('user_id', userId)
        .single();
      return existing;
    }
    console.error('[Credits] Failed to auto-provision credit account:', acctErr);
    return null;
  }

  // Create subscription record
  const trialDays = isDev ? 36500 : 3;
  const now = new Date();
  const trialEnd = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

  await supabase.from('subscriptions').insert({
    user_id: userId,
    current_plan: planName,
    monthly_credit_allowance: isDev ? DEVELOPER_CREDITS : 0,
    billing_status: isDev ? 'active' : 'trial',
    trial_start: now.toISOString(),
    trial_end: trialEnd.toISOString(),
    trial_active: !isDev,
  }).then(({ error }) => {
    if (error && error.code !== '23505') {
      console.error('[Credits] Failed to create subscription:', error);
    }
  });

  // Write ledger entry
  await supabase.from('credit_transactions').insert({
    user_id: userId,
    transaction_type: isDev ? 'manual_admin_grant' : 'trial_grant',
    transaction_source: isDev ? 'admin_adjustment' : 'signup_trial',
    amount: credits,
    balance_before: 0,
    balance_after: credits,
    status: 'completed',
    description: isDev
      ? 'Developer account: unlimited credits auto-provisioned.'
      : 'Welcome! 25 trial credits granted for your 3-day free trial.',
    metadata_json: { plan: planName, auto_provisioned: true },
  });

  console.log(`[Credits] Auto-provision complete: ${planName} with ${credits} credits`);
  return acct;
}

export async function fetchSubscription(userId: string): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('[Credits] Failed to fetch subscription:', error);
  }
  // If no subscription, the auto-provision in fetchCreditAccount will create one
  return data || null;
}

export async function fetchCreditTransactions(
  userId: string,
  limit = 50
): Promise<CreditTransaction[]> {
  const { data, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[Credits] Failed to fetch transactions:', error);
    return [];
  }
  return data || [];
}

export async function fetchCreditPacks(): Promise<CreditPack[]> {
  const { data, error } = await supabase
    .from('credit_packs')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('[Credits] Failed to fetch credit packs:', error);
    return [];
  }
  return data || [];
}

export async function fetchPricingRules(): Promise<UsagePricingRule[]> {
  const now = Date.now();
  if (_pricingRulesCache && now - _pricingCacheTime < PRICING_CACHE_TTL) {
    return _pricingRulesCache;
  }

  const { data, error } = await supabase
    .from('usage_pricing_rules')
    .select('*')
    .eq('is_active', true);

  if (error) {
    console.error('[Credits] Failed to fetch pricing rules:', error);
    return _pricingRulesCache || [];
  }

  _pricingRulesCache = data || [];
  _pricingCacheTime = now;
  return _pricingRulesCache;
}

// ─── Cost Estimation ───────────────────────────────────────────────

export async function getActionCost(featureKey: FeatureKey): Promise<number> {
  const rules = await fetchPricingRules();
  const rule = rules.find((r) => r.feature_key === featureKey);
  return rule?.credit_cost ?? 0;
}

// ─── Credit Check ──────────────────────────────────────────────────

export async function checkCredits(
  userId: string,
  featureKey: FeatureKey
): Promise<CreditCheckResult> {
  const [account, cost] = await Promise.all([
    fetchCreditAccount(userId),
    getActionCost(featureKey),
  ]);

  const balance = account?.current_balance ?? 0;
  const shortfall = Math.max(0, cost - balance);

  if (balance >= cost) {
    return {
      allowed: true,
      currentBalance: balance,
      requiredCredits: cost,
      shortfall: 0,
      message: `This action costs ${cost} credit${cost !== 1 ? 's' : ''}. You have ${balance} credits.`,
    };
  }

  return {
    allowed: false,
    currentBalance: balance,
    requiredCredits: cost,
    shortfall,
    message: `Insufficient credits. You need ${cost} but only have ${balance}. Purchase more credits or upgrade your plan.`,
  };
}

// ─── Credit Deduction ──────────────────────────────────────────────

export async function deductCredits(params: {
  userId: string;
  featureKey: FeatureKey;
  source: CreditTransaction['transaction_source'];
  projectId?: string;
  generationRunId?: string;
  description?: string;
}): Promise<CreditDeductionResult> {
  const { userId, featureKey, source, projectId, generationRunId, description } = params;

  // Get current balance and cost
  const [account, cost] = await Promise.all([
    fetchCreditAccount(userId),
    getActionCost(featureKey),
  ]);

  if (!account) {
    return { success: false, transactionId: null, newBalance: 0, error: 'Credit account not found' };
  }

  const balanceBefore = account.current_balance;
  if (balanceBefore < cost) {
    return {
      success: false,
      transactionId: null,
      newBalance: balanceBefore,
      error: `Insufficient credits. Need ${cost}, have ${balanceBefore}.`,
    };
  }

  const balanceAfter = balanceBefore - cost;

  // Update balance
  const { error: updateErr } = await supabase
    .from('credit_accounts')
    .update({
      current_balance: balanceAfter,
      lifetime_used: account.lifetime_used + cost,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (updateErr) {
    console.error('[Credits] Failed to update balance:', updateErr);
    return { success: false, transactionId: null, newBalance: balanceBefore, error: 'Failed to update balance' };
  }

  // Write ledger entry
  const { data: tx, error: txErr } = await supabase
    .from('credit_transactions')
    .insert({
      user_id: userId,
      project_id: projectId || null,
      generation_run_id: generationRunId || null,
      transaction_type: 'usage_deduction',
      transaction_source: source,
      amount: -cost,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      status: 'completed',
      description: description || `Used ${cost} credit(s) for ${featureKey.replace(/_/g, ' ')}`,
      metadata_json: { feature_key: featureKey, cost },
    })
    .select('id')
    .single();

  if (txErr) {
    console.error('[Credits] Failed to write transaction:', txErr);
    // Balance was already deducted — log but don't fail
  }

  console.log(`[Credits] Deducted ${cost} credits for ${featureKey}. Balance: ${balanceBefore} → ${balanceAfter}`);

  return {
    success: true,
    transactionId: tx?.id || null,
    newBalance: balanceAfter,
  };
}

// ─── Credit Refund ─────────────────────────────────────────────────

export async function refundCredits(params: {
  userId: string;
  amount: number;
  reason: string;
  originalTransactionId?: string;
  projectId?: string;
}): Promise<CreditDeductionResult> {
  const { userId, amount, reason, originalTransactionId, projectId } = params;

  const account = await fetchCreditAccount(userId);
  if (!account) {
    return { success: false, transactionId: null, newBalance: 0, error: 'Credit account not found' };
  }

  const balanceBefore = account.current_balance;
  const balanceAfter = balanceBefore + amount;

  // Update balance
  const { error: updateErr } = await supabase
    .from('credit_accounts')
    .update({
      current_balance: balanceAfter,
      lifetime_earned: account.lifetime_earned + amount,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (updateErr) {
    console.error('[Credits] Failed to refund:', updateErr);
    return { success: false, transactionId: null, newBalance: balanceBefore, error: 'Failed to refund' };
  }

  // Write ledger entry
  const { data: tx, error: txErr } = await supabase
    .from('credit_transactions')
    .insert({
      user_id: userId,
      project_id: projectId || null,
      transaction_type: 'refund',
      transaction_source: 'admin_adjustment',
      amount: amount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      status: 'completed',
      description: reason,
      metadata_json: { original_transaction_id: originalTransactionId || null },
    })
    .select('id')
    .single();

  if (txErr) {
    console.error('[Credits] Failed to write refund transaction:', txErr);
  }

  return { success: true, transactionId: tx?.id || null, newBalance: balanceAfter };
}

// ─── Add Credits (for pack purchase / admin grant) ─────────────────

export async function addCredits(params: {
  userId: string;
  amount: number;
  transactionType: 'credit_pack_purchase' | 'subscription_grant' | 'manual_admin_grant';
  source: CreditTransaction['transaction_source'];
  description: string;
  metadata?: Record<string, any>;
}): Promise<CreditDeductionResult> {
  const { userId, amount, transactionType, source, description, metadata } = params;

  const account = await fetchCreditAccount(userId);
  if (!account) {
    return { success: false, transactionId: null, newBalance: 0, error: 'Credit account not found' };
  }

  const balanceBefore = account.current_balance;
  const balanceAfter = balanceBefore + amount;

  const { error: updateErr } = await supabase
    .from('credit_accounts')
    .update({
      current_balance: balanceAfter,
      lifetime_earned: account.lifetime_earned + amount,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (updateErr) {
    console.error('[Credits] Failed to add credits:', updateErr);
    return { success: false, transactionId: null, newBalance: balanceBefore, error: 'Failed to add credits' };
  }

  const { data: tx, error: txErr } = await supabase
    .from('credit_transactions')
    .insert({
      user_id: userId,
      transaction_type: transactionType,
      transaction_source: source,
      amount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      status: 'completed',
      description,
      metadata_json: metadata || {},
    })
    .select('id')
    .single();

  if (txErr) {
    console.error('[Credits] Failed to write add transaction:', txErr);
  }

  return { success: true, transactionId: tx?.id || null, newBalance: balanceAfter };
}

// ─── Admin: Grant/Remove credits ───────────────────────────────────

export async function adminGrantCredits(
  targetUserId: string,
  amount: number,
  reason: string
): Promise<CreditDeductionResult> {
  return addCredits({
    userId: targetUserId,
    amount,
    transactionType: 'manual_admin_grant',
    source: 'admin_adjustment',
    description: `Admin grant: ${reason}`,
    metadata: { admin_action: 'grant', reason },
  });
}

export async function adminRemoveCredits(
  targetUserId: string,
  amount: number,
  reason: string
): Promise<CreditDeductionResult> {
  const account = await fetchCreditAccount(targetUserId);
  if (!account) return { success: false, transactionId: null, newBalance: 0, error: 'Account not found' };

  const balanceBefore = account.current_balance;
  const removeAmount = Math.min(amount, balanceBefore);
  const balanceAfter = balanceBefore - removeAmount;

  const { error: updateErr } = await supabase
    .from('credit_accounts')
    .update({
      current_balance: balanceAfter,
      lifetime_used: account.lifetime_used + removeAmount,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', targetUserId);

  if (updateErr) return { success: false, transactionId: null, newBalance: balanceBefore, error: 'Update failed' };

  const { data: tx } = await supabase
    .from('credit_transactions')
    .insert({
      user_id: targetUserId,
      transaction_type: 'reversal',
      transaction_source: 'admin_adjustment',
      amount: -removeAmount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      status: 'completed',
      description: `Admin removal: ${reason}`,
      metadata_json: { admin_action: 'remove', reason },
    })
    .select('id')
    .single();

  return { success: true, transactionId: tx?.id || null, newBalance: balanceAfter };
}
