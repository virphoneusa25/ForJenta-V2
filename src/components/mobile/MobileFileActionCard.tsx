/**
 * MobileFileActionCard - Premium file activity card for mobile conversation
 */

import { useState } from 'react';
import { 
  FileCode2, Plus, Edit3, Wrench, Eye, ChevronDown, ChevronRight, 
  Copy, Check, ExternalLink 
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ActionType = 'created' | 'edited' | 'repaired' | 'viewed' | 'deleted';

interface MobileFileActionCardProps {
  action: ActionType;
  filePath: string;
  language?: string;
  content?: string;
  timestamp?: string;
  onOpen?: () => void;
  onViewFull?: () => void;
}

const ACTION_CONFIG: Record<ActionType, {
  icon: React.ElementType;
  label: string;
  color: string;
  gradient: string;
}> = {
  created: {
    icon: Plus,
    label: 'Created',
    color: 'text-emerald-400',
    gradient: 'from-emerald-500/20 to-emerald-500/5',
  },
  edited: {
    icon: Edit3,
    label: 'Edited',
    color: 'text-blue-400',
    gradient: 'from-blue-500/20 to-blue-500/5',
  },
  repaired: {
    icon: Wrench,
    label: 'Repaired',
    color: 'text-amber-400',
    gradient: 'from-amber-500/20 to-amber-500/5',
  },
  viewed: {
    icon: Eye,
    label: 'Viewed',
    color: 'text-gray-400',
    gradient: 'from-gray-500/20 to-gray-500/5',
  },
  deleted: {
    icon: FileCode2,
    label: 'Deleted',
    color: 'text-red-400',
    gradient: 'from-red-500/20 to-red-500/5',
  },
};

export default function MobileFileActionCard({
  action,
  filePath,
  language = 'typescript',
  content,
  timestamp,
  onOpen,
  onViewFull,
}: MobileFileActionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const config = ACTION_CONFIG[action];
  const Icon = config.icon;
  const fileName = filePath.split('/').pop() || filePath;
  const dirPath = filePath.includes('/') 
    ? filePath.slice(0, filePath.lastIndexOf('/')) 
    : '';

  const handleCopy = async () => {
    if (content) {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleExpand = () => {
    if (content) {
      setExpanded(!expanded);
    }
  };

  // Truncate content for preview (first 8 lines)
  const previewContent = content 
    ? content.split('\n').slice(0, 8).join('\n') + (content.split('\n').length > 8 ? '\n...' : '')
    : '';

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-zinc-900/80 to-zinc-900/40 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={toggleExpand}
        className="flex items-center gap-3 w-full p-4 text-left active:bg-white/[0.02] transition-colors"
      >
        {/* Action icon */}
        <div className={cn(
          "flex items-center justify-center size-10 rounded-xl bg-gradient-to-br",
          config.gradient
        )}>
          <Icon className={cn("size-5", config.color)} />
        </div>

        {/* File info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-semibold", config.color)}>
              {config.label}
            </span>
            {timestamp && (
              <span className="text-[10px] text-gray-600">{timestamp}</span>
            )}
          </div>
          <p className="text-sm font-medium text-white truncate mt-0.5">
            {fileName}
          </p>
          {dirPath && (
            <p className="text-[11px] text-gray-500 truncate">
              {dirPath}/
            </p>
          )}
        </div>

        {/* Expand indicator */}
        {content && (
          <div className="shrink-0">
            {expanded ? (
              <ChevronDown className="size-5 text-gray-500" />
            ) : (
              <ChevronRight className="size-5 text-gray-500" />
            )}
          </div>
        )}
      </button>

      {/* Expanded code preview */}
      {expanded && content && (
        <div className="border-t border-white/[0.06]">
          {/* Code toolbar */}
          <div className="flex items-center justify-between px-4 py-2 bg-black/30">
            <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">
              {language}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="size-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
              {onViewFull && (
                <button
                  onClick={onViewFull}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  <ExternalLink className="size-3" />
                  <span>Full</span>
                </button>
              )}
            </div>
          </div>

          {/* Code content */}
          <div className="overflow-x-auto scrollbar-thin">
            <pre className="p-4 text-[12px] leading-relaxed font-mono text-gray-300 whitespace-pre">
              {previewContent}
            </pre>
          </div>

          {/* View more indicator */}
          {content.split('\n').length > 8 && (
            <button
              onClick={onViewFull}
              className="flex items-center justify-center gap-1 w-full py-2 text-xs text-violet-400 hover:text-violet-300 bg-violet-500/5 hover:bg-violet-500/10 transition-colors"
            >
              <span>View full file ({content.split('\n').length} lines)</span>
              <ExternalLink className="size-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
