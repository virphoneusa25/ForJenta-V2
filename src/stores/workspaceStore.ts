/**
 * ForJenta IDE Workspace Store
 * Central state management for the entire IDE interface.
 */
import { create } from 'zustand';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

// ── Types ──────────────────────────────────────────────────────────

export interface ProjectFile {
  file_id: string;
  path: string;
  content: string;
  language: string;
  size_bytes: number;
  line_count: number;
  version_number: number;
  updated_at: string;
}

export interface FileNode {
  path: string;
  name: string;
  type: 'file' | 'folder';
  language?: string;
  children?: FileNode[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  files?: { path: string; action: 'created' | 'updated' }[];
  summary?: string;
}

export interface TerminalLine {
  text: string;
  type: 'info' | 'success' | 'error' | 'command';
  timestamp: number;
}

// ── Store Interface ────────────────────────────────────────────────

interface WorkspaceState {
  // Project
  projectId: string | null;
  projectName: string;
  projectLoading: boolean;

  // Files
  files: ProjectFile[];
  fileTree: FileNode[];

  // Editor
  openTabs: string[];
  activeFile: string | null;
  dirtyFiles: Set<string>;

  // AI Chat
  messages: ChatMessage[];
  generating: boolean;
  generationProgress: string;

  // Terminal
  terminalLines: TerminalLine[];
  terminalExpanded: boolean;

  // View mode
  activeView: 'code' | 'app';
  previewHtml: string | null;

  // Actions
  loadProject: (id: string) => Promise<void>;
  selectFile: (path: string) => void;
  closeTab: (path: string) => void;
  updateFileContent: (path: string, content: string) => void;
  sendPrompt: (text: string) => Promise<void>;
  toggleTerminal: () => void;
  setActiveView: (view: 'code' | 'app') => void;
  addTerminalLine: (text: string, type: TerminalLine['type']) => void;
  getFileContent: (path: string) => string;
  buildPreviewHtml: () => void;
  reset: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────

function buildFileTree(files: ProjectFile[]): FileNode[] {
  const root: FileNode[] = [];
  const folderMap = new Map<string, FileNode>();

  // Sort files so folders come first, then alphabetically
  const sortedPaths = files.map(f => f.path).sort();

  for (const filePath of sortedPaths) {
    const parts = filePath.split('/');
    const file = files.find(f => f.path === filePath)!;

    if (parts.length === 1) {
      // Root-level file
      root.push({
        path: filePath,
        name: parts[0],
        type: 'file',
        language: file.language,
      });
    } else {
      // Nested file - ensure all parent folders exist
      let currentPath = '';
      let currentChildren = root;

      for (let i = 0; i < parts.length - 1; i++) {
        currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];

        let folder = folderMap.get(currentPath);
        if (!folder) {
          folder = {
            path: currentPath,
            name: parts[i],
            type: 'folder',
            children: [],
          };
          folderMap.set(currentPath, folder);
          currentChildren.push(folder);
        }
        currentChildren = folder.children!;
      }

      // Add the file to the deepest folder
      currentChildren.push({
        path: filePath,
        name: parts[parts.length - 1],
        type: 'file',
        language: file.language,
      });
    }
  }

  // Sort: folders first, then files, alphabetically
  const sortNodes = (nodes: FileNode[]): FileNode[] => {
    return nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    }).map(n => {
      if (n.children) n.children = sortNodes(n.children);
      return n;
    });
  };

  return sortNodes(root);
}

function buildPreview(files: ProjectFile[]): string | null {
  const htmlFile = files.find(f => f.path === 'index.html');
  if (!htmlFile) return null;

  let html = htmlFile.content;

  // Inline CSS files
  const cssFiles = files.filter(f => f.path.endsWith('.css'));
  for (const css of cssFiles) {
    const linkRegex = new RegExp(`<link[^>]*href=["']${css.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>`, 'gi');
    if (linkRegex.test(html)) {
      html = html.replace(linkRegex, `<style>${css.content}</style>`);
    } else {
      // Append before </head>
      html = html.replace('</head>', `<style>/* ${css.path} */\n${css.content}</style>\n</head>`);
    }
  }

  // Inline JS files
  const jsFiles = files.filter(f => f.path.endsWith('.js') && !f.path.includes('node_modules'));
  for (const js of jsFiles) {
    const scriptRegex = new RegExp(`<script[^>]*src=["']${js.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*></script>`, 'gi');
    if (scriptRegex.test(html)) {
      html = html.replace(scriptRegex, `<script>${js.content}</script>`);
    } else {
      html = html.replace('</body>', `<script>/* ${js.path} */\n${js.content}</script>\n</body>`);
    }
  }

  return html;
}

let msgIdCounter = 0;
function nextMsgId(): string {
  return `msg_${Date.now()}_${++msgIdCounter}`;
}

// ── Store ──────────────────────────────────────────────────────────

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  projectId: null,
  projectName: '',
  projectLoading: false,
  files: [],
  fileTree: [],
  openTabs: [],
  activeFile: null,
  dirtyFiles: new Set(),
  messages: [],
  generating: false,
  generationProgress: '',
  terminalLines: [],
  terminalExpanded: false,
  activeView: 'code',
  previewHtml: null,

  reset: () => set({
    projectId: null,
    projectName: '',
    projectLoading: false,
    files: [],
    fileTree: [],
    openTabs: [],
    activeFile: null,
    dirtyFiles: new Set(),
    messages: [],
    generating: false,
    generationProgress: '',
    terminalLines: [],
    terminalExpanded: false,
    activeView: 'code',
    previewHtml: null,
  }),

  loadProject: async (id: string) => {
    set({ projectLoading: true, projectId: id });

    try {
      const response = await fetch(`${API_URL}/api/projects/${id}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        get().addTerminalLine(`Failed to load project: ${response.status}`, 'error');
        set({ projectLoading: false });
        return;
      }

      const data = await response.json();
      const project = data.project;
      const files: ProjectFile[] = data.files || [];
      const prompts = data.prompts || [];

      // Build chat messages from prompt history
      const chatMessages: ChatMessage[] = [];
      for (const p of prompts) {
        chatMessages.push({
          id: nextMsgId(),
          role: 'user',
          content: p.content,
          timestamp: new Date(p.created_at).getTime(),
        });
        if (p.change_summary) {
          chatMessages.push({
            id: nextMsgId(),
            role: 'assistant',
            content: p.change_summary,
            summary: p.change_summary,
            timestamp: new Date(p.completed_at || p.created_at).getTime(),
            files: [],
          });
        }
      }

      const tree = buildFileTree(files);
      const preview = buildPreview(files);

      // Auto-open index.html if it exists
      const indexFile = files.find(f => f.path === 'index.html');
      const firstFile = indexFile || files[0];
      const openTabs = firstFile ? [firstFile.path] : [];
      const activeFile = firstFile?.path || null;

      set({
        projectName: project.name || 'Untitled Project',
        files,
        fileTree: tree,
        openTabs,
        activeFile,
        messages: chatMessages,
        previewHtml: preview,
        projectLoading: false,
        terminalLines: [{
          text: `Loaded project "${project.name}" with ${files.length} files`,
          type: 'success',
          timestamp: Date.now(),
        }],
      });
    } catch (error) {
      console.error('[Workspace] Load error:', error);
      get().addTerminalLine(`Error: ${error}`, 'error');
      set({ projectLoading: false });
    }
  },

  selectFile: (path: string) => {
    const { openTabs } = get();
    const newTabs = openTabs.includes(path) ? openTabs : [...openTabs, path];
    set({ activeFile: path, openTabs: newTabs });
  },

  closeTab: (path: string) => {
    const { openTabs, activeFile } = get();
    const newTabs = openTabs.filter(t => t !== path);
    let newActive = activeFile;
    if (activeFile === path) {
      const idx = openTabs.indexOf(path);
      newActive = newTabs[Math.min(idx, newTabs.length - 1)] || null;
    }
    set({ openTabs: newTabs, activeFile: newActive });
  },

  updateFileContent: (path: string, content: string) => {
    const { files, dirtyFiles } = get();
    const updated = files.map(f => f.path === path ? { ...f, content } : f);
    const newDirty = new Set(dirtyFiles);
    newDirty.add(path);
    set({ files: updated, dirtyFiles: newDirty });
  },

  getFileContent: (path: string) => {
    const file = get().files.find(f => f.path === path);
    return file?.content || '';
  },

  sendPrompt: async (text: string) => {
    const { projectId, files, messages } = get();
    if (!projectId || !text.trim()) return;

    // Add user message
    const userMsg: ChatMessage = {
      id: nextMsgId(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    set({
      messages: [...messages, userMsg],
      generating: true,
      generationProgress: 'Analyzing prompt...',
    });

    get().addTerminalLine(`> Sending prompt: "${text.substring(0, 60)}..."`, 'command');

    try {
      // Step 1: Register prompt with the project
      set({ generationProgress: 'Registering prompt...' });
      const promptRes = await fetch(`${API_URL}/api/projects/${projectId}/prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ prompt: text, force_rebuild: false }),
      });

      if (!promptRes.ok) {
        throw new Error(`Prompt registration failed: ${promptRes.status}`);
      }
      const promptData = await promptRes.json();
      const runId = promptData.run.run_id;
      const promptId = promptData.prompt.prompt_id;

      // Step 2: Build context from current files
      const contextStr = files.length > 0
        ? files.map(f => `--- ${f.path} ---\n${f.content}`).join('\n\n').substring(0, 8000)
        : '';

      // Step 3: Call code generation
      set({ generationProgress: 'Generating code with AI...' });
      get().addTerminalLine('Generating code...', 'info');

      const genRes = await fetch(`${API_URL}/api/generate-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          prompt: text,
          categories: ['Web'],
          context: contextStr,
          mode: contextStr ? 'continuation' : 'full',
        }),
      });

      if (!genRes.ok) {
        throw new Error(`Generation failed: ${genRes.status}`);
      }

      const genData = await genRes.json();

      if (!genData.success) {
        throw new Error(genData.error || 'Generation returned failure');
      }

      const newFiles = genData.files || [];
      get().addTerminalLine(`Generated ${newFiles.length} file(s)`, 'success');

      // Step 4: Save files to project
      set({ generationProgress: 'Saving files...' });
      if (newFiles.length > 0) {
        await fetch(`${API_URL}/api/projects/${projectId}/files`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            files: newFiles,
            run_id: runId,
            prompt_id: promptId,
            change_reason: text.substring(0, 100),
          }),
        });
      }

      // Step 5: Refresh files from server
      set({ generationProgress: 'Refreshing workspace...' });
      const filesRes = await fetch(`${API_URL}/api/projects/${projectId}/files`, {
        credentials: 'include',
      });

      let updatedFiles = files;
      if (filesRes.ok) {
        const filesData = await filesRes.json();
        updatedFiles = filesData.files || [];
      }

      // Build file change list for the AI message
      const fileChanges = newFiles.map((f: any) => ({
        path: f.path,
        action: (files.find(ef => ef.path === f.path) ? 'updated' : 'created') as 'created' | 'updated',
      }));

      // AI response message
      const aiMsg: ChatMessage = {
        id: nextMsgId(),
        role: 'assistant',
        content: genData.summary || `Generated ${newFiles.length} files`,
        summary: genData.summary,
        timestamp: Date.now(),
        files: fileChanges,
      };

      const tree = buildFileTree(updatedFiles);
      const preview = buildPreview(updatedFiles);

      // Open the first generated/modified file
      const { openTabs } = get();
      const firstNewFile = newFiles[0]?.path;
      const newOpenTabs = firstNewFile && !openTabs.includes(firstNewFile)
        ? [...openTabs, firstNewFile]
        : openTabs;

      set({
        files: updatedFiles,
        fileTree: tree,
        previewHtml: preview,
        messages: [...get().messages, aiMsg],
        generating: false,
        generationProgress: '',
        openTabs: newOpenTabs,
        activeFile: firstNewFile || get().activeFile,
        dirtyFiles: new Set(),
      });

      get().addTerminalLine('Generation complete!', 'success');

      // Update generation run as complete
      await fetch(`${API_URL}/api/projects/${projectId}/generations/${runId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status: 'complete',
          change_summary: genData.summary,
          prompt_id: promptId,
          files_created: fileChanges.filter((f: any) => f.action === 'created').map((f: any) => f.path),
          files_updated: fileChanges.filter((f: any) => f.action === 'updated').map((f: any) => f.path),
        }),
      });

    } catch (error: any) {
      console.error('[Workspace] Generation error:', error);
      get().addTerminalLine(`Error: ${error.message}`, 'error');

      const errMsg: ChatMessage = {
        id: nextMsgId(),
        role: 'assistant',
        content: `Generation failed: ${error.message}`,
        timestamp: Date.now(),
      };

      set({
        messages: [...get().messages, errMsg],
        generating: false,
        generationProgress: '',
      });
    }
  },

  toggleTerminal: () => set(s => ({ terminalExpanded: !s.terminalExpanded })),

  setActiveView: (view: 'code' | 'app') => {
    set({ activeView: view });
    if (view === 'app') {
      // Rebuild preview when switching to app view
      const preview = buildPreview(get().files);
      set({ previewHtml: preview });
    }
  },

  addTerminalLine: (text: string, type: TerminalLine['type']) => {
    set(s => ({
      terminalLines: [...s.terminalLines, { text, type, timestamp: Date.now() }],
    }));
  },

  buildPreviewHtml: () => {
    const preview = buildPreview(get().files);
    set({ previewHtml: preview });
  },
}));
