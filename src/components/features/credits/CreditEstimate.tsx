/**
 * CreditEstimate — Pre-generation cost display
 *
 * Shows: "This build will use N credits" with current balance context
 */

import { Zap } from 'lucide-react';

interface CreditEstimateProps {
  cost: number;
  balance: number;
  label?: string;
  compact?: boolean;
}

export default function CreditEstimate({ cost, balance, label, compact }: CreditEstimateProps) {
  const sufficient = balance >= cost;

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium ${
          sufficient ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'
        }`}
      >
        <Zap className="size-2.5" />
        {cost} credit{cost !== 1 ? 's' : ''}
      </span>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
        sufficient
          ? 'bg-amber-500/[0.05] border border-amber-500/10'
          : 'bg-red-500/[0.05] border border-red-500/10'
      }`}
    >
      <Zap className={`size-3.5 ${sufficient ? 'text-amber-400' : 'text-red-400'}`} />
      <span className={sufficient ? 'text-amber-300' : 'text-red-300'}>
        {label || 'This action'} will use <strong>{cost}</strong> credit{cost !== 1 ? 's' : ''}
      </span>
      <span className="ml-auto text-gray-500">
        Balance: {balance}
      </span>
    </div>
  );
}
