/**
 * WhatChangedPanel - Shows what files were modified, added, or preserved after generation
 */

import { useState } from 'react';
import { 
  FileCode2, Plus, Edit3, Trash2, Shield, ChevronDown, ChevronRight,
  Eye, RotateCcw, ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePersistentProjectStore, GenerationRun } from '@/stores/persistentProjectStore';

interface FileChange {
  path: string;
  type: 'created' | 'updated' | 'deleted' | 'preserved';
  language?: string;
}

interface WhatChangedPanelProps {
  run?: GenerationRun | null;
  filesCreated?: string[];
  filesUpdated?: string[];
  filesDeleted?: string[];
  filesPreserved?: string[];
  onViewDiff?: (path: string) => void;
  onRevertFile?: (path: string) => void;
  onOpenFile?: (path: string) => void;
}

const CHANGE_CONFIG = {
  created: { 
    icon: Plus, 
    label: 'Created', 
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20'
  },
  updated: { 
    icon: Edit3, 
    label: 'Updated', 
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20'
  },
  deleted: { 
    icon: Trash2, 
    label: 'Deleted', 
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20'
  },
  preserved: { 
    icon: Shield, 
    label: 'Preserved', 
    color: 'text-gray-500',
    bg: 'bg-gray-500/5',
    border: 'border-gray-500/10'
  },
};

function FileChangeItem({ 
  file,
  onViewDiff,
  onRevertFile,
  onOpenFile,
}: { 
  file: FileChange;
  onViewDiff?: (path: string) => void;
  onRevertFile?: (path: string) => void;
  onOpenFile?: (path: string) => void;
}) {
  const config = CHANGE_CONFIG[file.type];
  const Icon = config.icon;
  const fileName = file.path.split('/').pop() || file.path;
  const dirPath = file.path.includes('/') ? file.path.slice(0, file.path.lastIndexOf('/')) : '';

  return (
    <div className={cn(
      "flex items-center gap-2 px-2 py-1.5 rounded-lg border",
      config.bg, config.border
    )}>
      <Icon className={cn("size-3.5 shrink-0", config.color)} />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-white truncate">{fileName}</span>
          {dirPath && (
            <span className="text-[10px] text-gray-600 truncate">{dirPath}/</span>
          )}
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {file.type === 'updated' && onViewDiff && (
          <button
            onClick={() => onViewDiff(file.path)}
            className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-white"
            title="View diff"
          >
            <Eye className="size-3" />
          </button>
        )}
        
        {file.type === 'updated' && onRevertFile && (
          <button
            onClick={() => onRevertFile(file.path)}
            className="p-1 rounded hover:bg-amber-500/20 text-gray-500 hover:text-amber-400"
            title="Revert to previous"
          >
            <RotateCcw className="size-3" />
          </button>
        )}
        
        {onOpenFile && file.type !== 'deleted' && (
          <button
            onClick={() => onOpenFile(file.path)}
            className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-white"
            title="Open file"
          >
            <ExternalLink className="size-3" />
          </button>
        )}
      </div>
    </div>
  );
}

function ChangeSection({ 
  title,
  type,
  files,
  onViewDiff,
  onRevertFile,
  onOpenFile,
}: {
  title: string;
  type: 'created' | 'updated' | 'deleted' | 'preserved';
  files: string[];
  onViewDiff?: (path: string) => void;
  onRevertFile?: (path: string) => void;
  onOpenFile?: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(type !== 'preserved');
  const config = CHANGE_CONFIG[type];

  if (files.length === 0) return null;

  return (
    <div className="mb-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left mb-1.5"
      >
        {expanded ? (
          <ChevronDown className="size-3 text-gray-500" />
        ) : (
          <ChevronRight className="size-3 text-gray-500" />
        )}
        <span className={cn("text-xs font-medium", config.color)}>{title}</span>
        <span className="text-[10px] text-gray-600 tabular-nums">({files.length})</span>
      </button>
      
      {expanded && (
        <div className="space-y-1 pl-5">
          {files.map((path) => (
            <FileChangeItem
              key={path}
              file={{ path, type }}
              onViewDiff={onViewDiff}
              onRevertFile={onRevertFile}
              onOpenFile={onOpenFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function WhatChangedPanel({
  run,
  filesCreated = [],
  filesUpdated = [],
  filesDeleted = [],
  filesPreserved = [],
  onViewDiff,
  onRevertFile,
  onOpenFile,
}: WhatChangedPanelProps) {
  // Use run data if provided
  const created = run?.files_created || filesCreated;
  const updated = run?.files_updated || filesUpdated;
  const deleted = run?.files_deleted || filesDeleted;
  
  const totalChanges = created.length + updated.length + deleted.length;
  
  if (totalChanges === 0 && filesPreserved.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <FileCode2 className="size-8 text-gray-600 mb-2" />
        <p className="text-xs text-gray-500">No changes to show</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <h3 className="text-xs font-medium text-gray-400">What Changed</h3>
        <span className="text-[10px] text-gray-600 tabular-nums">
          {totalChanges} {totalChanges === 1 ? 'change' : 'changes'}
        </span>
      </div>
      
      {/* Summary */}
      {run && (
        <div className="px-3 py-2 border-b border-white/5 bg-zinc-900/50">
          <p className="text-[10px] text-gray-500">
            {run.is_full_rebuild ? 'Full Rebuild' : 'Continuation'} • {run.prompt_classification}
          </p>
          {run.ai_plan_summary && (
            <p className="text-xs text-gray-400 mt-1 line-clamp-2">
              {run.ai_plan_summary}
            </p>
          )}
        </div>
      )}
      
      {/* Changes */}
      <div className="flex-1 overflow-y-auto px-3 py-3 scrollbar-thin">
        <ChangeSection
          title="Created"
          type="created"
          files={created}
          onOpenFile={onOpenFile}
        />
        
        <ChangeSection
          title="Updated"
          type="updated"
          files={updated}
          onViewDiff={onViewDiff}
          onRevertFile={onRevertFile}
          onOpenFile={onOpenFile}
        />
        
        <ChangeSection
          title="Deleted"
          type="deleted"
          files={deleted}
        />
        
        <ChangeSection
          title="Preserved (Unchanged)"
          type="preserved"
          files={filesPreserved}
          onOpenFile={onOpenFile}
        />
      </div>
      
      {/* Stats footer */}
      <div className="border-t border-white/5 px-3 py-2">
        <div className="flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-3">
            {created.length > 0 && (
              <span className="text-emerald-400">+{created.length}</span>
            )}
            {updated.length > 0 && (
              <span className="text-blue-400">~{updated.length}</span>
            )}
            {deleted.length > 0 && (
              <span className="text-red-400">-{deleted.length}</span>
            )}
          </div>
          {filesPreserved.length > 0 && (
            <span className="text-gray-600">{filesPreserved.length} preserved</span>
          )}
        </div>
      </div>
    </div>
  );
}
