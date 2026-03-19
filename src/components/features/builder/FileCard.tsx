import { useState } from 'react';
import {
  FileCode2,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Loader2,
  XCircle,
  Wrench,
  RefreshCw,
  Plus,
} from 'lucide-react';
import type { GeneratedFileCard } from '@/types/generation';

interface FileCardProps {
  card: GeneratedFileCard;
  isActive?: boolean;
}

const langColors: Record<string, string> = {
  html: 'text-orange-400',
  css: 'text-blue-400',
  javascript: 'text-yellow-400',
  typescript: 'text-blue-300',
  json: 'text-amber-300',
  markdown: 'text-gray-400',
};

const statusConfig: Record<string, { icon: any; label: string; color: string }> = {
  queued:     { icon: FileCode2,    label: 'Queued',      color: 'text-gray-500' },
  generating: { icon: Loader2,      label: 'Generating',  color: 'text-violet-400' },
  complete:   { icon: CheckCircle2, label: 'Created',     color: 'text-emerald-400' },
  updated:    { icon: RefreshCw,    label: 'Updated',     color: 'text-blue-400' },
  failed:     { icon: XCircle,      label: 'Failed',      color: 'text-red-400' },
  repaired:   { icon: Wrench,       label: 'Repaired',    color: 'text-amber-400' },
};

export default function FileCard({ card, isActive }: FileCardProps) {
  const [expanded, setExpanded] = useState(false);
  const config = statusConfig[card.status] || statusConfig.queued;
  const StatusIcon = config.icon;
  const isGenerating = card.status === 'generating';

  return (
    <div
      className={`rounded-xl border transition-all ${
        isActive
          ? 'border-violet-500/30 bg-violet-500/[0.03] shadow-lg shadow-violet-500/5'
          : 'border-white/[0.06] bg-zinc-900/40'
      }`}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <div className="flex size-6 items-center justify-center">
          {expanded ? (
            <ChevronDown className="size-3.5 text-gray-500" />
          ) : (
            <ChevronRight className="size-3.5 text-gray-500" />
          )}
        </div>

        <FileCode2 className={`size-4 shrink-0 ${langColors[card.language] || 'text-gray-500'}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-xs font-medium text-gray-200">{card.path}</span>
            {card.isNew ? (
              <span className="flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-400">
                <Plus className="size-2" />
                NEW
              </span>
            ) : (
              <span className="rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-medium text-blue-400">
                UPD
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-[11px] text-gray-500">{card.purpose}</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-600">{card.lineCount} lines</span>
          <StatusIcon className={`size-4 ${config.color} ${isGenerating ? 'animate-spin' : ''}`} />
        </div>
      </button>

      {/* Expanded code view */}
      {expanded && (
        <div className="border-t border-white/[0.04] bg-zinc-950/60">
          <div className="flex items-center justify-between px-4 py-1.5 border-b border-white/[0.04]">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">{card.language}</span>
            <span className={`text-[10px] ${config.color}`}>{config.label}</span>
          </div>
          <pre className="max-h-48 overflow-auto p-4 font-mono text-[11px] leading-5 text-gray-300">
            <code>{card.content.slice(0, 3000)}{card.content.length > 3000 ? '\n// ... truncated' : ''}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
