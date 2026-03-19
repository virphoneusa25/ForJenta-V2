import { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
  SkipForward,
  Wrench,
  Clock,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import type { BuildStep, StepStatus, StepSubDetail } from '@/types/generation';

interface BuildTimelineProps {
  steps: BuildStep[];
  compact?: boolean;
}

const STATUS_CONFIG: Record<StepStatus, { icon: any; color: string; bg: string; lineColor: string }> = {
  queued:   { icon: Circle,       color: 'text-gray-600', bg: 'bg-gray-600/10', lineColor: 'bg-white/[0.06]' },
  running:  { icon: Loader2,      color: 'text-violet-400', bg: 'bg-violet-500/10', lineColor: 'bg-violet-500/30' },
  success:  { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', lineColor: 'bg-emerald-500/20' },
  failed:   { icon: XCircle,      color: 'text-red-400', bg: 'bg-red-500/10', lineColor: 'bg-red-500/20' },
  repaired: { icon: Wrench,       color: 'text-amber-400', bg: 'bg-amber-500/10', lineColor: 'bg-amber-500/20' },
  skipped:  { icon: SkipForward,  color: 'text-gray-500', bg: 'bg-gray-500/10', lineColor: 'bg-gray-500/10' },
};

function formatDuration(start?: string, end?: string): string {
  if (!start) return '';
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  const ms = e - s;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ─── Animated Circular Progress Ring ────────────────────────────────

function CircularProgress({
  progress,
  completedCount,
  totalCount,
  currentStepLabel,
  isComplete,
  hasFailed,
}: {
  progress: number;
  completedCount: number;
  totalCount: number;
  currentStepLabel?: string;
  isComplete: boolean;
  hasFailed: boolean;
}) {
  const radius = 42;
  const strokeWidth = 5;
  const size = (radius + strokeWidth) * 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  // Animated progress value for smooth transitions
  const [animatedOffset, setAnimatedOffset] = useState(circumference);
  const prevProgressRef = useRef(0);

  useEffect(() => {
    // Smooth animation via RAF
    const target = circumference - (progress / 100) * circumference;
    setAnimatedOffset(target);
    prevProgressRef.current = progress;
  }, [progress, circumference]);

  const gradientId = 'progress-ring-gradient';
  const glowId = 'progress-ring-glow';

  return (
    <div className="relative flex flex-col items-center">
      <div className="relative">
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
          style={{ filter: isComplete ? 'drop-shadow(0 0 8px rgba(16,185,129,0.3))' : hasFailed ? 'drop-shadow(0 0 8px rgba(239,68,68,0.3))' : 'drop-shadow(0 0 6px rgba(139,92,246,0.2))' }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              {isComplete ? (
                <>
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#34d399" />
                </>
              ) : hasFailed ? (
                <>
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#f87171" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="50%" stopColor="#a78bfa" />
                  <stop offset="100%" stopColor="#d946ef" />
                </>
              )}
            </linearGradient>
            <filter id={glowId}>
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={strokeWidth}
          />

          {/* Subtle tick marks */}
          {Array.from({ length: totalCount }, (_, i) => {
            const angle = (i / totalCount) * 360 - 90;
            const rad = (angle * Math.PI) / 180;
            const x1 = center + (radius - 2) * Math.cos(rad);
            const y1 = center + (radius - 2) * Math.sin(rad);
            const x2 = center + (radius + 2) * Math.cos(rad);
            const y2 = center + (radius + 2) * Math.sin(rad);
            return (
              <line
                key={i}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="1"
              />
            );
          })}

          {/* Progress arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={animatedOffset}
            strokeLinecap="round"
            filter={`url(#${glowId})`}
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {isComplete ? (
            <>
              <CheckCircle2 className="size-5 text-emerald-400 mb-0.5" />
              <span className="text-[10px] font-semibold text-emerald-400">Complete</span>
            </>
          ) : hasFailed ? (
            <>
              <XCircle className="size-5 text-red-400 mb-0.5" />
              <span className="text-[10px] font-semibold text-red-400">Failed</span>
            </>
          ) : (
            <>
              <span className="text-lg font-bold text-white tabular-nums leading-none">
                {Math.round(progress)}
                <span className="text-[10px] text-gray-500">%</span>
              </span>
              <span className="text-[9px] text-gray-500 mt-0.5 tabular-nums">
                {completedCount}/{totalCount}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Current step label below ring */}
      {currentStepLabel && !isComplete && !hasFailed && (
        <div className="mt-2.5 flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/[0.06] border border-violet-500/10">
          <Loader2 className="size-3 text-violet-400 animate-spin" />
          <span className="text-[11px] font-medium text-violet-300 truncate max-w-[160px]">
            {currentStepLabel}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Sub-detail badge ──────────────────────────────────────────────

function SubDetailBadge({ detail }: { detail: StepSubDetail }) {
  const statusColors = {
    ok: 'text-emerald-400',
    warn: 'text-amber-400',
    error: 'text-red-400',
  };
  const color = detail.status ? statusColors[detail.status] : 'text-gray-400';

  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <span className="text-[10px] text-gray-500 min-w-0 truncate">{detail.label}</span>
      <span className={`text-[10px] font-medium tabular-nums shrink-0 ${color}`}>{detail.value}</span>
    </div>
  );
}

// ─── Expandable step row ───────────────────────────────────────────

function ExpandableStep({ step, isLast }: { step: BuildStep; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const config = STATUS_CONFIG[step.status];
  const Icon = config.icon;
  const isActive = step.status === 'running';
  const hasSubDetails = step.subDetails && step.subDetails.length > 0;
  const isExpandable = hasSubDetails && (step.status === 'success' || step.status === 'failed' || step.status === 'repaired');

  return (
    <div className="flex items-start gap-3">
      {/* Timeline line + icon */}
      <div className="flex flex-col items-center">
        <div className={`flex size-6 shrink-0 items-center justify-center rounded-full ${config.bg}`}>
          <Icon className={`size-3.5 ${config.color} ${isActive ? 'animate-spin' : ''}`} />
        </div>
        {!isLast && (
          <div className={`w-px flex-1 min-h-[16px] ${config.lineColor}`} />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 pb-2 min-w-0 ${step.status === 'queued' ? 'opacity-40' : ''}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {isExpandable && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="shrink-0 rounded p-0.5 hover:bg-white/5 transition-colors"
              >
                {expanded ? (
                  <ChevronDown className="size-3 text-gray-500" />
                ) : (
                  <ChevronRight className="size-3 text-gray-500" />
                )}
              </button>
            )}
            <span className={`text-xs font-medium truncate ${
              isActive ? 'text-violet-300' : step.status === 'success' ? 'text-gray-300' : step.status === 'failed' ? 'text-red-300' : 'text-gray-500'
            }`}>
              {step.label}
            </span>
          </div>
          {step.startedAt && (
            <span className="flex items-center gap-1 text-[10px] text-gray-600 shrink-0">
              <Clock className="size-2.5" />
              {formatDuration(step.startedAt, step.completedAt)}
            </span>
          )}
        </div>

        {step.detail && (
          <p className="mt-0.5 text-[11px] text-gray-500">{step.detail}</p>
        )}
        {step.errorMessage && (
          <p className="mt-0.5 text-[11px] text-red-400">{step.errorMessage}</p>
        )}

        {/* Active step: show sub-details inline while running */}
        {isActive && hasSubDetails && (
          <div className="mt-1.5 rounded-lg bg-violet-500/[0.04] border border-violet-500/10 px-2.5 py-1.5">
            {step.subDetails!.map((d, i) => (
              <SubDetailBadge key={i} detail={d} />
            ))}
          </div>
        )}

        {/* Completed step: expandable sub-details */}
        {expanded && hasSubDetails && (
          <div className="mt-1.5 rounded-lg bg-black/20 border border-white/[0.04] px-2.5 py-1.5">
            {step.subDetails!.map((d, i) => (
              <SubDetailBadge key={i} detail={d} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Timeline ─────────────────────────────────────────────────

export default function BuildTimeline({ steps, compact }: BuildTimelineProps) {
  if (steps.length === 0) return null;

  const activeIdx = steps.findIndex((s) => s.status === 'running');
  const completedCount = steps.filter((s) => s.status === 'success' || s.status === 'skipped').length;
  const failedCount = steps.filter((s) => s.status === 'failed').length;
  const progress = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;
  const isComplete = completedCount === steps.length;
  const hasFailed = failedCount > 0 && activeIdx === -1;
  const currentStep = activeIdx >= 0 ? steps[activeIdx] : undefined;

  // In compact mode, show only relevant steps
  const [showAllSteps, setShowAllSteps] = useState(false);

  const visibleSteps = compact && !showAllSteps
    ? steps.filter((s, i) => {
        if (s.status === 'failed' || s.status === 'repaired') return true;
        if (s.status === 'running') return true;
        if (s.status === 'success' && i >= (activeIdx >= 0 ? activeIdx - 1 : steps.length - 3)) return true;
        if (s.status === 'queued' && activeIdx >= 0 && i <= activeIdx + 2) return true;
        return false;
      })
    : steps;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-zinc-900/50 overflow-hidden">
      {/* ─── Ring Header ─── */}
      <div className="flex flex-col items-center py-5 px-4 bg-gradient-to-b from-white/[0.01] to-transparent">
        <CircularProgress
          progress={progress}
          completedCount={completedCount}
          totalCount={steps.length}
          currentStepLabel={currentStep?.label}
          isComplete={isComplete}
          hasFailed={hasFailed}
        />
      </div>

      {/* ─── Step List ─── */}
      <div className="border-t border-white/[0.04] px-4 pt-3 pb-3">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-600">Pipeline Steps</span>
          {compact && steps.length > visibleSteps.length && (
            <button
              onClick={() => setShowAllSteps(!showAllSteps)}
              className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
            >
              {showAllSteps ? (
                <>
                  <ChevronDown className="size-3" />
                  Collapse
                </>
              ) : (
                <>
                  <ChevronRight className="size-3" />
                  Show all {steps.length}
                </>
              )}
            </button>
          )}
        </div>

        <div className="flex flex-col gap-0.5">
          {visibleSteps.map((step, i) => (
            <ExpandableStep
              key={step.id}
              step={step}
              isLast={i === visibleSteps.length - 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
