/**
 * PromptHistory - Shows conversation/build history for a project
 */

import { useMemo } from 'react';
import { usePersistentProjectStore, ProjectPrompt, PromptType } from '@/stores/persistentProjectStore';
import { 
  MessageSquare, Plus, Wrench, Paintbrush, Bug, RefreshCw, 
  Database, FileCode, Hammer, ChevronRight, Check, Clock 
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PROMPT_TYPE_CONFIG: Record<PromptType, { icon: React.ElementType; label: string; color: string }> = {
  create_initial: { icon: Plus, label: 'Created', color: 'text-emerald-400' },
  add_feature: { icon: Plus, label: 'Added', color: 'text-blue-400' },
  refine_feature: { icon: Wrench, label: 'Refined', color: 'text-violet-400' },
  redesign_ui: { icon: Paintbrush, label: 'Redesigned', color: 'text-pink-400' },
  repair_bug: { icon: Bug, label: 'Fixed', color: 'text-orange-400' },
  refactor_code: { icon: RefreshCw, label: 'Refactored', color: 'text-cyan-400' },
  connect_backend: { icon: Database, label: 'Connected', color: 'text-amber-400' },
  replace_file: { icon: FileCode, label: 'Replaced', color: 'text-red-400' },
  full_rebuild: { icon: Hammer, label: 'Rebuilt', color: 'text-red-500' },
  other: { icon: MessageSquare, label: 'Updated', color: 'text-gray-400' },
};

function PromptItem({ prompt, isLast }: { prompt: ProjectPrompt; isLast: boolean }) {
  const config = PROMPT_TYPE_CONFIG[prompt.prompt_type] || PROMPT_TYPE_CONFIG.other;
  const Icon = config.icon;
  
  const timeAgo = useMemo(() => {
    const date = new Date(prompt.created_at);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }, [prompt.created_at]);

  return (
    <div className="group relative">
      {/* Timeline connector */}
      {!isLast && (
        <div className="absolute left-3.5 top-8 h-full w-px bg-white/10" />
      )}
      
      <div className="relative flex gap-3 pb-4">
        {/* Icon */}
        <div className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-zinc-900",
          config.color
        )}>
          <Icon className="size-3.5" />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-medium", config.color)}>
              {config.label}
            </span>
            <span className="text-[10px] text-gray-600">
              #{prompt.sequence_number}
            </span>
            <span className="ml-auto text-[10px] text-gray-600 flex items-center gap-1">
              {prompt.completed_at ? (
                <Check className="size-3 text-emerald-500" />
              ) : (
                <Clock className="size-3 animate-pulse" />
              )}
              {timeAgo}
            </span>
          </div>
          
          <p className="mt-1 text-xs text-gray-300 line-clamp-2">
            {prompt.content}
          </p>
          
          {/* Results */}
          {prompt.change_summary && (
            <p className="mt-1.5 text-[10px] text-gray-500 line-clamp-1">
              {prompt.change_summary}
            </p>
          )}
          
          {(prompt.files_created > 0 || prompt.files_updated > 0) && (
            <div className="mt-1.5 flex gap-2 text-[10px]">
              {prompt.files_created > 0 && (
                <span className="text-emerald-400">+{prompt.files_created} created</span>
              )}
              {prompt.files_updated > 0 && (
                <span className="text-blue-400">{prompt.files_updated} updated</span>
              )}
              {prompt.files_deleted > 0 && (
                <span className="text-red-400">-{prompt.files_deleted} deleted</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PromptHistory() {
  const promptHistory = usePersistentProjectStore((s) => s.promptHistory);
  const currentProject = usePersistentProjectStore((s) => s.currentProject);
  
  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <MessageSquare className="size-8 text-gray-600 mb-2" />
        <p className="text-xs text-gray-500">No project loaded</p>
      </div>
    );
  }
  
  if (promptHistory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <MessageSquare className="size-8 text-gray-600 mb-2" />
        <p className="text-xs text-gray-500">No build history yet</p>
        <p className="text-[10px] text-gray-600 mt-1">
          Start building to see your progress
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <h3 className="text-xs font-medium text-gray-400">Build History</h3>
        <span className="text-[10px] text-gray-600 tabular-nums">
          {promptHistory.length} prompts
        </span>
      </div>
      
      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-3 py-3 scrollbar-thin">
        {promptHistory.map((prompt, i) => (
          <PromptItem 
            key={prompt.prompt_id} 
            prompt={prompt}
            isLast={i === promptHistory.length - 1}
          />
        ))}
      </div>
      
      {/* Current Project Info */}
      <div className="border-t border-white/5 px-3 py-2">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-gray-500">Total Prompts</span>
          <span className="text-gray-400 tabular-nums">{currentProject.total_prompts}</span>
        </div>
        <div className="flex items-center justify-between text-[10px] mt-1">
          <span className="text-gray-500">Files</span>
          <span className="text-gray-400 tabular-nums">{currentProject.current_file_count}</span>
        </div>
        {currentProject.tech_stack.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {currentProject.tech_stack.slice(0, 4).map((tech) => (
              <span 
                key={tech}
                className="px-1.5 py-0.5 text-[9px] bg-white/5 rounded text-gray-500"
              >
                {tech}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
