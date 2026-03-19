import { Wrench, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import type { RepairAction } from '@/types/generation';

interface RepairCardProps {
  actions: RepairAction[];
}

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
  pending:     { icon: Wrench,       color: 'text-gray-400',   label: 'Pending' },
  in_progress: { icon: Loader2,      color: 'text-amber-400',  label: 'Repairing' },
  fixed:       { icon: CheckCircle2, color: 'text-emerald-400', label: 'Fixed' },
  failed:      { icon: XCircle,      color: 'text-red-400',     label: 'Failed' },
};

export default function RepairCard({ actions }: RepairCardProps) {
  if (actions.length === 0) return null;

  const fixedCount = actions.filter((a) => a.status === 'fixed').length;

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.03] p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10">
          <Wrench className="size-4 text-amber-400" />
        </div>
        <div>
          <h4 className="text-xs font-semibold text-amber-300">Auto-Repair</h4>
          <p className="text-[11px] text-gray-500">
            {fixedCount}/{actions.length} issues resolved
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {actions.map((action) => {
          const config = statusConfig[action.status];
          const Icon = config.icon;

          return (
            <div key={action.id} className="flex items-start gap-2 rounded-lg bg-black/20 px-3 py-2">
              <Icon className={`size-3.5 mt-0.5 shrink-0 ${config.color} ${action.status === 'in_progress' ? 'animate-spin' : ''}`} />
              <div className="min-w-0 flex-1">
                <span className="text-[11px] text-gray-300">{action.issue}</span>
                <p className="mt-0.5 text-[10px] text-gray-500">{action.action}</p>
              </div>
              <span className={`text-[10px] ${config.color}`}>{config.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
