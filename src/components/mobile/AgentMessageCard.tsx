/**
 * AgentMessageCard - Displays agent thoughts and actions in the conversation feed
 * 
 * Supports streaming text animation, file action chips, and expandable details.
 */

import { useState, useEffect, useRef } from 'react';
import {
  Bot, FileCode2, Plus, RefreshCw, Eye, Check, 
  AlertTriangle, Wrench, TestTube, Trash2, ChevronRight, ChevronDown,
  Sparkles, Loader2, CheckCircle2, XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgentMessage, FileAction, NarrationStatus } from '@/lib/agent';

// File action styling
const FILE_ACTION_STYLES: Record<FileAction['action'], { icon: typeof FileCode2; bg: string; text: string }> = {
  read: { icon: Eye, bg: 'bg-gray-500/10', text: 'text-gray-400' },
  viewed: { icon: Eye, bg: 'bg-gray-500/10', text: 'text-gray-400' },
  created: { icon: Plus, bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  updated: { icon: RefreshCw, bg: 'bg-blue-500/10', text: 'text-blue-400' },
  repaired: { icon: Wrench, bg: 'bg-amber-500/10', text: 'text-amber-400' },
  validated: { icon: Check, bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
  tested: { icon: TestTube, bg: 'bg-purple-500/10', text: 'text-purple-400' },
  deleted: { icon: Trash2, bg: 'bg-red-500/10', text: 'text-red-400' },
};

// Status styling
const STATUS_STYLES: Record<NarrationStatus, { color: string; icon: typeof Sparkles }> = {
  thinking: { color: 'text-violet-400', icon: Sparkles },
  inspecting: { color: 'text-blue-400', icon: Eye },
  planning: { color: 'text-cyan-400', icon: Sparkles },
  working: { color: 'text-violet-400', icon: Loader2 },
  generating: { color: 'text-violet-400', icon: Sparkles },
  validating: { color: 'text-cyan-400', icon: Check },
  repairing: { color: 'text-amber-400', icon: Wrench },
  verifying: { color: 'text-blue-400', icon: TestTube },
  complete: { color: 'text-emerald-400', icon: CheckCircle2 },
  failed: { color: 'text-red-400', icon: XCircle },
};

interface AgentMessageCardProps {
  message: AgentMessage;
  isLatest?: boolean;
  onFileClick?: (path: string) => void;
}

/**
 * Streaming text component with cursor animation
 */
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
      setDisplayLength(prev => Math.min(prev + 3, text.length));
    }, 20);
    
    return () => clearTimeout(timer);
  }, [displayLength, text, isStreaming]);
  
  const visible = text.slice(0, displayLength);
  const showCursor = isStreaming && displayLength < text.length;
  
  // Render markdown-like bold text
  const renderText = (t: string) => {
    const parts = t.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <span key={i} className="font-semibold text-white">{part.slice(2, -2)}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };
  
  return (
    <span>
      {renderText(visible)}
      {showCursor && (
        <span className="inline-block w-[2px] h-[14px] bg-violet-400 animate-pulse ml-0.5 align-text-bottom rounded-full" />
      )}
    </span>
  );
}

/**
 * File action chip component
 */
function FileActionChip({ 
  action, 
  onClick 
}: { 
  action: FileAction; 
  onClick?: (path: string) => void;
}) {
  const style = FILE_ACTION_STYLES[action.action];
  const Icon = style.icon;
  const fileName = action.path.split('/').pop() || action.path;
  
  return (
    <button
      type="button"
      onClick={() => onClick?.(action.path)}
      className={cn(
        "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium transition-all",
        style.bg, style.text,
        onClick && "cursor-pointer hover:brightness-125 active:scale-95"
      )}
      title={action.path}
    >
      <Icon className="size-2.5 shrink-0" />
      <span className="capitalize mr-0.5">{action.action}</span>
      <span className="font-mono opacity-80 truncate max-w-[100px]">{fileName}</span>
    </button>
  );
}

/**
 * Expandable sub-details component
 */
function SubDetails({ 
  details,
  defaultExpanded = false,
}: { 
  details: NonNullable<AgentMessage['subDetails']>;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  
  if (details.length === 0) return null;
  
  const preview = details.slice(0, 3);
  const rest = details.slice(3);
  
  return (
    <div className="mt-2 rounded-lg bg-black/20 border border-white/[0.04] overflow-hidden">
      {preview.map((d, i) => (
        <div key={i} className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.02] last:border-0">
          <span className="text-[10px] text-gray-500 truncate">{d.label}</span>
          <span className={cn(
            "text-[10px] font-medium tabular-nums shrink-0 ml-2",
            d.status === 'ok' ? 'text-emerald-400' : 
            d.status === 'warn' ? 'text-amber-400' : 
            d.status === 'error' ? 'text-red-400' : 
            'text-gray-300'
          )}>
            {d.value}
          </span>
        </div>
      ))}
      
      {rest.length > 0 && expanded && rest.map((d, i) => (
        <div key={i + 3} className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.02] last:border-0">
          <span className="text-[10px] text-gray-500 truncate">{d.label}</span>
          <span className={cn(
            "text-[10px] font-medium tabular-nums shrink-0 ml-2",
            d.status === 'ok' ? 'text-emerald-400' : 
            d.status === 'warn' ? 'text-amber-400' : 
            d.status === 'error' ? 'text-red-400' : 
            'text-gray-300'
          )}>
            {d.value}
          </span>
        </div>
      ))}
      
      {rest.length > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-3 py-1 text-[10px] text-gray-600 hover:text-gray-400 transition-colors text-center"
        >
          {expanded ? 'Show less' : `+${rest.length} more`}
        </button>
      )}
    </div>
  );
}

/**
 * Main AgentMessageCard component
 */
export default function AgentMessageCard({ 
  message, 
  isLatest = false,
  onFileClick,
}: AgentMessageCardProps) {
  const { type, content, status, fileActions, subDetails, isStreaming } = message;
  const statusStyle = STATUS_STYLES[status];
  const StatusIcon = statusStyle.icon;
  
  const [showAllFiles, setShowAllFiles] = useState(false);
  
  // Thought messages (main content)
  if (type === 'thought') {
    return (
      <div className="flex gap-3">
        {/* Agent avatar */}
        <div className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-xl",
          status === 'complete' ? "bg-emerald-500/10" :
          status === 'failed' ? "bg-red-500/10" :
          "bg-violet-500/10"
        )}>
          <StatusIcon className={cn(
            "size-4",
            statusStyle.color,
            isStreaming && status !== 'complete' && status !== 'failed' && "animate-spin"
          )} />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] leading-relaxed text-gray-300">
            <StreamingText text={content} isStreaming={isStreaming} />
          </p>
          
          {/* Sub-details */}
          {subDetails && subDetails.length > 0 && !isStreaming && (
            <SubDetails details={subDetails} />
          )}
          
          {/* File actions */}
          {fileActions && fileActions.length > 0 && !isStreaming && (
            <div className="mt-2">
              {fileActions.length <= 4 ? (
                <div className="flex flex-wrap gap-1">
                  {fileActions.map((action, i) => (
                    <FileActionChip key={i} action={action} onClick={onFileClick} />
                  ))}
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setShowAllFiles(!showAllFiles)}
                    className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 transition-colors mb-1"
                  >
                    {showAllFiles ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                    <span>{fileActions.length} files affected</span>
                  </button>
                  {showAllFiles && (
                    <div className="flex flex-wrap gap-1">
                      {fileActions.map((action, i) => (
                        <FileActionChip key={i} action={action} onClick={onFileClick} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // File action messages
  if (type === 'file' && fileActions && fileActions.length > 0) {
    return (
      <div className="pl-11">
        <div className="flex flex-wrap gap-1">
          {fileActions.slice(0, showAllFiles ? undefined : 6).map((action, i) => (
            <FileActionChip key={i} action={action} onClick={onFileClick} />
          ))}
          {fileActions.length > 6 && !showAllFiles && (
            <button
              onClick={() => setShowAllFiles(true)}
              className="text-[10px] text-gray-500 hover:text-gray-300 px-2"
            >
              +{fileActions.length - 6} more
            </button>
          )}
        </div>
      </div>
    );
  }
  
  // Status messages
  if (type === 'status') {
    return (
      <div className="flex items-center gap-2 pl-11 py-1">
        <StatusIcon className={cn("size-3", statusStyle.color, status === 'working' && "animate-spin")} />
        <span className={cn("text-[11px] font-medium", statusStyle.color)}>{content}</span>
      </div>
    );
  }
  
  // Verification messages
  if (type === 'verification') {
    const passed = status === 'complete';
    return (
      <div className={cn(
        "rounded-xl border p-3 ml-11",
        passed ? "border-emerald-500/20 bg-emerald-500/[0.03]" : "border-amber-500/20 bg-amber-500/[0.03]"
      )}>
        <div className="flex items-center gap-2 mb-2">
          {passed ? (
            <CheckCircle2 className="size-4 text-emerald-400" />
          ) : (
            <AlertTriangle className="size-4 text-amber-400" />
          )}
          <span className={cn("text-xs font-medium", passed ? "text-emerald-300" : "text-amber-300")}>
            {content}
          </span>
        </div>
        {subDetails && subDetails.length > 0 && (
          <SubDetails details={subDetails} defaultExpanded />
        )}
      </div>
    );
  }
  
  return null;
}

/**
 * Agent thinking indicator
 */
export function AgentThinkingIndicator({ 
  status, 
  message 
}: { 
  status: NarrationStatus; 
  message?: string;
}) {
  const statusStyle = STATUS_STYLES[status];
  const Icon = statusStyle.icon;
  
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-8 items-center justify-center rounded-xl bg-violet-500/10">
        <Icon className={cn(
          "size-4",
          statusStyle.color,
          status !== 'complete' && status !== 'failed' && "animate-spin"
        )} />
      </div>
      <div className="flex items-center gap-2">
        <span className={cn("text-sm", statusStyle.color)}>
          {message || STATUS_MESSAGES[status] || 'Working...'}
        </span>
        {status !== 'complete' && status !== 'failed' && (
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
