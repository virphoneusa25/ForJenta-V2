/**
 * ForJenta IDE Workspace Store
 * Central state management for the entire IDE interface.
 * Generation always goes through the backend Inworld AI provider.
 */
import { create } from 'zustand';
import { runGeneration, type LogCallback } from '@/lib/generationOrchestrator';
import { checkProviderStatus } from '@/lib/aiProviderRegistry';
import { DEFAULT_MODEL, type ModelConfig } from '@/lib/modelConfig';

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
  isError?: boolean;
  retryPrompt?: string;
  errorCode?: string;
}

export interface TerminalLine {
  text: string;
  type: 'info' | 'success' | 'error' | 'command';
  timestamp: number;
}

// ── Store Interface ────────────────────────────────────────────────

interface WorkspaceState {
  projectId: string | null;
  projectName: string;
  projectLoading: boolean;
  activeProjectPrompt: string;

  files: ProjectFile[];
  fileTree: FileNode[];

  openTabs: string[];
  activeFile: string | null;
  dirtyFiles: Set<string>;

  messages: ChatMessage[];
  generating: boolean;
  generationProgress: string;

  terminalLines: TerminalLine[];
  terminalExpanded: boolean;

  activeView: 'code' | 'app';
  previewHtml: string | null;

  selectedModel: ModelConfig;
  providerAvailable: boolean | null;

  sessionStatus: 'idle' | 'loading' | 'ready' | 'generating' | 'error';
  lastError: string | null;
  isAuthenticated: boolean;

  // Actions
  initProject: (id: string) => Promise<void>;
  selectFile: (path: string) => void;
  closeTab: (path: string) => void;
  updateFileContent: (path: string, content: string) => void;
  sendPrompt: (text: string) => Promise<void>;
  retryLastPrompt: () => Promise<void>;
  regenerate: () => Promise<void>;
  toggleTerminal: () => void;
  setActiveView: (view: 'code' | 'app') => void;
  addTerminalLine: (text: string, type: TerminalLine['type']) => void;
  getFileContent: (path: string) => string;
  buildPreviewHtml: () => void;
  setSelectedModel: (model: ModelConfig) => void;
  saveSession: () => void;
  reset: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────

function buildFileTree(files: ProjectFile[]): FileNode[] {
  const root: FileNode[] = [];
  const folderMap = new Map<string, FileNode>();
  const sortedPaths = files.map(f => f.path).sort();

  for (const filePath of sortedPaths) {
    const parts = filePath.split('/');
    const file = files.find(f => f.path === filePath)!;

    if (parts.length === 1) {
      root.push({ path: filePath, name: parts[0], type: 'file', language: file.language });
    } else {
      let currentPath = '';
      let currentChildren = root;
      for (let i = 0; i < parts.length - 1; i++) {
        currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
        let folder = folderMap.get(currentPath);
        if (!folder) {
          folder = { path: currentPath, name: parts[i], type: 'folder', children: [] };
          folderMap.set(currentPath, folder);
          currentChildren.push(folder);
        }
        currentChildren = folder.children!;
      }
      currentChildren.push({ path: filePath, name: parts[parts.length - 1], type: 'file', language: file.language });
    }
  }

  const sortNodes = (nodes: FileNode[]): FileNode[] =>
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    }).map(n => { if (n.children) n.children = sortNodes(n.children); return n; });

  return sortNodes(root);
}

function buildPreview(files: ProjectFile[]): string | null {
  const htmlFile = files.find(f => f.path === 'index.html');
  if (!htmlFile) return null;
  let html = htmlFile.content;

  for (const css of files.filter(f => f.path.endsWith('.css'))) {
    const rx = new RegExp(`<link[^>]*href=["']${css.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>`, 'gi');
    if (rx.test(html)) html = html.replace(rx, `<style>${css.content}</style>`);
    else html = html.replace('</head>', `<style>\n${css.content}</style>\n</head>`);
  }
  for (const js of files.filter(f => f.path.endsWith('.js') && !f.path.includes('node_modules'))) {
    const rx = new RegExp(`<script[^>]*src=["']${js.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*></script>`, 'gi');
    if (rx.test(html)) html = html.replace(rx, `<script>${js.content}</script>`);
    else html = html.replace('</body>', `<script>\n${js.content}</script>\n</body>`);
  }
  return html;
}

let msgIdCounter = 0;
function nextMsgId(): string { return `msg_${Date.now()}_${++msgIdCounter}`; }

function storageKey(projectId: string): string { return `forjenta_ws_${projectId}`; }

function saveToStorage(state: WorkspaceState) {
  if (!state.projectId) return;
  try {
    localStorage.setItem(storageKey(state.projectId), JSON.stringify({
      projectId: state.projectId,
      projectName: state.projectName,
      activeProjectPrompt: state.activeProjectPrompt,
      files: state.files,
      messages: state.messages,
      openTabs: state.openTabs,
      activeFile: state.activeFile,
      activeView: state.activeView,
      selectedModel: state.selectedModel,
      terminalLines: state.terminalLines.slice(-50),
    }));
  } catch {}
}

function loadFromStorage(projectId: string): any | null {
  try {
    const raw = localStorage.getItem(storageKey(projectId));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function guessLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  return ({ html: 'html', htm: 'html', css: 'css', js: 'javascript', ts: 'typescript', jsx: 'javascript', tsx: 'typescript', json: 'json', md: 'markdown', py: 'python', svg: 'xml' } as Record<string, string>)[ext] || 'text';
}

// ── Store ──────────────────────────────────────────────────────────

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  projectId: null,
  projectName: '',
  projectLoading: false,
  activeProjectPrompt: '',
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
  selectedModel: DEFAULT_MODEL,
  providerAvailable: null,
  sessionStatus: 'idle',
  lastError: null,
  isAuthenticated: false,

  reset: () => set({
    projectId: null, projectName: '', projectLoading: false, activeProjectPrompt: '',
    files: [], fileTree: [], openTabs: [], activeFile: null, dirtyFiles: new Set(),
    messages: [], generating: false, generationProgress: '',
    terminalLines: [], terminalExpanded: false, activeView: 'code', previewHtml: null,
    sessionStatus: 'idle', lastError: null, isAuthenticated: false, providerAvailable: null,
  }),

  saveSession: () => saveToStorage(get()),

  setSelectedModel: (model: ModelConfig) => { set({ selectedModel: model }); saveToStorage(get()); },

  // ── Init Project ─────────────────────────────────────────────────
  initProject: async (id: string) => {
    set({ projectLoading: true, projectId: id, sessionStatus: 'loading' });

    // 1. Restore from localStorage immediately
    const cached = loadFromStorage(id);
    if (cached && (cached.files?.length > 0 || cached.messages?.length > 0)) {
      const cachedFiles = cached.files || [];
      set({
        projectName: cached.projectName || 'Untitled Project',
        activeProjectPrompt: cached.activeProjectPrompt || '',
        files: cachedFiles,
        fileTree: buildFileTree(cachedFiles),
        openTabs: cached.openTabs || [],
        activeFile: cached.activeFile || null,
        messages: cached.messages || [],
        activeView: cached.activeView || 'code',
        selectedModel: cached.selectedModel || DEFAULT_MODEL,
        previewHtml: buildPreview(cachedFiles),
        terminalLines: cached.terminalLines || [],
      });
    }

    // 2. Check provider status (never requires user auth)
    checkProviderStatus().then(status => {
      set({ providerAvailable: status.available });
      if (status.available) {
        get().addTerminalLine(`Inworld AI provider: available (model: ${status.modelId})`, 'success');
      } else {
        get().addTerminalLine(`Inworld AI provider: unavailable — ${status.message || status.error}`, 'error');
      }
    }).catch(() => {
      get().addTerminalLine('Could not verify provider status', 'info');
    });

    // 3. Try loading project data from backend API
    try {
      const response = await fetch(`${API_URL}/api/projects/${id}`, { credentials: 'include' });

      if (response.ok) {
        const data = await response.json();
        const project = data.project;
        const files: ProjectFile[] = data.files || [];
        const prompts = data.prompts || [];

        const chatMessages: ChatMessage[] = [];
        for (const p of prompts) {
          chatMessages.push({ id: nextMsgId(), role: 'user', content: p.content, timestamp: new Date(p.created_at).getTime() });
          if (p.change_summary) {
            chatMessages.push({ id: nextMsgId(), role: 'assistant', content: p.change_summary, summary: p.change_summary, timestamp: new Date(p.completed_at || p.created_at).getTime(), files: [] });
          }
        }

        const existingMessages = get().messages;
        const mergedMessages = chatMessages.length >= existingMessages.length ? chatMessages : existingMessages;
        const mergedFiles = files.length > 0 ? files : get().files;
        const tree = buildFileTree(mergedFiles);
        const preview = buildPreview(mergedFiles);
        const firstPrompt = prompts[0]?.content || get().activeProjectPrompt || '';
        const indexFile = mergedFiles.find(f => f.path === 'index.html');
        const firstFile = indexFile || mergedFiles[0];
        const existingTabs = get().openTabs;
        const openTabs = existingTabs.length > 0 ? existingTabs : (firstFile ? [firstFile.path] : []);
        const activeFile = get().activeFile || firstFile?.path || null;

        set({
          projectName: project.name || get().projectName || 'Untitled Project',
          activeProjectPrompt: firstPrompt,
          files: mergedFiles, fileTree: tree, openTabs, activeFile,
          messages: mergedMessages, previewHtml: preview,
          isAuthenticated: true, sessionStatus: 'ready',
        });
        get().addTerminalLine(`Loaded project "${project.name}" with ${mergedFiles.length} files`, 'success');
      } else if (response.status === 401) {
        get().addTerminalLine('User session not found, but server-side AI provider is available. Continuing with provider mode.', 'info');
        set({ isAuthenticated: false, sessionStatus: 'ready' });
      } else {
        get().addTerminalLine(`Project load returned ${response.status}`, 'error');
        set({ sessionStatus: 'ready' });
      }
    } catch (error) {
      get().addTerminalLine('Backend unreachable for project data — using cached session', 'info');
      set({ sessionStatus: 'ready' });
    }

    set({ projectLoading: false });
    saveToStorage(get());
  },

  selectFile: (path: string) => {
    const { openTabs } = get();
    set({ activeFile: path, openTabs: openTabs.includes(path) ? openTabs : [...openTabs, path] });
    saveToStorage(get());
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
    saveToStorage(get());
  },

  updateFileContent: (path: string, content: string) => {
    const { files, dirtyFiles } = get();
    const updated = files.map(f => f.path === path ? { ...f, content } : f);
    const newDirty = new Set(dirtyFiles);
    newDirty.add(path);
    set({ files: updated, dirtyFiles: newDirty });
  },

  getFileContent: (path: string) => get().files.find(f => f.path === path)?.content || '',

  // ── Send Prompt (uses backend provider, never "local mode") ──────
  sendPrompt: async (text: string) => {
    const state = get();
    if (!state.projectId || !text.trim() || state.generating) return;

    const isFirstPrompt = state.messages.filter(m => m.role === 'user').length === 0;
    const activeProjectPrompt = isFirstPrompt ? text : state.activeProjectPrompt || text;

    const userMsg: ChatMessage = { id: nextMsgId(), role: 'user', content: text, timestamp: Date.now() };
    set({
      messages: [...state.messages, userMsg],
      generating: true,
      generationProgress: 'Preparing...',
      sessionStatus: 'generating',
      lastError: null,
      activeProjectPrompt,
    });

    get().addTerminalLine(`> Prompt: "${text.substring(0, 80)}..."`, 'command');
    saveToStorage(get());

    // Optional: register prompt to project (informational only, never blocks generation)
    if (state.isAuthenticated) {
      try {
        await fetch(`${API_URL}/api/projects/${state.projectId}/prompts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ prompt: text, force_rebuild: false }),
        });
      } catch {
        // Prompt registration is optional — does not affect generation
      }
    }

    // Build generation input from current workspace state
    const input = {
      projectId: state.projectId,
      rootPrompt: activeProjectPrompt,
      followUpPrompt: isFirstPrompt ? undefined : text,
      fileTree: state.files.map(f => ({ path: f.path, content: f.content, language: f.language })),
      openFiles: state.openTabs,
      buildHistory: state.messages.filter(m => m.role === 'user').map(m => m.content),
    };

    // Log callback wires orchestrator logs → terminal + progress bar
    const onLog: LogCallback = (logText, type) => {
      get().addTerminalLine(logText, type);
      if (type !== 'error') {
        set({ generationProgress: logText });
      }
    };

    // ── Execute generation through orchestrator ────────────────────
    const result = await runGeneration(input, onLog);

    if (!result.success) {
      // Structured error handling
      const errMsg: ChatMessage = {
        id: nextMsgId(),
        role: 'assistant',
        content: result.error || 'Generation failed.',
        timestamp: Date.now(),
        isError: true,
        retryPrompt: text,
        errorCode: result.errorCode,
      };

      set({
        messages: [...get().messages, errMsg],
        generating: false,
        generationProgress: '',
        sessionStatus: 'error',
        lastError: result.error || null,
      });
      saveToStorage(get());
      return;
    }

    // ── Merge generated files into workspace ───────────────────────
    const existingFiles = get().files;
    const mergedFiles: ProjectFile[] = [...existingFiles];

    for (const nf of result.files) {
      const idx = mergedFiles.findIndex(f => f.path === nf.path);
      const pf: ProjectFile = {
        file_id: `gen_${Date.now()}_${nf.path}`,
        path: nf.path,
        content: nf.content,
        language: nf.language || guessLanguage(nf.path),
        size_bytes: new Blob([nf.content]).size,
        line_count: nf.content.split('\n').length,
        version_number: idx >= 0 ? (mergedFiles[idx].version_number + 1) : 1,
        updated_at: new Date().toISOString(),
      };
      if (idx >= 0) mergedFiles[idx] = pf; else mergedFiles.push(pf);
    }

    // Try saving to backend (optional, doesn't block)
    if (state.isAuthenticated && result.files.length > 0) {
      try {
        await fetch(`${API_URL}/api/projects/${state.projectId}/files`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ files: result.files, run_id: null, prompt_id: null, change_reason: text.substring(0, 100) }),
        });
        get().addTerminalLine('Files saved to backend', 'success');
      } catch {
        get().addTerminalLine('Backend save skipped — files stored in workspace', 'info');
      }
    }

    // Build file change list
    const fileChanges = result.files.map(f => ({
      path: f.path,
      action: (existingFiles.find(ef => ef.path === f.path) ? 'updated' : 'created') as 'created' | 'updated',
    }));

    const aiMsg: ChatMessage = {
      id: nextMsgId(),
      role: 'assistant',
      content: result.summary || `Generated ${result.files.length} files`,
      summary: result.summary,
      timestamp: Date.now(),
      files: fileChanges,
    };

    const tree = buildFileTree(mergedFiles);
    const preview = buildPreview(mergedFiles);
    const { openTabs } = get();
    const firstNewFile = result.files[0]?.path;
    const newOpenTabs = firstNewFile && !openTabs.includes(firstNewFile) ? [...openTabs, firstNewFile] : openTabs;

    set({
      files: mergedFiles,
      fileTree: tree,
      previewHtml: preview,
      messages: [...get().messages, aiMsg],
      generating: false,
      generationProgress: '',
      openTabs: newOpenTabs,
      activeFile: firstNewFile || get().activeFile,
      dirtyFiles: new Set(),
      sessionStatus: 'ready',
      lastError: null,
    });

    saveToStorage(get());
  },

  retryLastPrompt: async () => {
    const { messages } = get();
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].isError && messages[i].retryPrompt) {
        const prompt = messages[i].retryPrompt!;
        set({ messages: messages.filter((_, idx) => idx !== i) });
        await get().sendPrompt(prompt);
        return;
      }
    }
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        await get().sendPrompt(messages[i].content);
        return;
      }
    }
  },

  regenerate: async () => {
    const { messages } = get();
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        await get().sendPrompt(messages[i].content);
        return;
      }
    }
  },

  toggleTerminal: () => set(s => ({ terminalExpanded: !s.terminalExpanded })),

  setActiveView: (view: 'code' | 'app') => {
    set({ activeView: view });
    if (view === 'app') set({ previewHtml: buildPreview(get().files) });
    saveToStorage(get());
  },

  addTerminalLine: (text: string, type: TerminalLine['type']) => {
    set(s => ({ terminalLines: [...s.terminalLines, { text, type, timestamp: Date.now() }] }));
  },

  buildPreviewHtml: () => set({ previewHtml: buildPreview(get().files) }),
}));
