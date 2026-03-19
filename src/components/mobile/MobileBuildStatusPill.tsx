/**
 * MobileBuildStatusPill - Compact status indicator for mobile
 */

import { Loader2, Check, AlertCircle, Pause, Sparkles, Wrench, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

type BuildStatus = 
  | 'idle'
  | 'processing'
  | 'generating'
  | 'validating'
  | 'repairing'
  | 'preview_ready'
  | 'paused'
  | 'failed'
  | 'complete';

interface MobileBuildStatusPillProps {
  status: BuildStatus;
  message?: string;
  className?: string;
}

const STATUS_CONFIG: Record<BuildStatus, {
  icon: React.ElementType;
  label: string;
  color: string;
  bg: string;
  animate?: boolean;
}> = {
  idle: {
    icon: Sparkles,
    label: 'Ready',
    color: 'text-gray-400',
    bg: 'bg-gray-500/10',
  },
  processing: {
    icon: Loader2,
    label: 'Processing',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    animate: true,
  },
  generating: {
    icon: Sparkles,
    label: 'Generating',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    animate: true,
  },
  validating: {
    icon: Eye,
    label: 'Validating',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    animate: true,
  },
  repairing: {
    icon: Wrench,
    label: 'Repairing',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    animate: true,
  },
  preview_ready: {
    icon: Eye,
    label: 'Preview Ready',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  paused: {
    icon: Pause,
    label: 'Paused',
    color: 'text-gray-400',
    bg: 'bg-gray-500/10',
  },
  failed: {
    icon: AlertCircle,
    label: 'Failed',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
  },
  complete: {
    icon: Check,
    label: 'Complete',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
};

export default function MobileBuildStatusPill({
  status,
  message,
  className,
}: MobileBuildStatusPillProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full",
        config.bg,
        className
      )}
    >
      <Icon
        className={cn(
          "size-3.5",
          config.color,
          config.animate && "animate-spin"
        )}
      />
      <span className={cn("text-xs font-medium", config.color)}>
        {message || config.label}
      </span>
    </div>
  );
}
