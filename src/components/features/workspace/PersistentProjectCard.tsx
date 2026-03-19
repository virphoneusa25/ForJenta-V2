/**
 * PersistentProjectCard - Shows a project card with build history and status
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FolderOpen, Clock, FileCode2, GitBranch, ChevronRight, 
  MessageSquare, Sparkles, MoreHorizontal, Trash2, Play
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePersistentProjectStore, PersistentProject } from '@/stores/persistentProjectStore';

interface PersistentProjectCardProps {
  project: PersistentProject;
  onSelect: (projectId: string) => void;
  isSelected?: boolean;
}

export default function PersistentProjectCard({ 
  project, 
  onSelect,
  isSelected 
}: PersistentProjectCardProps) {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const deleteProject = usePersistentProjectStore((s) => s.deleteProject);

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

  const handleOpen = () => {
    navigate(`/project/${project.project_id}`);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Delete "${project.name}"? This cannot be undone.`)) {
      await deleteProject(project.project_id);
    }
    setShowMenu(false);
  };

  return (
    <div
      onClick={() => onSelect(project.project_id)}
      className={cn(
        "group relative rounded-xl border p-4 cursor-pointer transition-all",
        isSelected
          ? "border-violet-500/50 bg-violet-500/10"
          : "border-white/10 bg-zinc-900/50 hover:border-white/20 hover:bg-zinc-900"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center justify-center size-10 rounded-lg",
            isSelected ? "bg-violet-500/20" : "bg-white/5"
          )}>
            <FolderOpen className={cn(
              "size-5",
              isSelected ? "text-violet-400" : "text-gray-400"
            )} />
          </div>
          <div>
            <h3 className="font-medium text-white text-sm">{project.name}</h3>
            <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
              <Clock className="size-3" />
              {timeAgo(project.updated_at)}
            </p>
          </div>
        </div>

        {/* Menu */}
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="size-4" />
          </button>
          
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-8 z-20 w-36 rounded-lg border border-white/10 bg-zinc-900 py-1 shadow-xl">
                <button
                  onClick={handleOpen}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/5"
                >
                  <Play className="size-3" /> Open
                </button>
                <button
                  onClick={handleDelete}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="size-3" /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-xs text-gray-500 line-clamp-2 mb-3">
          {project.description}
        </p>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 text-[10px] text-gray-600">
        <span className="flex items-center gap-1">
          <FileCode2 className="size-3" />
          {project.current_file_count} files
        </span>
        <span className="flex items-center gap-1">
          <MessageSquare className="size-3" />
          {project.total_prompts} prompts
        </span>
        {project.total_generations > 0 && (
          <span className="flex items-center gap-1">
            <Sparkles className="size-3" />
            {project.total_generations} builds
          </span>
        )}
      </div>

      {/* Tech Stack */}
      {project.tech_stack.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {project.tech_stack.slice(0, 4).map((tech) => (
            <span
              key={tech}
              className="px-1.5 py-0.5 text-[9px] bg-white/5 rounded text-gray-500"
            >
              {tech}
            </span>
          ))}
        </div>
      )}

      {/* Continue indicator */}
      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); handleOpen(); }}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-500 text-white text-[10px] font-medium"
        >
          Continue <ChevronRight className="size-3" />
        </button>
      </div>
    </div>
  );
}
