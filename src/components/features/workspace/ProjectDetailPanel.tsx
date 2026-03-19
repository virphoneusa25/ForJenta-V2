/**
 * ProjectDetailPanel - Shows selected project details with timeline and quick actions
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FolderOpen, Play, Clock, FileCode2, MessageSquare, 
  Sparkles, ChevronRight, GitBranch, Send, Loader2, X,
  History, Layers, Github
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePersistentProjectStore } from '@/stores/persistentProjectStore';
import ProjectTimeline from './ProjectTimeline';

interface ProjectDetailPanelProps {
  projectId: string | null;
  onClose?: () => void;
  isMobile?: boolean;
}

export default function ProjectDetailPanel({ 
  projectId, 
  onClose,
  isMobile = false 
}: ProjectDetailPanelProps) {
  const navigate = useNavigate();
  const [quickPrompt, setQuickPrompt] = useState('');
  
  const currentProject = usePersistentProjectStore((s) => s.currentProject);
  const promptHistory = usePersistentProjectStore((s) => s.promptHistory);
  const generationHistory = usePersistentProjectStore((s) => s.generationHistory);
  const activityTimeline = usePersistentProjectStore((s) => s.activityTimeline);
  const loadingProject = usePersistentProjectStore((s) => s.loadingProject);
  const loadProject = usePersistentProjectStore((s) => s.loadProject);

  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
    }
  }, [projectId, loadProject]);

  const handleOpenProject = () => {
    if (currentProject) {
      navigate(`/project/${currentProject.project_id}`);
    }
  };

  const handleQuickContinue = () => {
    if (currentProject && quickPrompt.trim()) {
      // Navigate to project with pre-filled prompt
      sessionStorage.setItem('forjenta_quick_prompt', quickPrompt);
      navigate(`/project/${currentProject.project_id}`);
    }
  };

  if (!projectId) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center text-center p-8",
        isMobile ? "h-full" : "h-96"
      )}>
        <FolderOpen className="size-12 text-gray-700 mb-3" />
        <h3 className="text-sm font-medium text-gray-400 mb-1">Select a Project</h3>
        <p className="text-xs text-gray-600">
          Choose a project to see its history and continue building
        </p>
      </div>
    );
  }

  if (loadingProject) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center",
        isMobile ? "h-full" : "h-96"
      )}>
        <Loader2 className="size-8 animate-spin text-violet-500 mb-3" />
        <p className="text-xs text-gray-500">Loading project...</p>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center text-center p-8",
        isMobile ? "h-full" : "h-96"
      )}>
        <FolderOpen className="size-12 text-gray-700 mb-3" />
        <h3 className="text-sm font-medium text-gray-400 mb-1">Project Not Found</h3>
        <p className="text-xs text-gray-600">
          This project may have been deleted
        </p>
      </div>
    );
  }

  const timeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
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

  return (
    <div className={cn(
      "flex flex-col bg-zinc-950",
      isMobile ? "h-full" : "h-full"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-violet-500/20">
            <FolderOpen className="size-5 text-violet-400" />
          </div>
          <div>
            <h2 className="font-medium text-white text-sm">{currentProject.name}</h2>
            <p className="text-[10px] text-gray-500 flex items-center gap-1">
              <Clock className="size-3" />
              Updated {timeAgo(currentProject.updated_at)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenProject}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500 text-white text-xs font-medium hover:bg-violet-400 transition-colors"
          >
            <Play className="size-3" />
            Continue
          </button>
          {isMobile && onClose && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10">
              <X className="size-4 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* Quick prompt */}
      <div className="px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={quickPrompt}
            onChange={(e) => setQuickPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleQuickContinue()}
            placeholder="Quick continue... (e.g., 'Add dark mode')"
            className="flex-1 px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-sm text-white placeholder-gray-600 outline-none focus:border-violet-500"
          />
          <button
            onClick={handleQuickContinue}
            disabled={!quickPrompt.trim()}
            className={cn(
              "p-2 rounded-lg transition-colors",
              quickPrompt.trim()
                ? "bg-violet-500 text-white hover:bg-violet-400"
                : "bg-white/5 text-gray-600"
            )}
          >
            <Send className="size-4" />
          </button>
        </div>
        <p className="text-[10px] text-gray-600 mt-1.5 px-1">
          This will continue your project, not rebuild it
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 px-4 py-3 border-b border-white/5">
        <div className="flex flex-col items-center justify-center py-2 rounded-lg bg-white/5">
          <FileCode2 className="size-4 text-gray-500 mb-1" />
          <span className="text-sm font-medium text-white">{currentProject.current_file_count}</span>
          <span className="text-[9px] text-gray-600">Files</span>
        </div>
        <div className="flex flex-col items-center justify-center py-2 rounded-lg bg-white/5">
          <MessageSquare className="size-4 text-gray-500 mb-1" />
          <span className="text-sm font-medium text-white">{currentProject.total_prompts}</span>
          <span className="text-[9px] text-gray-600">Prompts</span>
        </div>
        <div className="flex flex-col items-center justify-center py-2 rounded-lg bg-white/5">
          <Sparkles className="size-4 text-gray-500 mb-1" />
          <span className="text-sm font-medium text-white">{currentProject.total_generations}</span>
          <span className="text-[9px] text-gray-600">Builds</span>
        </div>
      </div>

      {/* Tech stack */}
      {currentProject.tech_stack.length > 0 && (
        <div className="px-4 py-2 border-b border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="size-3 text-gray-500" />
            <span className="text-[10px] text-gray-500 font-medium">Tech Stack</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {currentProject.tech_stack.map((tech) => (
              <span
                key={tech}
                className="px-2 py-0.5 text-[10px] bg-white/5 rounded-full text-gray-400"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Build Timeline */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <History className="size-3 text-gray-500" />
            <span className="text-[10px] text-gray-500 font-medium">Build Timeline</span>
          </div>
          <span className="text-[9px] text-gray-600">
            {promptHistory.length} entries
          </span>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 py-2 scrollbar-thin">
          <ProjectTimeline
            prompts={promptHistory}
            generations={generationHistory}
            activity={activityTimeline}
            maxItems={20}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/5 px-4 py-2">
        <p className="text-[9px] text-gray-600 text-center">
          Created {new Date(currentProject.created_at).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
