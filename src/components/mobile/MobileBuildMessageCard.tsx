/**
 * MobileBuildMessageCard - Conversation message card for mobile builder
 */

import { 
  Sparkles, AlertTriangle, Check, Info, Loader2, 
  Wrench, RefreshCw, Zap 
} from 'lucide-react';
import { cn } from '@/lib/utils';

type MessageType = 
  | 'assistant'
  | 'status'
  | 'warning'
  | 'error'
  | 'success'
  | 'info'
  | 'processing';

interface MobileBuildMessageCardProps {
  type: MessageType;
  content: string;
  timestamp?: string;
  isProcessing?: boolean;
}

const MESSAGE_CONFIG: Record<MessageType, {
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  borderColor: string;
}> = {
  assistant: {
    icon: Sparkles,
    iconColor: 'text-violet-400',
    bgColor: 'bg-violet-500/5',
    borderColor: 'border-violet-500/10',
  },
  status: {
    icon: Info,
    iconColor: 'text-blue-400',
    bgColor: 'bg-blue-500/5',
    borderColor: 'border-blue-500/10',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-amber-400',
    bgColor: 'bg-amber-500/5',
    borderColor: 'border-amber-500/10',
  },
  error: {
    icon: AlertTriangle,
    iconColor: 'text-red-400',
    bgColor: 'bg-red-500/5',
    borderColor: 'border-red-500/10',
  },
  success: {
    icon: Check,
    iconColor: 'text-emerald-400',
    bgColor: 'bg-emerald-500/5',
    borderColor: 'border-emerald-500/10',
  },
  info: {
    icon: Info,
    iconColor: 'text-gray-400',
    bgColor: 'bg-gray-500/5',
    borderColor: 'border-gray-500/10',
  },
  processing: {
    icon: Loader2,
    iconColor: 'text-violet-400',
    bgColor: 'bg-violet-500/5',
    borderColor: 'border-violet-500/10',
  },
};

export default function MobileBuildMessageCard({
  type,
  content,
  timestamp,
  isProcessing = false,
}: MobileBuildMessageCardProps) {
  const config = MESSAGE_CONFIG[type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex gap-3 p-4 rounded-2xl border",
        config.bgColor,
        config.borderColor
      )}
    >
      {/* Icon */}
      <div className={cn(
        "flex items-center justify-center size-8 rounded-xl shrink-0",
        config.bgColor
      )}>
        <Icon
          className={cn(
            "size-4",
            config.iconColor,
            (type === 'processing' || isProcessing) && "animate-spin"
          )}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-200 leading-relaxed">
          {content}
        </p>
        {timestamp && (
          <p className="text-[10px] text-gray-600 mt-1.5">
            {timestamp}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * MobileProcessingIndicator - Animated processing state for mobile
 */
export function MobileProcessingIndicator({ message }: { message?: string }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-2xl bg-violet-500/5 border border-violet-500/10">
      <div className="relative">
        <div className="size-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
          <Sparkles className="size-5 text-violet-400" />
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-violet-500 animate-pulse" />
      </div>
      
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">
            {message || 'Agent is working...'}
          </span>
        </div>
        <div className="flex gap-1 mt-2">
          <span className="size-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="size-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="size-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
