/**
 * ProjectTimeline - Shows build history and activity for a project
 */

import { useMemo } from 'react';
import { 
  MessageSquare, Plus, Wrench, Paintbrush, Bug, RefreshCw, 
  Database, FileCode, Hammer, Sparkles, Check, Clock, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProjectPrompt, GenerationRun, ProjectActivity, PromptType } from '@/stores/persistentProjectStore';

interface ProjectTimelineProps {
  prompts: ProjectPrompt[];
  generations: GenerationRun[];
  activity: ProjectActivity[];
  maxItems?: number;
}

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

interface TimelineItem {
  id: string;
  type: 'prompt' | 'generation' | 'activity';
  timestamp: Date;
  data: ProjectPrompt | GenerationRun | ProjectActivity;
}

export default function ProjectTimeline({
  prompts,
  generations,
  activity,
  maxItems = 10,
}: ProjectTimelineProps) {
  // Merge and sort all items by timestamp
  const timelineItems = useMemo(() => {
    const items: TimelineItem[] = [];
    
    prompts.forEach(p => {
      items.push({
        id: p.prompt_id,
        type: 'prompt',
        timestamp: new Date(p.created_at),
        data: p,
      });
    });
    
    // We'll primarily show prompts for cleaner view
    // Generations and activity can be expanded
    
    return items
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, maxItems);
  }, [prompts, maxItems]);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (timelineItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Sparkles className="size-8 text-gray-700 mb-2" />
        <p className="text-xs text-gray-600">No build history yet</p>
        <p className="text-[10px] text-gray-700 mt-1">
          Start building to see your progress
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {timelineItems.map((item, idx) => {
        if (item.type === 'prompt') {
          const prompt = item.data as ProjectPrompt;
          const config = PROMPT_TYPE_CONFIG[prompt.prompt_type] || PROMPT_TYPE_CONFIG.other;
          const Icon = config.icon;
          
          return (
            <div key={item.id} className="group relative">
              {/* Connector line */}
              {idx < timelineItems.length - 1 && (
                <div className="absolute left-3 top-7 h-full w-px bg-white/5" />
              )}
              
              <div className="flex gap-2.5 py-1.5">
                {/* Icon */}
                <div className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-zinc-900",
                  config.color
                )}>
                  <Icon className="size-3" />
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-[10px] font-medium", config.color)}>
                      {config.label}
                    </span>
                    <span className="text-[9px] text-gray-700">
                      #{prompt.sequence_number}
                    </span>
                    <span className="ml-auto text-[9px] text-gray-600 flex items-center gap-1">
                      {prompt.completed_at ? (
                        <Check className="size-2.5 text-emerald-500" />
                      ) : (
                        <Clock className="size-2.5 animate-pulse text-amber-500" />
                      )}
                      {formatTime(item.timestamp)}
                    </span>
                  </div>
                  
                  <p className="mt-0.5 text-[11px] text-gray-400 line-clamp-1">
                    {prompt.content}
                  </p>
                  
                  {/* File changes */}
                  {(prompt.files_created > 0 || prompt.files_updated > 0) && (
                    <div className="flex gap-2 mt-1 text-[9px]">
                      {prompt.files_created > 0 && (
                        <span className="text-emerald-500">+{prompt.files_created}</span>
                      )}
                      {prompt.files_updated > 0 && (
                        <span className="text-blue-400">~{prompt.files_updated}</span>
                      )}
                      {prompt.files_deleted > 0 && (
                        <span className="text-red-400">-{prompt.files_deleted}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        }
        
        return null;
      })}
    </div>
  );
}
