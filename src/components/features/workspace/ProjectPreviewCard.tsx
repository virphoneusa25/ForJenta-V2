import { Link } from 'react-router-dom';
import { FileCode2, Clock } from 'lucide-react';
import type { Project } from '@/types';

interface ProjectPreviewCardProps {
  project: Project;
}

export default function ProjectPreviewCard({ project }: ProjectPreviewCardProps) {
  const fileCount = project.files.length;
  const timeSince = getTimeSince(project.createdAt);

  return (
    <Link
      to={`/project/${project.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] transition-all hover:border-white/10 hover:bg-white/[0.04] hover:shadow-lg hover:shadow-black/20"
    >
      {/* Thumbnail */}
      <div className="relative flex h-36 items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-800">
        <div className="flex flex-col items-center gap-2 text-gray-600">
          <FileCode2 className="size-8" />
          <span className="text-[10px] uppercase tracking-wider">{fileCount} files</span>
        </div>
        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-black">
            Open
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col p-3.5">
        <h3 className="truncate text-sm font-medium text-white group-hover:text-violet-300">
          {project.name}
        </h3>
        <p className="mt-1 line-clamp-2 text-xs text-gray-500">
          {project.description || project.prompt || 'No description'}
        </p>
        <div className="mt-auto flex items-center gap-2 pt-3 text-[10px] text-gray-600">
          <Clock className="size-3" />
          {timeSince}
          <span className="ml-auto rounded bg-white/5 px-1.5 py-0.5 text-gray-500">
            {project.categories?.[0] || 'Web'}
          </span>
        </div>
      </div>
    </Link>
  );
}

function getTimeSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
