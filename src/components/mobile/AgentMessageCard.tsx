/**
 * Premium Agent Message Cards for Mobile Builder
 * 
 * Components for displaying:
 * - Assistant conversation messages
 * - File action cards (Created, Updated, etc.)
 * - Status updates
 * - Verification results
 * 
 * Features:
 * - Premium dark glass styling
 * - Readable typography
 * - Streaming text animation
 * - Touch-friendly file cards
 * - Smooth animations
 */

import { useState, useEffect, useRef } from 'react';
import {
  Bot, FileCode2, Plus, RefreshCw, Eye, Check, 
  AlertTriangle, Wrench, TestTube, Trash2, ChevronRight,
  Sparkles, Loader2, CheckCircle2, XCircle, ExternalLink,
  FolderOpen, Code2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgentMessage, FileAction, NarrationStatus } from '@/lib/agent';

// ============================================================================
// FILE ACTION CARD - Premium touchable file activity cards
// ============================================================================

const FILE_ACTION_CONFIG: Record<FileAction['action'], {
  icon: typeof FileCode2;
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  accentColor: string;
}> = {
  read: { 
    icon: Eye, 
    label: 'Viewed', 
    bgColor: 'bg-gray-500/[0.06]',
    textColor: 'text-gray-400',
    borderColor: 'border-gray-500/10',
    accentColor: 'text-gray-500',
  },
  viewed: { 
    icon: Eye, 
    label: 'Viewed', 
    bgColor: 'bg-gray-500/[0.06]',
    textColor: 'text-gray-400',
    borderColor: 'border-gray-500/10',
    accentColor: 'text-gray-500',
  },
  created: { 
    icon: Plus, 
    label: 'Created', 
    bgColor: 'bg-emerald-500/[0.06]',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/15',
    accentColor: 'text-emerald-400',
  },
  updated: { 
    icon: RefreshCw, 
    label: 'Updated', 
    bgColor: 'bg-blue-500/[0.06]',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-500/15',
    accentColor: 'text-blue-400',
  },
  repaired: { 
    icon: Wrench, 
    label: 'Repaired', 
    bgColor: 'bg-amber-500/[0.06]',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-500/15',
    accentColor: 'text-amber-400',
  },
  validated: { 
    icon: Check, 
    label: 'Validated', 
    bgColor: 'bg-cyan-500/[0.06]',
    textColor: 'text-cyan-400',
    borderColor: 'border-cyan-500/15',
    accentColor: 'text-cyan-400',
  },
  tested: { 
    icon: TestTube, 
    label: 'Tested', 
    bgColor: 'bg-purple-500/[0.06]',
    textColor: 'text-purple-400',
    borderColor: 'border-purple-500/15',
    accentColor: 'text-purple-400',
  },
  deleted: { 
    icon: Trash2, 
    label: 'Deleted', 
    bgColor: 'bg-red-500/[0.06]',
    textColor: 'text-red-400',
    borderColor: 'border-red-500/15',
    accentColor: 'text-red-400',
  },
};

interface FileActionCardProps {
  action: FileAction;
  onClick?: (path: string) => void;
  isCompact?: boolean;
}

export function FileActionCard({ action, onClick, isCompact = false }: FileActionCardProps) {
  const config = FILE_ACTION_CONFIG[action.action];
  const Icon = config.icon;
  const fileName = action.path.split('/').pop() || action.path;
  const directory = action.path.includes('/') 
    ? action.path.substring(0, action.path.lastIndexOf('/'))
    : '';

  if (isCompact) {
    return (
      <button
        type="button"
        onClick={() => onClick?.(action.path)}
        className={cn(
          "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-medium transition-all",
          "active:scale-[0.98]",
          config.bgColor,
          config.textColor,
          "border",
          config.borderColor,
          onClick && "cursor-pointer hover:brightness-110"
        )}
        title={action.path}
      >
        <Icon className="size-3.5 shrink-0" />
        <span className="capitalize">{config.label}</span>
        <span className="font-mono text-white/80 truncate max-w-[150px]">{fileName}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onClick?.(action.path)}
      className={cn(
        "w-full flex items-center gap-4 rounded-2xl p-4 transition-all",
        "active:scale-[0.99]",
        config.bgColor,
        "border",
        config.borderColor,
        onClick && "cursor-pointer hover:brightness-110"
      )}
    >
      {/* Icon */}
      <div className={cn(
        "flex size-10 items-center justify-center rounded-xl",
        "bg-black/30"
      )}>
        <Icon className={cn("size-5", config.accentColor)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2">
          <span className={cn("text-[11px] font-semibold uppercase tracking-wider", config.textColor)}>
            {config.label}
          </span>
        </div>
        <p className="text-[14px] font-medium text-white truncate mt-0.5">
          {fileName}
        </p>
        {directory && (
          <p className="text-[11px] text-gray-600 truncate mt-0.5 font-mono">
            {directory}
          </p>
        )}
      </div>

      {/* Chevron */}
      {onClick && (
        <ChevronRight className="size-5 text-gray-600 shrink-0" />
      )}
    </button>
  );
}

// ============================================================================
// STATUS STYLES
// ============================================================================

const STATUS_STYLES: Record<NarrationStatus, { 
  color: string; 
  bgColor: string;
  icon: typeof Sparkles;
  glowColor: string;
}> = {
  thinking: { 
    color: 'text-violet-400', 
    bgColor: 'bg-violet-500/10',
    icon: Sparkles,
    glowColor: 'shadow-violet-500/20',
  },
  inspecting: { 
    color: 'text-blue-400', 
    bgColor: 'bg-blue-500/10',
    icon: Eye,
    glowColor: 'shadow-blue-500/20',
  },
  planning: { 
    color: 'text-cyan-400', 
    bgColor: 'bg-cyan-500/10',
    icon: Sparkles,
    glowColor: 'shadow-cyan-500/20',
  },
  working: { 
    color: 'text-violet-400', 
    bgColor: 'bg-violet-500/10',
    icon: Loader2,
    glowColor: 'shadow-violet-500/20',
  },
  generating: { 
    color: 'text-violet-400', 
    bgColor: 'bg-violet-500/10',
    icon: Code2,
    glowColor: 'shadow-violet-500/20',
  },
  validating: { 
    color: 'text-cyan-400', 
    bgColor: 'bg-cyan-500/10',
    icon: Check,
    glowColor: 'shadow-cyan-500/20',
  },
  repairing: { 
    color: 'text-amber-400', 
    bgColor: 'bg-amber-500/10',
    icon: Wrench,
    glowColor: 'shadow-amber-500/20',
  },
  verifying: { 
    color: 'text-blue-400', 
    bgColor: 'bg-blue-500/10',
    icon: TestTube,
    glowColor: 'shadow-blue-500/20',
  },
  complete: { 
    color: 'text-emerald-400', 
    bgColor: 'bg-emerald-500/10',
    icon: CheckCircle2,
    glowColor: 'shadow-emerald-500/20',
  },
  failed: { 
    color: 'text-red-400', 
    bgColor: 'bg-red-500/10',
    icon: XCircle,
    glowColor: 'shadow-red-500/20',
  },
};

// ============================================================================
// STREAMING TEXT - Animated typewriter effect
// ============================================================================

function StreamingText({ text, isStreaming }: { text: string; isStreaming: boolean }) {
  const [displayLength, setDisplayLength] = useState(isStreaming ? 0 : text.length);
  const completeRef = useRef(!isStreaming);
  
  useEffect(() => {
    if (!isStreaming || completeRef.current) {
      setDisplayLength(text.length);
      return;
    }
    
    if (displayLength >= text.length) {
      completeRef.current = true;
      return;
    }
    
    const timer = setTimeout(() => {
      setDisplayLength(prev => Math.min(prev + 4, text.length));
    }, 15);
    
    return () => clearTimeout(timer);
  }, [displayLength, text, isStreaming]);
  
  const visible = text.slice(0, displayLength);
  const showCursor = isStreaming && displayLength < text.length;
  
  // Render markdown-like bold text
  const renderText = (t: string) => {
    const parts = t.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };
  
  return (
    <>
      {renderText(visible)}
      {showCursor && (
        <span className="inline-block w-0.5 h-5 bg-violet-400 animate-pulse ml-0.5 align-text-bottom rounded-full" />
      )}
    </>
  );
}

// ============================================================================
// ASSISTANT MESSAGE CARD - Main conversational message display
// ============================================================================

interface AssistantMessageCardProps {
  content: string;
  status: NarrationStatus;
  isStreaming?: boolean;
  fileActions?: FileAction[];
  onFileClick?: (path: string) => void;
}

export function AssistantMessageCard({
  content,
  status,
  isStreaming = false,
  fileActions,
  onFileClick,
}: AssistantMessageCardProps) {
  const statusStyle = STATUS_STYLES[status];
  const StatusIcon = statusStyle.icon;
  const isActive = status !== 'complete' && status !== 'failed' && isStreaming;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Message container */}
      <div className="flex gap-4">
        {/* Agent avatar */}
        <div className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-2xl transition-all",
          statusStyle.bgColor,
          isActive && "shadow-lg",
          isActive && statusStyle.glowColor
        )}>
          <StatusIcon className={cn(
            "size-5",
            statusStyle.color,
            isActive && status !== 'complete' && "animate-spin"
          )} />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0 pt-1">
          {/* Message text - premium readable styling */}
          <p className="text-[15px] leading-[1.7] text-gray-200">
            <StreamingText text={content} isStreaming={isStreaming} />
          </p>
          
          {/* File actions - shown after streaming completes */}
          {fileActions && fileActions.length > 0 && !isStreaming && (
            <div className="mt-4 space-y-2">
              {fileActions.length <= 3 ? (
                // Show full cards for few files
                fileActions.map((action, i) => (
                  <FileActionCard key={i} action={action} onClick={onFileClick} />
                ))
              ) : (
                // Show compact chips for many files
                <div className="flex flex-wrap gap-2">
                  {fileActions.map((action, i) => (
                    <FileActionCard key={i} action={action} onClick={onFileClick} isCompact />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// USER PROMPT CARD - User's message in the feed
// ============================================================================

interface UserPromptCardProps {
  content: string;
  timestamp?: string;
}

export function UserPromptCard({ content, timestamp }: UserPromptCardProps) {
  return (
    <div className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="max-w-[85%]">
        <div className="rounded-2xl rounded-br-md bg-gradient-to-br from-violet-600 to-fuchsia-600 px-4 py-3 shadow-lg shadow-violet-500/20">
          <p className="text-[15px] leading-[1.6] text-white">
            {content}
          </p>
        </div>
        {timestamp && (
          <p className="text-[11px] text-gray-600 mt-1.5 text-right mr-2">
            {timestamp}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// STATUS ROW - Inline status indicator
// ============================================================================

interface StatusRowProps {
  status: NarrationStatus;
  message?: string;
}

export function StatusRow({ status, message }: StatusRowProps) {
  const statusStyle = STATUS_STYLES[status];
  const StatusIcon = statusStyle.icon;
  const isActive = status !== 'complete' && status !== 'failed';

  return (
    <div className="flex items-center gap-3 py-2 px-1 animate-in fade-in duration-200">
      <div className="relative flex size-5 items-center justify-center">
        {isActive && (
          <span className={cn(
            "absolute inset-0 rounded-full animate-ping opacity-40",
            status === 'validating' ? 'bg-cyan-400' :
            status === 'repairing' ? 'bg-amber-400' :
            'bg-violet-400'
          )} />
        )}
        <StatusIcon className={cn(
          "size-4 relative",
          statusStyle.color,
          isActive && "animate-spin"
        )} />
      </div>
      <span className={cn("text-[13px] font-medium", statusStyle.color)}>
        {message || STATUS_MESSAGES[status]}
      </span>
    </div>
  );
}

// ============================================================================
// VERIFICATION CARD - Build validation results
// ============================================================================

interface VerificationCardProps {
  passed: boolean;
  title: string;
  checks?: { label: string; value: string; status?: 'ok' | 'warn' | 'error' }[];
}

export function VerificationCard({ passed, title, checks }: VerificationCardProps) {
  return (
    <div className={cn(
      "rounded-2xl border p-4 animate-in fade-in slide-in-from-bottom-2 duration-300",
      passed 
        ? "border-emerald-500/20 bg-emerald-500/[0.04]" 
        : "border-amber-500/20 bg-amber-500/[0.04]"
    )}>
      <div className="flex items-center gap-3 mb-3">
        {passed ? (
          <CheckCircle2 className="size-5 text-emerald-400" />
        ) : (
          <AlertTriangle className="size-5 text-amber-400" />
        )}
        <span className={cn(
          "text-[14px] font-semibold",
          passed ? "text-emerald-300" : "text-amber-300"
        )}>
          {title}
        </span>
      </div>
      
      {checks && checks.length > 0 && (
        <div className="rounded-xl bg-black/20 border border-white/[0.04] overflow-hidden">
          {checks.map((check, i) => (
            <div 
              key={i} 
              className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.03] last:border-0"
            >
              <span className="text-[12px] text-gray-500">{check.label}</span>
              <span className={cn(
                "text-[12px] font-medium",
                check.status === 'ok' ? 'text-emerald-400' : 
                check.status === 'warn' ? 'text-amber-400' : 
                check.status === 'error' ? 'text-red-400' : 
                'text-gray-300'
              )}>
                {check.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// THINKING INDICATOR - Animated agent working state
// ============================================================================

interface AgentThinkingIndicatorProps {
  status: NarrationStatus;
  message?: string;
}

export function AgentThinkingIndicator({ status, message }: AgentThinkingIndicatorProps) {
  const statusStyle = STATUS_STYLES[status];
  const Icon = statusStyle.icon;
  const isActive = status !== 'complete' && status !== 'failed';
  
  return (
    <div className="flex items-center gap-4 animate-in fade-in duration-300">
      <div className={cn(
        "flex size-10 items-center justify-center rounded-2xl transition-all",
        statusStyle.bgColor,
        isActive && "shadow-lg",
        isActive && statusStyle.glowColor
      )}>
        <Icon className={cn(
          "size-5",
          statusStyle.color,
          isActive && "animate-spin"
        )} />
      </div>
      <div className="flex items-center gap-3">
        <span className={cn("text-[14px] font-medium", statusStyle.color)}>
          {message || STATUS_MESSAGES[status] || 'Working...'}
        </span>
        {isActive && (
          <span className="flex gap-1">
            <span className="size-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="size-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="size-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
        )}
      </div>
    </div>
  );
}

// Import status messages
import { STATUS_MESSAGES } from '@/lib/agent';

// Default export for backward compatibility
export default function AgentMessageCard(props: any) {
  const { message, onFileClick } = props;
  
  if (message.type === 'thought') {
    return (
      <AssistantMessageCard
        content={message.content}
        status={message.status}
        isStreaming={message.isStreaming}
        fileActions={message.fileActions}
        onFileClick={onFileClick}
      />
    );
  }
  
  if (message.type === 'status') {
    return <StatusRow status={message.status} message={message.content} />;
  }
  
  if (message.type === 'verification') {
    return (
      <VerificationCard
        passed={message.status === 'complete'}
        title={message.content}
        checks={message.subDetails}
      />
    );
  }
  
  if (message.type === 'file' && message.fileActions?.length > 0) {
    return (
      <div className="pl-14 space-y-2">
        {message.fileActions.map((action: FileAction, i: number) => (
          <FileActionCard key={i} action={action} onClick={onFileClick} isCompact />
        ))}
      </div>
    );
  }
  
  return null;
}
