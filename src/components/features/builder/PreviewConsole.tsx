import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Terminal,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Info,
  AlertCircle,
  MessageSquare,
  X,
  Search,
  Pause,
  Play,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────

export interface ConsoleEntry {
  id: string;
  level: 'log' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
  count: number; // for duplicate grouping
  source?: string; // optional source info
}

interface PreviewConsoleProps {
  onClose?: () => void;
}

// ─── Level config ──────────────────────────────────────────────────

const LEVEL_CONFIG: Record<string, { icon: typeof Info; color: string; bg: string; borderColor: string; label: string; badgeBg: string }> = {
  log:   { icon: MessageSquare, color: 'text-gray-400',  bg: 'bg-transparent',   borderColor: 'border-transparent',   label: 'LOG',   badgeBg: 'bg-gray-500/10 text-gray-500' },
  info:  { icon: Info,          color: 'text-blue-400',  bg: 'bg-blue-500/[0.02]', borderColor: 'border-blue-500/10',  label: 'INFO',  badgeBg: 'bg-blue-500/10 text-blue-400' },
  warn:  { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/[0.03]', borderColor: 'border-amber-500/10', label: 'WARN',  badgeBg: 'bg-amber-500/10 text-amber-400' },
  error: { icon: AlertCircle,   color: 'text-red-400',   bg: 'bg-red-500/[0.03]',   borderColor: 'border-red-500/10',  label: 'ERROR', badgeBg: 'bg-red-500/10 text-red-400' },
};

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'log', label: 'Log' },
  { value: 'info', label: 'Info' },
  { value: 'warn', label: 'Warn' },
  { value: 'error', label: 'Error' },
];

// ─── Component ─────────────────────────────────────────────────────

export default function PreviewConsole({ onClose }: PreviewConsoleProps) {
  const [entries, setEntries] = useState<ConsoleEntry[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [paused, setPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);
  const pausedEntriesRef = useRef<ConsoleEntry[]>([]);

  // Listen for postMessage from preview iframe
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'preview-console') {
        const newEntry: ConsoleEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          level: event.data.level || 'log',
          message: event.data.message || '',
          timestamp: event.data.timestamp || new Date().toISOString(),
          count: 1,
          source: event.data.source || undefined,
        };

        if (paused) {
          pausedEntriesRef.current.push(newEntry);
          return;
        }

        setEntries((prev) => {
          // Group consecutive duplicates
          if (prev.length > 0) {
            const last = prev[prev.length - 1];
            if (last.level === newEntry.level && last.message === newEntry.message) {
              return [
                ...prev.slice(0, -1),
                { ...last, count: last.count + 1, timestamp: newEntry.timestamp },
              ];
            }
          }
          return [...prev.slice(-500), newEntry]; // Keep last 500
        });
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [paused]);

  // Flush paused entries when unpausing
  useEffect(() => {
    if (!paused && pausedEntriesRef.current.length > 0) {
      setEntries((prev) => [...prev, ...pausedEntriesRef.current].slice(-500));
      pausedEntriesRef.current = [];
    }
  }, [paused]);

  // Auto-scroll
  useEffect(() => {
    if (autoScrollRef.current && scrollRef.current && !paused) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, paused]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    autoScrollRef.current = scrollHeight - scrollTop - clientHeight < 40;
  };

  const handleClear = useCallback(() => {
    setEntries([]);
    pausedEntriesRef.current = [];
  }, []);

  const handleCopyAll = useCallback(() => {
    const text = entries
      .map((e) => `[${new Date(e.timestamp).toLocaleTimeString()}] [${e.level.toUpperCase()}] ${e.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [entries]);

  // Filter + search
  const filtered = entries.filter((e) => {
    if (filter !== 'all' && e.level !== filter) return false;
    if (searchQuery && !e.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const errorCount = entries.filter((e) => e.level === 'error').length;
  const warnCount = entries.filter((e) => e.level === 'warn').length;

  return (
    <div className="flex flex-col border-t border-white/5 bg-zinc-950">
      {/* Header */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-white/5 px-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors"
          >
            {expanded ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />}
            <Terminal className="size-3.5" />
            <span className="text-[11px] font-medium">Console</span>
          </button>

          {/* Counts */}
          {errorCount > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-red-500/10 px-1.5 py-0.5 text-[9px] font-medium text-red-400">
              <AlertCircle className="size-2.5" />
              {errorCount}
            </span>
          )}
          {warnCount > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium text-amber-400">
              <AlertTriangle className="size-2.5" />
              {warnCount}
            </span>
          )}

          {/* Filter */}
          <div className="ml-2 flex items-center gap-0.5">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                  filter === opt.value
                    ? 'bg-white/10 text-white'
                    : 'text-gray-600 hover:text-gray-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Search toggle */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`rounded p-0.5 transition-colors ${
              showSearch ? 'bg-white/10 text-white' : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
            }`}
            title="Search"
          >
            <Search className="size-3" />
          </button>

          {/* Pause toggle */}
          <button
            onClick={() => setPaused(!paused)}
            className={`rounded p-0.5 transition-colors ${
              paused ? 'bg-amber-500/10 text-amber-400' : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
            }`}
            title={paused ? 'Resume' : 'Pause'}
          >
            {paused ? <Play className="size-3" /> : <Pause className="size-3" />}
          </button>

          <button
            onClick={handleCopyAll}
            disabled={entries.length === 0}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-gray-500 hover:bg-white/5 hover:text-gray-300 disabled:opacity-30"
            title="Copy all"
          >
            {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          </button>
          <button
            onClick={handleClear}
            disabled={entries.length === 0}
            className="rounded p-0.5 text-gray-500 hover:bg-white/5 hover:text-gray-300 disabled:opacity-30"
            title="Clear console"
          >
            <Trash2 className="size-3" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded p-0.5 text-gray-500 hover:bg-white/5 hover:text-gray-300"
              title="Close console"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      </div>

      {/* Search bar */}
      {showSearch && expanded && (
        <div className="flex items-center gap-2 border-b border-white/5 px-3 py-1.5">
          <Search className="size-3 text-gray-600 shrink-0" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter console output..."
            className="flex-1 bg-transparent text-[11px] text-gray-300 outline-none placeholder-gray-600"
            autoFocus
          />
          {searchQuery && (
            <span className="text-[9px] text-gray-600 tabular-nums">
              {filtered.length} match{filtered.length !== 1 ? 'es' : ''}
            </span>
          )}
        </div>
      )}

      {/* Paused banner */}
      {paused && expanded && (
        <div className="flex items-center justify-center gap-2 border-b border-amber-500/10 bg-amber-500/[0.03] py-1">
          <Pause className="size-3 text-amber-400" />
          <span className="text-[10px] text-amber-400">
            Paused — {pausedEntriesRef.current.length} message{pausedEntriesRef.current.length !== 1 ? 's' : ''} queued
          </span>
          <button
            onClick={() => setPaused(false)}
            className="text-[10px] font-medium text-amber-300 hover:text-amber-200 transition-colors underline"
          >
            Resume
          </button>
        </div>
      )}

      {/* Entries */}
      {expanded && (
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="max-h-56 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent"
        >
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center py-6 text-[11px] text-gray-600">
              {entries.length === 0 ? (
                <div className="flex flex-col items-center gap-1.5">
                  <Terminal className="size-4 text-gray-700" />
                  <span>No console output yet</span>
                  <span className="text-[10px] text-gray-700">console.log, console.warn, and console.error from the preview will appear here</span>
                </div>
              ) : (
                `No ${filter !== 'all' ? filter : ''} entries${searchQuery ? ` matching "${searchQuery}"` : ''}`
              )}
            </div>
          ) : (
            <div className="flex flex-col">
              {filtered.map((entry) => {
                const config = LEVEL_CONFIG[entry.level] || LEVEL_CONFIG.log;
                const Icon = config.icon;

                return (
                  <div
                    key={entry.id}
                    className={`group flex items-start gap-2 border-b px-3 py-1.5 ${config.bg} ${config.borderColor} hover:bg-white/[0.02] transition-colors`}
                  >
                    {/* Severity badge */}
                    <span className={`shrink-0 mt-0.5 rounded px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider ${config.badgeBg}`}>
                      {config.label}
                    </span>

                    {/* Icon */}
                    <Icon className={`size-3 mt-0.5 shrink-0 ${config.color}`} />

                    {/* Message */}
                    <pre className="flex-1 whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-gray-300">
                      {entry.message}
                    </pre>

                    {/* Duplicate count */}
                    {entry.count > 1 && (
                      <span className="shrink-0 rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-bold text-violet-400 tabular-nums mt-0.5">
                        {entry.count}
                      </span>
                    )}

                    {/* Timestamp */}
                    <span className="shrink-0 text-[9px] text-gray-700 tabular-nums mt-0.5">
                      {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 } as Intl.DateTimeFormatOptions)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
