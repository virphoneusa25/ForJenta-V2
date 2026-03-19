import { useState, useEffect, useRef, useMemo } from 'react';
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
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
} from 'lucide-react';
import type { GeneratedFileCard } from '@/types/generation';

interface StreamedFileCardProps {
  card: GeneratedFileCard;
  isActive?: boolean;
  defaultExpanded?: boolean;
}

const GROUP_COLORS: Record<string, string> = {
  boot: 'bg-orange-500/10 text-orange-400',
  page: 'bg-indigo-500/10 text-indigo-400',
  component: 'bg-cyan-500/10 text-cyan-400',
  hook: 'bg-violet-500/10 text-violet-400',
  lib: 'bg-emerald-500/10 text-emerald-400',
  style: 'bg-pink-500/10 text-pink-400',
  config: 'bg-gray-500/10 text-gray-400',
  doc: 'bg-gray-500/10 text-gray-400',
  type: 'bg-teal-500/10 text-teal-400',
};

// ─── Language config ───────────────────────────────────────────────

const LANG_COLORS: Record<string, string> = {
  html: 'text-orange-400',
  css: 'text-blue-400',
  javascript: 'text-yellow-400',
  typescript: 'text-blue-300',
  json: 'text-amber-300',
  markdown: 'text-gray-400',
  python: 'text-green-400',
};

const LANG_BADGES: Record<string, { label: string; bg: string }> = {
  html: { label: 'HTML', bg: 'bg-orange-500/10 text-orange-400' },
  css: { label: 'CSS', bg: 'bg-blue-500/10 text-blue-400' },
  javascript: { label: 'JS', bg: 'bg-yellow-500/10 text-yellow-400' },
  typescript: { label: 'TS', bg: 'bg-blue-500/10 text-blue-300' },
  json: { label: 'JSON', bg: 'bg-amber-500/10 text-amber-400' },
  markdown: { label: 'MD', bg: 'bg-gray-500/10 text-gray-400' },
  python: { label: 'PY', bg: 'bg-green-500/10 text-green-400' },
};

const STATUS_CONFIG: Record<string, { icon: typeof FileCode2; label: string; color: string; ringColor: string }> = {
  queued:     { icon: FileCode2,    label: 'Queued',      color: 'text-gray-500',    ringColor: 'ring-gray-500/20' },
  generating: { icon: Loader2,      label: 'Writing',     color: 'text-violet-400',  ringColor: 'ring-violet-500/30' },
  streaming:  { icon: Loader2,      label: 'Streaming',   color: 'text-violet-400',  ringColor: 'ring-violet-500/30' },
  complete:   { icon: CheckCircle2, label: 'Created',     color: 'text-emerald-400', ringColor: 'ring-emerald-500/20' },
  updated:    { icon: RefreshCw,    label: 'Updated',     color: 'text-blue-400',    ringColor: 'ring-blue-500/20' },
  failed:     { icon: XCircle,      label: 'Failed',      color: 'text-red-400',     ringColor: 'ring-red-500/20' },
  repaired:   { icon: Wrench,       label: 'Repaired',    color: 'text-amber-400',   ringColor: 'ring-amber-500/20' },
};

// ─── Streaming cursor ─────────────────────────────────────────────

function StreamCursor() {
  return (
    <span className="inline-block w-[7px] h-4 bg-violet-400 animate-pulse rounded-sm ml-px align-text-bottom" />
  );
}

// ─── Line numbers ──────────────────────────────────────────────────

function LineNumbers({ count }: { count: number }) {
  return (
    <div className="select-none pr-3 text-right font-mono text-[10px] leading-5 text-gray-700">
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>{i + 1}</div>
      ))}
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────

export default function StreamedFileCard({ card, isActive, defaultExpanded }: StreamedFileCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false);
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLPreElement>(null);

  const config = STATUS_CONFIG[card.status] || STATUS_CONFIG.queued;
  const StatusIcon = config.icon;
  const isStreaming = card.status === 'generating' || card.status === 'streaming';
  const langBadge = LANG_BADGES[card.language] || { label: card.language.toUpperCase(), bg: 'bg-gray-500/10 text-gray-500' };

  // Visible content: show only up to streamedLength for streaming effect
  const visibleContent = useMemo(() => {
    if (!isStreaming || card.streamedLength >= card.content.length) {
      return card.content;
    }
    return card.content.slice(0, card.streamedLength);
  }, [card.content, card.streamedLength, isStreaming]);

  const visibleLineCount = useMemo(() => {
    return visibleContent.split('\n').length;
  }, [visibleContent]);

  // Auto-scroll code container while streaming
  useEffect(() => {
    if (isStreaming && expanded && codeRef.current) {
      codeRef.current.scrollTop = codeRef.current.scrollHeight;
    }
  }, [visibleContent, isStreaming, expanded]);

  // Auto-expand when active and streaming
  useEffect(() => {
    if (isActive && isStreaming) {
      setExpanded(true);
    }
  }, [isActive, isStreaming]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(card.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Stream progress percentage
  const streamProgress = isStreaming
    ? Math.round((card.streamedLength / Math.max(card.content.length, 1)) * 100)
    : 100;

  return (
    <div
      className={`group rounded-xl border transition-all duration-300 overflow-hidden ${
        isActive
          ? `border-violet-500/30 bg-violet-500/[0.04] shadow-lg shadow-violet-500/5 ${isStreaming ? 'ring-1 ring-violet-500/20' : ''}`
          : card.status === 'failed'
          ? 'border-red-500/20 bg-red-500/[0.02]'
          : card.status === 'repaired'
          ? 'border-amber-500/20 bg-amber-500/[0.02]'
          : 'border-white/[0.06] bg-zinc-900/40 hover:border-white/[0.10]'
      }`}
    >
      {/* ─── Header ─── */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.02]"
      >
        {/* Expand/collapse chevron */}
        <div className="flex size-5 shrink-0 items-center justify-center">
          {expanded ? (
            <ChevronDown className="size-3.5 text-gray-500 transition-transform" />
          ) : (
            <ChevronRight className="size-3.5 text-gray-500 transition-transform" />
          )}
        </div>

        {/* File icon */}
        <FileCode2
          className={`size-4 shrink-0 ${LANG_COLORS[card.language] || 'text-gray-500'}`}
        />

        {/* File path + purpose */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="truncate text-xs font-medium text-gray-200">
              {card.path}
            </span>

            {/* New / Updated badge */}
            {card.isNew ? (
              <span className="flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-400 uppercase tracking-wider">
                <Plus className="size-2" />
                New
              </span>
            ) : (
              <span className="rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-blue-400 uppercase tracking-wider">
                Upd
              </span>
            )}

            {/* Group badge */}
            {card.group && (
              <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${GROUP_COLORS[card.group] || GROUP_COLORS.config}`}>
                {card.group}
              </span>
            )}

            {/* Language badge */}
            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${langBadge.bg}`}>
              {langBadge.label}
            </span>

            {/* Validation badge */}
            {card.validationPassed !== undefined && !isStreaming && (
              <span
                className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                  card.validationPassed
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-red-500/10 text-red-400'
                }`}
                title={card.validationDetail}
              >
                {card.validationPassed ? (
                  <ShieldCheck className="size-2.5" />
                ) : (
                  <ShieldAlert className="size-2.5" />
                )}
                {card.validationPassed ? 'Valid' : 'Issues'}
              </span>
            )}

            {/* Repair badge */}
            {card.repairedAt && (
              <span
                className="flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium text-amber-400"
                title={card.repairDetail || `Repaired at ${card.repairedAt}`}
              >
                <Wrench className="size-2.5" />
                Repaired
              </span>
            )}
          </div>

          <p className="mt-0.5 truncate text-[11px] text-gray-500">{card.purpose}</p>
        </div>

        {/* Right side: lines + status */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Line count */}
          <span className="text-[10px] text-gray-600 tabular-nums">
            {isStreaming ? `${visibleLineCount}/${card.lineCount}` : `${card.lineCount}`} lines
          </span>

          {/* Status icon */}
          <div className={`flex size-6 items-center justify-center rounded-full ${config.ringColor} ring-1`}>
            <StatusIcon
              className={`size-3.5 ${config.color} ${isStreaming ? 'animate-spin' : ''}`}
            />
          </div>
        </div>
      </button>

      {/* ─── Streaming progress bar ─── */}
      {isStreaming && (
        <div className="mx-4 h-0.5 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-150 ease-linear"
            style={{ width: `${streamProgress}%` }}
          />
        </div>
      )}

      {/* ─── Expanded code view ─── */}
      {expanded && (
        <div className="border-t border-white/[0.04] bg-zinc-950/80">
          {/* Code toolbar */}
          <div className="flex items-center justify-between px-4 py-1.5 border-b border-white/[0.04]">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
                {card.language}
              </span>
              {isStreaming && (
                <span className="flex items-center gap-1 text-[10px] text-violet-400">
                  <span className="size-1.5 rounded-full bg-violet-400 animate-pulse" />
                  {streamProgress}%
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] ${config.color}`}>{config.label}</span>
              {!isStreaming && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-gray-500 transition-colors hover:bg-white/5 hover:text-gray-300"
                >
                  {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>
          </div>

          {/* Code block with line numbers */}
          <pre
            ref={codeRef}
            className="flex max-h-64 overflow-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent"
          >
            <LineNumbers count={visibleLineCount} />
            <code className="flex-1 overflow-x-auto p-4 pl-0 font-mono text-[11px] leading-5 text-gray-300 whitespace-pre">
              {visibleContent}
              {isStreaming && <StreamCursor />}
            </code>
          </pre>

          {/* Truncated notice for very long files */}
          {!isStreaming && card.content.length > 5000 && !expanded && (
            <div className="border-t border-white/[0.04] px-4 py-2 text-center">
              <span className="text-[10px] text-gray-600">
                Showing first 5000 chars · {card.lineCount} lines total
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
