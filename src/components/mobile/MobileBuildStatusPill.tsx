/**
 * MobileBuildStatusPill - Premium status indicator pill
 * 
 * A compact, animated status indicator for showing build progress
 * with glowing orb and clear typography.
 */

import { Loader2, Check, AlertTriangle, Sparkles, Code2, Wrench, TestTube } from 'lucide-react';
import { cn } from '@/lib/utils';

type BuildStatus = 'idle' | 'processing' | 'generating' | 'validating' | 'repairing' | 'preview_ready' | 'paused' | 'failed' | 'complete';

interface MobileBuildStatusPillProps {
  status: BuildStatus;
  message?: string;
  className?: string;
}

const STATUS_CONFIG: Record<BuildStatus, {
  icon: typeof Loader2;
  label: string;
  color: string;
  bgColor: string;
  glowColor: string;
  animate: boolean;
}> = {
  idle: {
    icon: Sparkles,
    label: 'Ready',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    glowColor: '',
    animate: false,
  },
  processing: {
    icon: Loader2,
    label: 'Processing...',
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    glowColor: 'shadow-violet-500/30',
    animate: true,
  },
  generating: {
    icon: Code2,
    label: 'Generating code...',
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    glowColor: 'shadow-violet-500/30',
    animate: true,
  },
  validating: {
    icon: TestTube,
    label: 'Validating...',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    glowColor: 'shadow-cyan-500/30',
    animate: true,
  },
  repairing: {
    icon: Wrench,
    label: 'Repairing...',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    glowColor: 'shadow-amber-500/30',
    animate: true,
  },
  preview_ready: {
    icon: Check,
    label: 'Preview ready',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    glowColor: 'shadow-emerald-500/30',
    animate: false,
  },
  paused: {
    icon: Sparkles,
    label: 'Paused',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    glowColor: '',
    animate: false,
  },
  failed: {
    icon: AlertTriangle,
    label: 'Failed',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    glowColor: 'shadow-red-500/30',
    animate: false,
  },
  complete: {
    icon: Check,
    label: 'Complete',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    glowColor: 'shadow-emerald-500/30',
    animate: false,
  },
};

export default function MobileBuildStatusPill({
  status,
  message,
  className,
}: MobileBuildStatusPillProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  const displayMessage = message || config.label;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2.5 px-4 py-2 rounded-full",
        config.bgColor,
        "border border-white/[0.06]",
        config.animate && "shadow-lg",
        config.animate && config.glowColor,
        "transition-all duration-300",
        className
      )}
      data-testid="mobile-build-status"
    >
      {/* Animated orb */}
      <span className="relative flex size-2.5">
        {config.animate && (
          <span className={cn(
            "absolute inset-0 rounded-full animate-ping opacity-60",
            status === 'validating' ? 'bg-cyan-400' :
            status === 'repairing' ? 'bg-amber-400' :
            status === 'failed' ? 'bg-red-400' :
            'bg-violet-400'
          )} />
        )}
        <span className={cn(
          "relative rounded-full size-2.5",
          status === 'validating' ? 'bg-cyan-500' :
          status === 'repairing' ? 'bg-amber-500' :
          status === 'failed' ? 'bg-red-500' :
          status === 'complete' || status === 'preview_ready' ? 'bg-emerald-500' :
          status === 'idle' || status === 'paused' ? 'bg-gray-500' :
          'bg-violet-500'
        )} />
      </span>

      {/* Status label */}
      <span className={cn(
        "text-[13px] font-medium tracking-wide",
        config.color
      )}>
        {displayMessage}
      </span>
    </div>
  );
}

/**
 * Inline status indicator for smaller contexts
 */
export function StatusDot({ 
  status, 
  size = 'sm' 
}: { 
  status: BuildStatus; 
  size?: 'sm' | 'md' 
}) {
  const config = STATUS_CONFIG[status];
  const sizeClasses = size === 'sm' ? 'size-2' : 'size-2.5';
  const pingClasses = size === 'sm' ? 'size-2' : 'size-2.5';

  return (
    <span className="relative flex">
      {config.animate && (
        <span className={cn(
          "absolute inset-0 rounded-full animate-ping opacity-60",
          pingClasses,
          status === 'validating' ? 'bg-cyan-400' :
          status === 'repairing' ? 'bg-amber-400' :
          status === 'failed' ? 'bg-red-400' :
          'bg-violet-400'
        )} />
      )}
      <span className={cn(
        "relative rounded-full",
        sizeClasses,
        status === 'validating' ? 'bg-cyan-500' :
        status === 'repairing' ? 'bg-amber-500' :
        status === 'failed' ? 'bg-red-500' :
        status === 'complete' || status === 'preview_ready' ? 'bg-emerald-500' :
        status === 'idle' || status === 'paused' ? 'bg-gray-500' :
        'bg-violet-500'
      )} />
    </span>
  );
}
