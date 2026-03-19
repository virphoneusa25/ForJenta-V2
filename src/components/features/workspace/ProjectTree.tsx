import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight,
  FolderOpen,
  Folder,
  FileCode2,
  Plus,
  MoreHorizontal,
} from 'lucide-react';
import type { Project } from '@/types';

interface ProjectTreeItemProps {
  project: Project;
}

function ProjectTreeItem({ project }: ProjectTreeItemProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <div className="group flex items-center gap-1 rounded-lg pr-1 transition-colors hover:bg-white/[0.04]">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex size-6 shrink-0 items-center justify-center text-gray-600"
        >
          <ChevronRight
            className={`size-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
        </button>
        <Link
          to={`/project/${project.id}`}
          className="flex flex-1 items-center gap-2 truncate py-1.5 text-sm text-gray-300 transition-colors hover:text-white"
        >
          {expanded ? (
            <FolderOpen className="size-3.5 shrink-0 text-violet-400" />
          ) : (
            <Folder className="size-3.5 shrink-0 text-gray-500" />
          )}
          <span className="truncate text-xs">{project.name}</span>
        </Link>
        <button className="hidden rounded p-1 text-gray-600 hover:bg-white/5 hover:text-gray-300 group-hover:block">
          <MoreHorizontal className="size-3" />
        </button>
      </div>

      {expanded && project.files.length > 0 && (
        <div className="ml-4 flex flex-col gap-0.5 border-l border-white/5 pl-2">
          {project.files.slice(0, 8).map((file) => (
            <Link
              key={file.id}
              to={`/project/${project.id}`}
              className="flex items-center gap-2 rounded-md px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-white/[0.03] hover:text-gray-300"
            >
              <FileCode2 className="size-3 shrink-0" />
              <span className="truncate">{file.path}</span>
            </Link>
          ))}
          {project.files.length > 8 && (
            <span className="px-2 py-1 text-[10px] text-gray-600">
              +{project.files.length - 8} more files
            </span>
          )}
        </div>
      )}
    </div>
  );
}

interface ProjectTreeProps {
  projects: Project[];
}

export default function ProjectTree({ projects }: ProjectTreeProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="flex flex-col">
      <div className="mb-1 flex items-center justify-between px-2.5">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500"
        >
          <ChevronRight
            className={`size-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
          Projects
        </button>
        <button className="rounded p-0.5 text-gray-600 transition-colors hover:bg-white/5 hover:text-gray-300">
          <Plus className="size-3.5" />
        </button>
      </div>

      {expanded && (
        <div className="flex flex-col gap-0.5 overflow-y-auto px-1" style={{ maxHeight: 'calc(100vh - 460px)' }}>
          {projects.length === 0 ? (
            <p className="px-2.5 py-3 text-xs text-gray-600">No projects yet</p>
          ) : (
            projects.map((p) => <ProjectTreeItem key={p.id} project={p} />)
          )}
        </div>
      )}
    </div>
  );
}
