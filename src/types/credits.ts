// ─── Credit System Types ───────────────────────────────────────────

export interface CreditAccount {
  id: string;
  user_id: string;
  current_balance: number;
  lifetime_earned: number;
  lifetime_used: number;
  created_at: string;
  updated_at: string;
}

export type TransactionType =
  | 'trial_grant'
  | 'subscription_grant'
  | 'credit_pack_purchase'
  | 'manual_admin_grant'
  | 'usage_deduction'
  | 'refund'
  | 'reversal'
  | 'expiration';

export type TransactionSource =
  | 'signup_trial'
  | 'monthly_subscription'
  | 'credit_pack'
  | 'ai_generation'
  | 'repair_generation'
  | 'image_generation'
  | 'premium_template'
  | 'admin_adjustment'
  | 'export_zip'
  | 'deploy_attempt';

export interface CreditTransaction {
  id: string;
  user_id: string;
  project_id: string | null;
  generation_run_id: string | null;
  transaction_type: TransactionType;
  transaction_source: TransactionSource;
  amount: number;
  balance_before: number;
  balance_after: number;
  status: 'completed' | 'pending' | 'failed' | 'reversed';
  description: string;
  metadata_json: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreditPack {
  id: string;
  name: string;
  credits_amount: number;
  price: number;
  currency: string;
  is_active: boolean;
  display_order: number;
  badge_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  current_plan: string;
  monthly_credit_allowance: number;
  billing_status: 'trial' | 'active' | 'past_due' | 'canceled' | 'expired';
  renewal_date: string | null;
  trial_start: string | null;
  trial_end: string | null;
  trial_active: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface UsagePricingRule {
  id: string;
  feature_key: string;
  action_type: string;
  credit_cost: number;
  pricing_mode: 'fixed' | 'token_based';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Feature keys matching usage_pricing_rules ─────────────────────

export type FeatureKey =
  | 'full_app_generation'
  | 'ui_generation'
  | 'backend_generation'
  | 'repair_pass'
  | 'image_generation'
  | 'premium_template_use'
  | 'export_zip'
  | 'deploy_attempt';

// ─── Credit check result ──────────────────────────────────────────

export interface CreditCheckResult {
  allowed: boolean;
  currentBalance: number;
  requiredCredits: number;
  shortfall: number;
  message: string;
}

// ─── Credit deduction result ──────────────────────────────────────

export interface CreditDeductionResult {
  success: boolean;
  transactionId: string | null;
  newBalance: number;
  error?: string;
}

// ─── Credit summary for UI ────────────────────────────────────────

export interface CreditSummary {
  account: CreditAccount | null;
  subscription: Subscription | null;
  recentTransactions: CreditTransaction[];
  pricingRules: UsagePricingRule[];
  loading: boolean;
  error: string | null;
}
