import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Loader2,
  FileCode2,
  Layers,
  Wrench,
  AlertTriangle,
  FolderOpen,
  ArrowRight,
  History,
  RefreshCw,
} from 'lucide-react';
import { fetchUserBuildRuns } from '@/lib/buildLogs';
import { useAuthStore } from '@/stores/authStore';

interface BuildRun {
  id: string;
  project_id: string;
  prompt: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  total_files: number | null;
  total_lines: number | null;
  app_type: string | null;
  stack: string[] | null;
  validation_result: string | null;
  repair_count: number | null;
  preview_status: string | null;
  error_message: string | null;
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatDuration(ms: number | null): string {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; bg: string; label: string }> = {
  complete: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Complete' },
  failed:   { icon: XCircle,      color: 'text-red-400',     bg: 'bg-red-500/10',     label: 'Failed' },
  running:  { icon: Loader2,      color: 'text-violet-400',  bg: 'bg-violet-500/10',  label: 'Running' },
};

const VALIDATION_BADGE: Record<string, { color: string; bg: string; label: string }> = {
  passed:              { color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Passed' },
  passed_with_warnings: { color: 'text-amber-400',   bg: 'bg-amber-500/10',   label: 'Warnings' },
  failed:              { color: 'text-red-400',     bg: 'bg-red-500/10',     label: 'Failed' },
};

function BuildRunCard({ run }: { run: BuildRun }) {
  const navigate = useNavigate();
  const statusCfg = STATUS_CONFIG[run.status] || STATUS_CONFIG.complete;
  const StatusIcon = statusCfg.icon;
  const validationBadge = run.validation_result ? VALIDATION_BADGE[run.validation_result] : null;

  const handleOpenProject = () => {
    navigate(`/project/${run.project_id}`);
  };

  return (
    <button
      onClick={handleOpenProject}
      className="group flex w-full flex-col gap-2.5 rounded-xl border border-white/[0.06] bg-zinc-900/40 p-4 text-left transition-all hover:border-violet-500/20 hover:bg-violet-500/[0.02] hover:shadow-sm hover:shadow-violet-500/5 active:scale-[0.995]"
    >
      {/* Top row: status + time */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`flex size-6 items-center justify-center rounded-lg ${statusCfg.bg}`}>
            <StatusIcon className={`size-3.5 ${statusCfg.color} ${run.status === 'running' ? 'animate-spin' : ''}`} />
          </div>
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${statusCfg.color}`}>
            {statusCfg.label}
          </span>
        </div>
        <span className="flex items-center gap-1 text-[10px] text-gray-600">
          <Clock className="size-2.5" />
          {formatTimeAgo(run.created_at)}
        </span>
      </div>

      {/* Prompt */}
      <p className="text-xs text-gray-300 line-clamp-2 leading-relaxed">
        {run.prompt}
      </p>

      {/* Stats row */}
      <div className="flex items-center gap-3 flex-wrap">
        {run.total_files != null && run.total_files > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-gray-500">
            <FileCode2 className="size-3" />
            {run.total_files} files
          </span>
        )}
        {run.total_lines != null && run.total_lines > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-gray-500">
            <Layers className="size-3" />
            {run.total_lines.toLocaleString()} lines
          </span>
        )}
        {run.duration_ms != null && (
          <span className="flex items-center gap-1 text-[10px] text-gray-500">
            <Clock className="size-3" />
            {formatDuration(run.duration_ms)}
          </span>
        )}
        {run.repair_count != null && run.repair_count > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-amber-400">
            <Wrench className="size-3" />
            {run.repair_count} repair{run.repair_count > 1 ? 's' : ''}
          </span>
        )}
        {validationBadge && (
          <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${validationBadge.bg} ${validationBadge.color}`}>
            {validationBadge.label}
          </span>
        )}
      </div>

      {/* App type + stack */}
      {(run.app_type || (run.stack && run.stack.length > 0)) && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {run.app_type && (
            <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[9px] font-medium text-violet-400">
              {run.app_type}
            </span>
          )}
          {run.stack?.slice(0, 3).map((s) => (
            <span key={s} className="rounded-full bg-white/[0.04] px-1.5 py-0.5 text-[9px] text-gray-500">
              {s}
            </span>
          ))}
        </div>
      )}

      {/* Error message for failed builds */}
      {run.status === 'failed' && run.error_message && (
        <div className="flex items-start gap-1.5 rounded-lg bg-red-500/[0.04] border border-red-500/10 px-3 py-2">
          <AlertTriangle className="size-3 text-red-400 mt-0.5 shrink-0" />
          <p className="text-[10px] text-red-400/80 line-clamp-2">{run.error_message}</p>
        </div>
      )}

      {/* Open project action */}
      <div className="flex items-center gap-1.5 text-[10px] text-gray-600 group-hover:text-violet-400 transition-colors mt-0.5">
        <ArrowRight className="size-3 opacity-0 -ml-1 transition-all group-hover:opacity-100 group-hover:ml-0" />
        Open project
      </div>
    </button>
  );
}

export default function BuildHistoryPanel() {
  const user = useAuthStore((s) => s.user);
  const [collapsed, setCollapsed] = useState(false);
  const [runs, setRuns] = useState<BuildRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadRuns = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const data = await fetchUserBuildRuns(user.id, 10);
    setRuns(data as BuildRun[]);
    setLoading(false);
    setHasLoaded(true);
  }, [user]);

  // Load on first expand
  useEffect(() => {
    if (!collapsed && !hasLoaded && user) {
      loadRuns();
    }
  }, [collapsed, hasLoaded, user, loadRuns]);

  if (!user) return null;

  const completedCount = runs.filter((r) => r.status === 'complete').length;
  const failedCount = runs.filter((r) => r.status === 'failed').length;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-zinc-950/80 overflow-hidden backdrop-blur-sm">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between px-6 py-4 md:px-8 md:py-5 text-left transition-colors hover:bg-white/[0.01]"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-xl bg-violet-500/10">
            <History className="size-4 text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Build History</h3>
            {hasLoaded && (
              <p className="text-[11px] text-gray-500 mt-0.5">
                {runs.length} build{runs.length !== 1 ? 's' : ''}
                {completedCount > 0 && <span className="text-emerald-500"> · {completedCount} completed</span>}
                {failedCount > 0 && <span className="text-red-500"> · {failedCount} failed</span>}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!collapsed && hasLoaded && (
            <button
              onClick={(e) => { e.stopPropagation(); loadRuns(); }}
              className="rounded-lg p-1.5 text-gray-600 hover:bg-white/5 hover:text-gray-400 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
          {collapsed ? (
            <ChevronRight className="size-4 text-gray-600" />
          ) : (
            <ChevronDown className="size-4 text-gray-600" />
          )}
        </div>
      </button>

      {/* Content */}
      {!collapsed && (
        <div className="border-t border-white/[0.04] px-6 pb-6 md:px-8 md:pb-8">
          {loading && !hasLoaded ? (
            <div className="flex items-center justify-center py-10 gap-2">
              <Loader2 className="size-4 text-violet-400 animate-spin" />
              <span className="text-xs text-gray-500">Loading build history...</span>
            </div>
          ) : runs.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-white/[0.03]">
                <FolderOpen className="size-6 text-gray-600" />
              </div>
              <p className="mt-4 text-sm font-medium text-gray-400">No builds yet</p>
              <p className="mt-1 text-xs text-gray-600">
                Generate your first app to see build history here
              </p>
            </div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {runs.map((run) => (
                <BuildRunCard key={run.id} run={run} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
