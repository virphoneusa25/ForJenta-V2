import { create } from 'zustand';
import type { Project, ProjectFile, Version, TerminalLine } from '@/types';
import { mockProjects } from '@/constants/mockData';

interface ProjectState {
  projects: Project[];
  addProject: (project: Project) => void;
  getProject: (id: string) => Project | undefined;
  updateFile: (projectId: string, fileId: string, content: string) => void;
  addFile: (projectId: string, file: ProjectFile) => void;
  deleteFile: (projectId: string, fileId: string) => void;
  addVersion: (projectId: string, message: string) => void;
  restoreVersion: (projectId: string, versionId: string) => void;
  deleteProject: (id: string) => void;

  // Terminal state
  terminalLines: TerminalLine[];
  addTerminalLine: (text: string, type: TerminalLine['type']) => void;
  clearTerminal: () => void;
}

function loadProjects(): Project[] {
  const stored = localStorage.getItem('forjenta_projects');
  if (stored) {
    return JSON.parse(stored);
  }
  return mockProjects;
}

function saveProjects(projects: Project[]) {
  localStorage.setItem('forjenta_projects', JSON.stringify(projects));
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: loadProjects(),

  addProject: (project: Project) => {
    const updated = [...get().projects, project];
    saveProjects(updated);
    set({ projects: updated });
  },

  getProject: (id: string) => {
    return get().projects.find((p) => p.id === id);
  },

  updateFile: (projectId: string, fileId: string, content: string) => {
    const projects = get().projects.map((p) => {
      if (p.id === projectId) {
        return {
          ...p,
          files: p.files.map((f) =>
            f.id === fileId ? { ...f, content } : f
          ),
        };
      }
      return p;
    });
    saveProjects(projects);
    set({ projects });
  },

  addFile: (projectId: string, file: ProjectFile) => {
    const projects = get().projects.map((p) => {
      if (p.id === projectId) {
        return { ...p, files: [...p.files, file] };
      }
      return p;
    });
    saveProjects(projects);
    set({ projects });
  },

  deleteFile: (projectId: string, fileId: string) => {
    const projects = get().projects.map((p) => {
      if (p.id === projectId) {
        return { ...p, files: p.files.filter((f) => f.id !== fileId) };
      }
      return p;
    });
    saveProjects(projects);
    set({ projects });
  },

  addVersion: (projectId: string, message: string) => {
    const projects = get().projects.map((p) => {
      if (p.id === projectId) {
        const filesMap: Record<string, string> = {};
        p.files.forEach((f) => {
          filesMap[f.path] = f.content;
        });
        const newVersion: Version = {
          id: `ver-${Date.now()}`,
          versionNumber: (p.versions?.length || 0) + 1,
          message,
          createdAt: new Date().toISOString(),
          files: filesMap,
        };
        return {
          ...p,
          versions: [...(p.versions || []), newVersion],
        };
      }
      return p;
    });
    saveProjects(projects);
    set({ projects });
  },

  restoreVersion: (projectId: string, versionId: string) => {
    const projects = get().projects.map((p) => {
      if (p.id === projectId) {
        const version = p.versions?.find((v) => v.id === versionId);
        if (version) {
          const restoredFiles: ProjectFile[] = Object.entries(version.files).map(
            ([path, content], idx) => ({
              id: `f-restored-${Date.now()}-${idx}`,
              path,
              content,
              language: getLanguageFromPath(path),
            })
          );
          return { ...p, files: restoredFiles };
        }
      }
      return p;
    });
    saveProjects(projects);
    set({ projects });
  },

  deleteProject: (id: string) => {
    const projects = get().projects.filter((p) => p.id !== id);
    saveProjects(projects);
    set({ projects });
  },

  // Terminal
  terminalLines: [
    {
      id: 'init-1',
      text: '> forjenta dev',
      type: 'command',
      timestamp: new Date().toISOString(),
    },
    {
      id: 'init-2',
      text: '  ForJenta IDE v2.0.0 ready',
      type: 'success',
      timestamp: new Date().toISOString(),
    },
    {
      id: 'init-3',
      text: '  Waiting for project...',
      type: 'info',
      timestamp: new Date().toISOString(),
    },
  ],

  addTerminalLine: (text: string, type: TerminalLine['type']) => {
    const line: TerminalLine = {
      id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text,
      type,
      timestamp: new Date().toISOString(),
    };
    set((s) => ({ terminalLines: [...s.terminalLines, line] }));
  },

  clearTerminal: () => set({ terminalLines: [] }),
}));

function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    html: 'html',
    css: 'css',
    json: 'json',
    md: 'markdown',
    py: 'python',
  };
  return map[ext] || 'text';
}
