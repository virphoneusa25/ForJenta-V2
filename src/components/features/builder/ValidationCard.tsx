import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Shield,
} from 'lucide-react';
import type { ValidationResult } from '@/types/generation';

interface ValidationCardProps {
  result: ValidationResult;
}

const severityIcon: Record<string, any> = {
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const severityColor: Record<string, string> = {
  error: 'text-red-400',
  warning: 'text-amber-400',
  info: 'text-gray-400',
};

export default function ValidationCard({ result }: ValidationCardProps) {
  const errors = result.checks.filter((c) => !c.passed && c.severity === 'error');
  const warnings = result.checks.filter((c) => !c.passed && c.severity === 'warning');
  const passed = result.checks.filter((c) => c.passed);

  return (
    <div className={`rounded-xl border p-4 ${result.passed ? 'border-emerald-500/20 bg-emerald-500/[0.03]' : 'border-red-500/20 bg-red-500/[0.03]'}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className={`flex size-8 items-center justify-center rounded-lg ${result.passed ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
          {result.passed ? (
            <Shield className="size-4 text-emerald-400" />
          ) : (
            <AlertTriangle className="size-4 text-red-400" />
          )}
        </div>
        <div>
          <h4 className={`text-xs font-semibold ${result.passed ? 'text-emerald-300' : 'text-red-300'}`}>
            {result.passed ? 'Validation Passed' : 'Validation Issues Found'}
          </h4>
          <p className="text-[11px] text-gray-500">
            {passed.length} passed · {errors.length} errors · {warnings.length} warnings
          </p>
        </div>
      </div>

      {/* Checks */}
      <div className="flex flex-col gap-1.5">
        {result.checks.map((check, i) => {
          const Icon = check.passed ? CheckCircle2 : severityIcon[check.severity];
          const color = check.passed ? 'text-emerald-400' : severityColor[check.severity];

          return (
            <div key={i} className="flex items-start gap-2 rounded-lg bg-black/20 px-3 py-2">
              <Icon className={`size-3.5 mt-0.5 shrink-0 ${color}`} />
              <div className="min-w-0">
                <span className="text-[11px] text-gray-300">{check.name}</span>
                {check.detail && (
                  <p className="mt-0.5 text-[10px] text-gray-500">{check.detail}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
