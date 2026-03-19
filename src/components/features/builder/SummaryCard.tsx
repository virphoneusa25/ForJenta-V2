import {
  Layers,
  FileCode2,
  Zap,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Eye,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import type { BuildSummary } from '@/types/generation';

interface SummaryCardProps {
  summary: BuildSummary;
}

export default function SummaryCard({ summary }: SummaryCardProps) {
  const validationColor =
    summary.validationResult === 'passed'
      ? 'text-emerald-400'
      : summary.validationResult === 'passed_with_warnings'
      ? 'text-amber-400'
      : 'text-red-400';

  const validationLabel =
    summary.validationResult === 'passed'
      ? 'All checks passed'
      : summary.validationResult === 'passed_with_warnings'
      ? 'Passed with warnings'
      : 'Issues detected';

  const previewColor =
    summary.previewStatus === 'ready'
      ? 'text-emerald-400'
      : summary.previewStatus === 'fallback'
      ? 'text-amber-400'
      : 'text-red-400';

  return (
    <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.03] to-violet-500/[0.03] p-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-violet-500/20">
          <Zap className="size-5 text-emerald-400" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-white">Build Complete</h4>
          <p className="text-[11px] text-gray-400">
            {summary.appType} · {(summary.duration / 1000).toFixed(1)}s
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="rounded-lg bg-black/20 px-3 py-2.5 text-center">
          <p className="text-lg font-bold text-white tabular-nums">{summary.filesCreated + summary.filesUpdated}</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Files</p>
        </div>
        <div className="rounded-lg bg-black/20 px-3 py-2.5 text-center">
          <p className="text-lg font-bold text-white tabular-nums">{summary.totalLines.toLocaleString()}</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Lines</p>
        </div>
        <div className="rounded-lg bg-black/20 px-3 py-2.5 text-center">
          <p className="text-lg font-bold text-white tabular-nums">{(summary.duration / 1000).toFixed(1)}s</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Duration</p>
        </div>
      </div>

      {/* File breakdown */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {summary.filesCreated > 0 && (
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
            {summary.filesCreated} created
          </span>
        )}
        {summary.filesUpdated > 0 && (
          <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400">
            {summary.filesUpdated} updated
          </span>
        )}
        {summary.filesRepaired > 0 && (
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
            {summary.filesRepaired} repaired
          </span>
        )}
        {summary.filesMissing > 0 && (
          <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-400">
            {summary.filesMissing} missing
          </span>
        )}
      </div>

      {/* Status rows */}
      <div className="flex flex-col gap-1.5 mb-4">
        <div className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2">
          <span className="flex items-center gap-2 text-[11px] text-gray-400">
            <CheckCircle2 className="size-3" />Validation
          </span>
          <span className={`text-[11px] font-medium ${validationColor}`}>{validationLabel}</span>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2">
          <span className="flex items-center gap-2 text-[11px] text-gray-400">
            <Layers className="size-3" />Manifest
          </span>
          <span className={`text-[11px] font-medium ${summary.filesMissing === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {summary.filesPlanned} planned · {summary.filesCreated + summary.filesUpdated} delivered
          </span>
        </div>

        {summary.repairCount > 0 && (
          <div className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2">
            <span className="flex items-center gap-2 text-[11px] text-gray-400">
              <Wrench className="size-3" />Repairs
            </span>
            <span className="text-[11px] font-medium text-amber-400">{summary.repairCount} auto-repaired</span>
          </div>
        )}

        <div className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2">
          <span className="flex items-center gap-2 text-[11px] text-gray-400">
            <Eye className="size-3" />Preview
          </span>
          <span className={`text-[11px] font-medium ${previewColor}`}>
            {summary.previewStatus === 'ready' ? 'Live' : summary.previewStatus === 'fallback' ? 'Safe Mode' : 'Unavailable'}
          </span>
        </div>
      </div>

      {/* What was built */}
      {summary.whatWasBuilt && summary.whatWasBuilt.length > 0 && (
        <div className="mb-4">
          <h5 className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-300 mb-2">
            <Sparkles className="size-3 text-violet-400" />
            What was built
          </h5>
          <div className="flex flex-col gap-1">
            {summary.whatWasBuilt.map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px] text-gray-400">
                <span className="text-violet-400 mt-0.5 shrink-0">•</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next actions */}
      {summary.nextActions && summary.nextActions.length > 0 && (
        <div className="border-t border-white/[0.04] pt-3">
          <h5 className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
            <ArrowRight className="size-3" />
            Suggested next
          </h5>
          <div className="flex flex-wrap gap-1.5">
            {summary.nextActions.map((action, i) => (
              <span key={i} className="rounded-full bg-zinc-800 border border-white/[0.06] px-2.5 py-1 text-[10px] text-gray-400 hover:text-gray-300 hover:border-white/10 transition-colors cursor-default">
                {action}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Stack */}
      <div className="mt-3 pt-3 border-t border-white/[0.04] flex flex-wrap gap-1.5">
        {summary.stack.map((tech) => (
          <span key={tech} className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[9px] font-medium text-violet-300">
            {tech}
          </span>
        ))}
      </div>
    </div>
  );
}
