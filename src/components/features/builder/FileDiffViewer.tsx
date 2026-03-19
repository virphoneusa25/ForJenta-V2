/**
 * FileDiffViewer - Shows diff between file versions
 */

import { useMemo, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Plus, Minus, Equal, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileDiffViewerProps {
  path: string;
  oldContent: string;
  newContent: string;
  oldVersion?: number;
  newVersion?: number;
  changeType: 'created' | 'updated' | 'deleted';
  onClose?: () => void;
  onRevert?: () => void;
}

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged' | 'header';
  oldLineNum?: number;
  newLineNum?: number;
  content: string;
}

function computeDiff(oldContent: string, newContent: string): DiffLine[] {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  const diff: DiffLine[] = [];
  
  // Simple line-by-line diff (not optimal but works for most cases)
  const maxLen = Math.max(oldLines.length, newLines.length);
  let oldIdx = 0;
  let newIdx = 0;
  
  // Use a simple LCS-like approach
  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);
  
  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    const oldLine = oldLines[oldIdx];
    const newLine = newLines[newIdx];
    
    if (oldIdx >= oldLines.length) {
      // Only new lines left
      diff.push({ type: 'added', newLineNum: newIdx + 1, content: newLine });
      newIdx++;
    } else if (newIdx >= newLines.length) {
      // Only old lines left
      diff.push({ type: 'removed', oldLineNum: oldIdx + 1, content: oldLine });
      oldIdx++;
    } else if (oldLine === newLine) {
      // Lines match
      diff.push({ type: 'unchanged', oldLineNum: oldIdx + 1, newLineNum: newIdx + 1, content: oldLine });
      oldIdx++;
      newIdx++;
    } else if (!newSet.has(oldLine) && oldSet.has(newLine)) {
      // Old line was removed
      diff.push({ type: 'removed', oldLineNum: oldIdx + 1, content: oldLine });
      oldIdx++;
    } else if (oldSet.has(newLine) && !newSet.has(oldLine)) {
      // New line was added
      diff.push({ type: 'added', newLineNum: newIdx + 1, content: newLine });
      newIdx++;
    } else {
      // Lines differ - show as removed then added
      diff.push({ type: 'removed', oldLineNum: oldIdx + 1, content: oldLine });
      diff.push({ type: 'added', newLineNum: newIdx + 1, content: newLine });
      oldIdx++;
      newIdx++;
    }
  }
  
  return diff;
}

export default function FileDiffViewer({
  path,
  oldContent,
  newContent,
  oldVersion = 1,
  newVersion = 2,
  changeType,
  onClose,
  onRevert,
}: FileDiffViewerProps) {
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('unified');
  
  const diff = useMemo(() => computeDiff(oldContent, newContent), [oldContent, newContent]);
  
  const stats = useMemo(() => {
    const added = diff.filter(d => d.type === 'added').length;
    const removed = diff.filter(d => d.type === 'removed').length;
    const unchanged = diff.filter(d => d.type === 'unchanged').length;
    return { added, removed, unchanged };
  }, [diff]);

  const fileName = path.split('/').pop() || path;

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-zinc-900">
        <div className="flex items-center gap-3">
          <span className="font-medium text-white">{fileName}</span>
          <span className="text-xs text-gray-500">{path}</span>
          
          {/* Change type badge */}
          <span className={cn(
            "px-2 py-0.5 rounded text-[10px] font-medium",
            changeType === 'created' && "bg-emerald-500/20 text-emerald-400",
            changeType === 'updated' && "bg-blue-500/20 text-blue-400",
            changeType === 'deleted' && "bg-red-500/20 text-red-400",
          )}>
            {changeType.toUpperCase()}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Stats */}
          <div className="flex items-center gap-3 text-[10px] mr-4">
            <span className="flex items-center gap-1 text-emerald-400">
              <Plus className="size-3" />
              {stats.added}
            </span>
            <span className="flex items-center gap-1 text-red-400">
              <Minus className="size-3" />
              {stats.removed}
            </span>
            <span className="flex items-center gap-1 text-gray-500">
              <Equal className="size-3" />
              {stats.unchanged}
            </span>
          </div>
          
          {/* View mode toggle */}
          <div className="flex rounded-lg border border-white/10 overflow-hidden">
            <button
              onClick={() => setViewMode('unified')}
              className={cn(
                "px-2 py-1 text-[10px]",
                viewMode === 'unified' ? "bg-white/10 text-white" : "text-gray-500 hover:text-white"
              )}
            >
              Unified
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={cn(
                "px-2 py-1 text-[10px]",
                viewMode === 'split' ? "bg-white/10 text-white" : "text-gray-500 hover:text-white"
              )}
            >
              Split
            </button>
          </div>
          
          {/* Revert button */}
          {onRevert && changeType !== 'created' && (
            <button
              onClick={onRevert}
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-[10px] font-medium"
            >
              <RotateCcw className="size-3" />
              Revert
            </button>
          )}
          
          {/* Close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-white"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>
      
      {/* Version indicator */}
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-white/5 bg-zinc-900/50 text-[10px]">
        <div className="flex items-center gap-2">
          <span className="text-red-400">v{oldVersion}</span>
          <ChevronRight className="size-3 text-gray-600" />
          <span className="text-emerald-400">v{newVersion}</span>
        </div>
        <span className="text-gray-600">
          {stats.added + stats.removed} changes
        </span>
      </div>
      
      {/* Diff content */}
      <div className="flex-1 overflow-auto font-mono text-xs">
        {viewMode === 'unified' ? (
          <UnifiedDiff diff={diff} />
        ) : (
          <SplitDiff diff={diff} oldContent={oldContent} newContent={newContent} />
        )}
      </div>
    </div>
  );
}

function UnifiedDiff({ diff }: { diff: DiffLine[] }) {
  return (
    <div className="min-w-max">
      {diff.map((line, idx) => (
        <div
          key={idx}
          className={cn(
            "flex",
            line.type === 'added' && "bg-emerald-500/10",
            line.type === 'removed' && "bg-red-500/10",
          )}
        >
          {/* Line numbers */}
          <div className="flex shrink-0 text-gray-600 select-none">
            <span className="w-10 px-2 py-0.5 text-right border-r border-white/5">
              {line.oldLineNum || ''}
            </span>
            <span className="w-10 px-2 py-0.5 text-right border-r border-white/5">
              {line.newLineNum || ''}
            </span>
          </div>
          
          {/* Change indicator */}
          <span className={cn(
            "w-6 px-2 py-0.5 text-center shrink-0",
            line.type === 'added' && "text-emerald-400",
            line.type === 'removed' && "text-red-400",
          )}>
            {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
          </span>
          
          {/* Content */}
          <pre className={cn(
            "flex-1 px-2 py-0.5 whitespace-pre",
            line.type === 'added' && "text-emerald-300",
            line.type === 'removed' && "text-red-300",
            line.type === 'unchanged' && "text-gray-400",
          )}>
            {line.content || ' '}
          </pre>
        </div>
      ))}
    </div>
  );
}

function SplitDiff({ diff, oldContent, newContent }: { diff: DiffLine[]; oldContent: string; newContent: string }) {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  
  return (
    <div className="flex min-w-max">
      {/* Old content */}
      <div className="flex-1 border-r border-white/10">
        <div className="px-2 py-1 text-[10px] text-gray-500 border-b border-white/5 bg-red-500/5">
          Previous Version
        </div>
        {oldLines.map((line, idx) => {
          const isRemoved = diff.some(d => d.type === 'removed' && d.oldLineNum === idx + 1);
          return (
            <div
              key={idx}
              className={cn(
                "flex",
                isRemoved && "bg-red-500/10"
              )}
            >
              <span className="w-10 px-2 py-0.5 text-right text-gray-600 border-r border-white/5 shrink-0">
                {idx + 1}
              </span>
              <pre className={cn(
                "flex-1 px-2 py-0.5 whitespace-pre",
                isRemoved ? "text-red-300" : "text-gray-400"
              )}>
                {line || ' '}
              </pre>
            </div>
          );
        })}
      </div>
      
      {/* New content */}
      <div className="flex-1">
        <div className="px-2 py-1 text-[10px] text-gray-500 border-b border-white/5 bg-emerald-500/5">
          Current Version
        </div>
        {newLines.map((line, idx) => {
          const isAdded = diff.some(d => d.type === 'added' && d.newLineNum === idx + 1);
          return (
            <div
              key={idx}
              className={cn(
                "flex",
                isAdded && "bg-emerald-500/10"
              )}
            >
              <span className="w-10 px-2 py-0.5 text-right text-gray-600 border-r border-white/5 shrink-0">
                {idx + 1}
              </span>
              <pre className={cn(
                "flex-1 px-2 py-0.5 whitespace-pre",
                isAdded ? "text-emerald-300" : "text-gray-400"
              )}>
                {line || ' '}
              </pre>
            </div>
          );
        })}
      </div>
    </div>
  );
}
