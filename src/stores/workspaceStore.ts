/**
 * ForJenta IDE Workspace Store
 * Central state management for the entire IDE interface.
 * Handles: project state, AI generation, file management, session persistence.
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
  isError?: boolean;
  retryPrompt?: string;
}

export interface TerminalLine {
  text: string;
  type: 'info' | 'success' | 'error' | 'command';
  timestamp: number;
}

export interface ProviderConfig {
  providerId: string;
  providerLabel: string;
  modelId: string;
  modelLabel: string;
  apiKeyEnvName: string;
  requiresAuth: boolean;
  iconType: 'star' | 'sparkle' | 'bot';
}

// ── Default Provider ───────────────────────────────────────────────

const DEFAULT_PROVIDER: ProviderConfig = {
  providerId: 'inworld',
  providerLabel: 'Claude',
  modelId: 'inworld/default-forjenta-model',
  modelLabel: 'Claude Opus 4.6',
  apiKeyEnvName: 'INWORLD_API_KEY',
  requiresAuth: false,
  iconType: 'star',
};

// ── Store Interface ────────────────────────────────────────────────

interface WorkspaceState {
  // Project
  projectId: string | null;
  projectName: string;
  projectLoading: boolean;
  activeProjectPrompt: string;

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

  // Provider
  selectedModel: ProviderConfig;

  // Session
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
  setSelectedModel: (model: ProviderConfig) => void;
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

  const cssFiles = files.filter(f => f.path.endsWith('.css'));
  for (const css of cssFiles) {
    const linkRx = new RegExp(`<link[^>]*href=["']${css.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>`, 'gi');
    if (linkRx.test(html)) { html = html.replace(linkRx, `<style>${css.content}</style>`); }
    else { html = html.replace('</head>', `<style>/* ${css.path} */\n${css.content}</style>\n</head>`); }
  }

  const jsFiles = files.filter(f => f.path.endsWith('.js') && !f.path.includes('node_modules'));
  for (const js of jsFiles) {
    const scriptRx = new RegExp(`<script[^>]*src=["']${js.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*></script>`, 'gi');
    if (scriptRx.test(html)) { html = html.replace(scriptRx, `<script>${js.content}</script>`); }
    else { html = html.replace('</body>', `<script>/* ${js.path} */\n${js.content}</script>\n</body>`); }
  }
  return html;
}

let msgIdCounter = 0;
function nextMsgId(): string { return `msg_${Date.now()}_${++msgIdCounter}`; }

// ── localStorage helpers ───────────────────────────────────────────

function storageKey(projectId: string): string { return `forjenta_ws_${projectId}`; }

function saveToStorage(state: WorkspaceState) {
  if (!state.projectId) return;
  const data = {
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
  };
  try { localStorage.setItem(storageKey(state.projectId), JSON.stringify(data)); } catch {}
}

function loadFromStorage(projectId: string): any | null {
  try {
    const raw = localStorage.getItem(storageKey(projectId));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// ── Build full AI context from workspace state ─────────────────────

function buildFullContext(state: WorkspaceState, newPrompt: string): string {
  const parts: string[] = [];

  // Original project goal
  if (state.activeProjectPrompt && state.activeProjectPrompt !== newPrompt) {
    parts.push(`Original project goal:\n${state.activeProjectPrompt}`);
  }

  // Previous conversation summary
  const convHistory = state.messages
    .filter(m => m.role === 'user' || (m.role === 'assistant' && !m.isError))
    .slice(-10)
    .map(m => `[${m.role}]: ${m.content.substring(0, 200)}`)
    .join('\n');
  if (convHistory) {
    parts.push(`Previous conversation:\n${convHistory}`);
  }

  // Current files
  if (state.files.length > 0) {
    const fileContext = state.files
      .map(f => `--- ${f.path} (${f.language}) ---\n${f.content}`)
      .join('\n\n');
    // Limit to ~12k chars to leave room for prompt
    parts.push(`Current project files:\n${fileContext.substring(0, 12000)}`);
  }

  return parts.join('\n\n');
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
  selectedModel: DEFAULT_PROVIDER,
  sessionStatus: 'idle',
  lastError: null,
  isAuthenticated: false,

  reset: () => set({
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
    sessionStatus: 'idle',
    lastError: null,
    isAuthenticated: false,
  }),

  saveSession: () => { saveToStorage(get()); },

  setSelectedModel: (model: ProviderConfig) => {
    set({ selectedModel: model });
    saveToStorage(get());
  },

  // ── Init Project: try API first, fall back to localStorage ───────
  initProject: async (id: string) => {
    set({ projectLoading: true, projectId: id, sessionStatus: 'loading' });

    // 1. Try restoring from localStorage (instant)
    const cached = loadFromStorage(id);
    if (cached && (cached.files?.length > 0 || cached.messages?.length > 0)) {
      const cachedFiles = cached.files || [];
      const tree = buildFileTree(cachedFiles);
      const preview = buildPreview(cachedFiles);
      set({
        projectName: cached.projectName || 'Untitled Project',
        activeProjectPrompt: cached.activeProjectPrompt || '',
        files: cachedFiles,
        fileTree: tree,
        openTabs: cached.openTabs || [],
        activeFile: cached.activeFile || null,
        messages: cached.messages || [],
        activeView: cached.activeView || 'code',
        selectedModel: cached.selectedModel || DEFAULT_PROVIDER,
        previewHtml: preview,
        terminalLines: cached.terminalLines || [],
      });
    }

    // 2. Try loading from backend API (may fail with 401)
    let authed = false;
    try {
      const response = await fetch(`${API_URL}/api/projects/${id}`, { credentials: 'include' });

      if (response.ok) {
        authed = true;
        const data = await response.json();
        const project = data.project;
        const files: ProjectFile[] = data.files || [];
        const prompts = data.prompts || [];

        // Build chat messages from prompt history
        const chatMessages: ChatMessage[] = [];
        for (const p of prompts) {
          chatMessages.push({ id: nextMsgId(), role: 'user', content: p.content, timestamp: new Date(p.created_at).getTime() });
          if (p.change_summary) {
            chatMessages.push({ id: nextMsgId(), role: 'assistant', content: p.change_summary, summary: p.change_summary, timestamp: new Date(p.completed_at || p.created_at).getTime(), files: [] });
          }
        }

        // Merge: prefer API data but keep local messages if API has fewer
        const existingMessages = get().messages;
        const mergedMessages = chatMessages.length >= existingMessages.length ? chatMessages : existingMessages;

        // Merge files: API is source of truth when available
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
          files: mergedFiles,
          fileTree: tree,
          openTabs,
          activeFile,
          messages: mergedMessages,
          previewHtml: preview,
          isAuthenticated: true,
          sessionStatus: 'ready',
        });

        get().addTerminalLine(`Loaded project "${project.name}" with ${mergedFiles.length} files`, 'success');
      } else if (response.status === 401) {
        get().addTerminalLine('Session not authenticated — working in local mode', 'info');
        set({ isAuthenticated: false, sessionStatus: 'ready' });
      } else {
        get().addTerminalLine(`Project load returned ${response.status}`, 'error');
        set({ sessionStatus: 'ready' });
      }
    } catch (error) {
      console.error('[Workspace] Load error:', error);
      get().addTerminalLine('Working offline — using cached data', 'info');
      set({ sessionStatus: 'ready' });
    }

    set({ projectLoading: false });
    saveToStorage(get());
  },

  selectFile: (path: string) => {
    const { openTabs } = get();
    const newTabs = openTabs.includes(path) ? openTabs : [...openTabs, path];
    set({ activeFile: path, openTabs: newTabs });
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

  getFileContent: (path: string) => {
    return get().files.find(f => f.path === path)?.content || '';
  },

  // ── Core Generation Flow (resilient to 401) ─────────────────────
  sendPrompt: async (text: string) => {
    const state = get();
    if (!state.projectId || !text.trim() || state.generating) return;

    // Save as active project prompt if first prompt
    const isFirstPrompt = state.messages.filter(m => m.role === 'user').length === 0;
    const activeProjectPrompt = isFirstPrompt ? text : state.activeProjectPrompt || text;

    // Add user message
    const userMsg: ChatMessage = { id: nextMsgId(), role: 'user', content: text, timestamp: Date.now() };
    set({
      messages: [...state.messages, userMsg],
      generating: true,
      generationProgress: 'Preparing...',
      sessionStatus: 'generating',
      lastError: null,
      activeProjectPrompt: activeProjectPrompt,
    });

    get().addTerminalLine(`> Prompt: "${text.substring(0, 80)}..."`, 'command');

    // Save immediately so user message persists even if generation is interrupted
    saveToStorage(get());

    let runId: string | null = null;
    let promptId: string | null = null;

    try {
      // ── Stage 1: Try registering prompt (may 401, that's OK) ─────
      get().addTerminalLine('[1/5] Registering prompt...', 'info');
      set({ generationProgress: 'Registering prompt...' });

      if (state.isAuthenticated) {
        try {
          const promptRes = await fetch(`${API_URL}/api/projects/${state.projectId}/prompts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ prompt: text, force_rebuild: false }),
          });

          if (promptRes.ok) {
            const promptData = await promptRes.json();
            runId = promptData.run.run_id;
            promptId = promptData.prompt.prompt_id;
            get().addTerminalLine('[1/5] Prompt registered', 'success');
          } else {
            get().addTerminalLine(`[1/5] Prompt registration skipped (${promptRes.status}) — continuing`, 'info');
            if (promptRes.status === 401) set({ isAuthenticated: false });
          }
        } catch {
          get().addTerminalLine('[1/5] Prompt registration skipped — continuing', 'info');
        }
      } else {
        get().addTerminalLine('[1/5] Not authenticated — skipping registration', 'info');
      }

      // ── Stage 2: Build context ───────────────────────────────────
      get().addTerminalLine('[2/5] Building context...', 'info');
      set({ generationProgress: 'Building context...' });
      const contextStr = buildFullContext(get(), text);

      // ── Stage 3: Call code generation (NO AUTH REQUIRED) ─────────
      get().addTerminalLine('[3/5] Generating code with AI...', 'info');
      set({ generationProgress: `Generating with ${get().selectedModel.modelLabel}...` });

      const genRes = await fetch(`${API_URL}/api/generate-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          categories: ['Web'],
          context: contextStr,
          mode: contextStr && state.files.length > 0 ? 'continuation' : 'full',
        }),
      });

      if (!genRes.ok) {
        const errorText = await genRes.text();
        let detail = `Generation request failed (${genRes.status})`;
        try { const parsed = JSON.parse(errorText); detail = parsed.error || parsed.detail || detail; } catch {}
        throw new Error(detail);
      }

      const genData = await genRes.json();
      if (!genData.success) {
        throw new Error(genData.error || 'AI generation returned failure');
      }

      const newFiles = genData.files || [];
      get().addTerminalLine(`[3/5] Generated ${newFiles.length} file(s)`, 'success');

      // ── Stage 4: Merge files into local state ────────────────────
      get().addTerminalLine('[4/5] Merging files...', 'info');
      set({ generationProgress: 'Updating workspace...' });

      const existingFiles = get().files;
      const mergedFiles: ProjectFile[] = [...existingFiles];

      for (const nf of newFiles) {
        const idx = mergedFiles.findIndex(f => f.path === nf.path);
        const pf: ProjectFile = {
          file_id: `local_${Date.now()}_${nf.path}`,
          path: nf.path,
          content: nf.content,
          language: nf.language || guessLanguage(nf.path),
          size_bytes: new Blob([nf.content]).size,
          line_count: nf.content.split('\n').length,
          version_number: idx >= 0 ? (mergedFiles[idx].version_number + 1) : 1,
          updated_at: new Date().toISOString(),
        };
        if (idx >= 0) { mergedFiles[idx] = pf; } else { mergedFiles.push(pf); }
      }

      // Try saving to backend (may 401, that's OK — we have local state)
      if (get().isAuthenticated && runId && promptId && newFiles.length > 0) {
        try {
          await fetch(`${API_URL}/api/projects/${state.projectId}/files`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ files: newFiles, run_id: runId, prompt_id: promptId, change_reason: text.substring(0, 100) }),
          });
          get().addTerminalLine('[4/5] Files saved to backend', 'success');
        } catch {
          get().addTerminalLine('[4/5] Backend save skipped — files stored locally', 'info');
        }
      } else {
        get().addTerminalLine('[4/5] Files stored locally', 'info');
      }

      // ── Stage 5: Update UI ───────────────────────────────────────
      get().addTerminalLine('[5/5] Updating UI...', 'info');
      set({ generationProgress: 'Finalizing...' });

      const fileChanges = newFiles.map((f: any) => ({
        path: f.path,
        action: (existingFiles.find(ef => ef.path === f.path) ? 'updated' : 'created') as 'created' | 'updated',
      }));

      const aiMsg: ChatMessage = {
        id: nextMsgId(),
        role: 'assistant',
        content: genData.summary || `Generated ${newFiles.length} file(s)`,
        summary: genData.summary,
        timestamp: Date.now(),
        files: fileChanges,
      };

      const tree = buildFileTree(mergedFiles);
      const preview = buildPreview(mergedFiles);

      const { openTabs } = get();
      const firstNewFile = newFiles[0]?.path;
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

      get().addTerminalLine('Generation complete!', 'success');
      saveToStorage(get());

      // Update generation run as complete (best-effort)
      if (get().isAuthenticated && runId && promptId) {
        fetch(`${API_URL}/api/projects/${state.projectId}/generations/${runId}`, {
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
        }).catch(() => {});
      }

    } catch (error: any) {
      console.error('[Workspace] Generation error:', error);

      const errorMessage = error.message || 'Unknown error';
      let friendlyMessage = errorMessage;

      if (errorMessage.includes('401') || errorMessage.toLowerCase().includes('unauthorized')) {
        friendlyMessage = 'AI provider authentication is missing or invalid. Check model API key configuration.';
      } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        friendlyMessage = 'Network error — check your connection and try again.';
      }

      get().addTerminalLine(`Error: ${errorMessage}`, 'error');

      const errMsg: ChatMessage = {
        id: nextMsgId(),
        role: 'assistant',
        content: friendlyMessage,
        timestamp: Date.now(),
        isError: true,
        retryPrompt: text,
      };

      set({
        messages: [...get().messages, errMsg],
        generating: false,
        generationProgress: '',
        sessionStatus: 'error',
        lastError: friendlyMessage,
      });

      saveToStorage(get());
    }
  },

  // ── Retry last failed prompt ─────────────────────────────────────
  retryLastPrompt: async () => {
    const { messages } = get();
    // Find the last error message with a retryPrompt
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].isError && messages[i].retryPrompt) {
        const prompt = messages[i].retryPrompt!;
        // Remove the error message
        set({ messages: messages.filter((_, idx) => idx !== i) });
        await get().sendPrompt(prompt);
        return;
      }
    }
    // If no error message found, retry the last user message
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        await get().sendPrompt(messages[i].content);
        return;
      }
    }
  },

  // ── Regenerate: re-run the last user prompt ──────────────────────
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
    if (view === 'app') {
      set({ previewHtml: buildPreview(get().files) });
    }
    saveToStorage(get());
  },

  addTerminalLine: (text: string, type: TerminalLine['type']) => {
    set(s => ({ terminalLines: [...s.terminalLines, { text, type, timestamp: Date.now() }] }));
  },

  buildPreviewHtml: () => {
    set({ previewHtml: buildPreview(get().files) });
  },
}));

function guessLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  return { html: 'html', htm: 'html', css: 'css', js: 'javascript', ts: 'typescript', jsx: 'javascript', tsx: 'typescript', json: 'json', md: 'markdown', py: 'python', svg: 'xml' }[ext] || 'text';
}
