/**
 * ForJenta IDE Workspace Store
 * Central state management for the entire IDE interface.
 *
 * GENERATION STATE MACHINE:
 *   idle → preparing → generating → applying_files → completed
 *                                                 → failed
 * Only one run at a time. Duplicate triggers are rejected.
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
  runId?: string;
}

export interface TerminalLine {
  text: string;
  type: 'info' | 'success' | 'error' | 'command';
  timestamp: number;
}

export type GenPhase = 'idle' | 'preparing' | 'generating' | 'applying_files' | 'completed' | 'failed';

// ── Module-level locks (outside React render cycle) ────────────────

let _initLock = false;            // prevents concurrent initProject
let _genLock = false;             // prevents concurrent sendPrompt
let _currentRunId: string | null = null;
let _providerCheckedForProject: string | null = null; // tracks which project we already checked provider for

function makeRunId(): string { return `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }
let _msgSeq = 0;
function nextMsgId(): string { return `msg_${Date.now()}_${++_msgSeq}`; }

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
  genPhase: GenPhase;
  currentRunId: string | null;

  terminalLines: TerminalLine[];
  terminalExpanded: boolean;

  activeView: 'code' | 'app';
  previewHtml: string | null;

  selectedModel: ModelConfig;
  providerAvailable: boolean | null;
  providerCheckedAt: number | null;

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
  for (const filePath of files.map(f => f.path).sort()) {
    const parts = filePath.split('/');
    const file = files.find(f => f.path === filePath)!;
    if (parts.length === 1) {
      root.push({ path: filePath, name: parts[0], type: 'file', language: file.language });
    } else {
      let cur = '', children = root;
      for (let i = 0; i < parts.length - 1; i++) {
        cur = cur ? `${cur}/${parts[i]}` : parts[i];
        let folder = folderMap.get(cur);
        if (!folder) { folder = { path: cur, name: parts[i], type: 'folder', children: [] }; folderMap.set(cur, folder); children.push(folder); }
        children = folder.children!;
      }
      children.push({ path: filePath, name: parts.at(-1)!, type: 'file', language: file.language });
    }
  }
  const sort = (ns: FileNode[]): FileNode[] => ns.sort((a, b) => a.type !== b.type ? (a.type === 'folder' ? -1 : 1) : a.name.localeCompare(b.name)).map(n => { if (n.children) n.children = sort(n.children); return n; });
  return sort(root);
}

function buildPreview(files: ProjectFile[]): string | null {
  const h = files.find(f => f.path === 'index.html');
  if (!h) return null;
  let html = h.content;
  for (const c of files.filter(f => f.path.endsWith('.css'))) {
    const rx = new RegExp(`<link[^>]*href=["']${c.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>`, 'gi');
    html = rx.test(html) ? html.replace(rx, `<style>${c.content}</style>`) : html.replace('</head>', `<style>\n${c.content}</style>\n</head>`);
  }
  for (const j of files.filter(f => f.path.endsWith('.js') && !f.path.includes('node_modules'))) {
    const rx = new RegExp(`<script[^>]*src=["']${j.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*></script>`, 'gi');
    html = rx.test(html) ? html.replace(rx, `<script>${j.content}</script>`) : html.replace('</body>', `<script>\n${j.content}</script>\n</body>`);
  }
  return html;
}

function storageKey(pid: string) { return `forjenta_ws_${pid}`; }

function saveToStorage(s: WorkspaceState) {
  if (!s.projectId) return;
  try {
    localStorage.setItem(storageKey(s.projectId), JSON.stringify({
      projectId: s.projectId, projectName: s.projectName,
      activeProjectPrompt: s.activeProjectPrompt,
      files: s.files, messages: s.messages,
      openTabs: s.openTabs, activeFile: s.activeFile,
      activeView: s.activeView, selectedModel: s.selectedModel,
      terminalLines: s.terminalLines.slice(-50),
    }));
  } catch {}
}

function loadFromStorage(pid: string): any | null {
  try { const r = localStorage.getItem(storageKey(pid)); return r ? JSON.parse(r) : null; } catch { return null; }
}

function guessLang(p: string): string {
  const e = p.split('.').pop()?.toLowerCase() || '';
  return ({ html: 'html', htm: 'html', css: 'css', js: 'javascript', ts: 'typescript', jsx: 'javascript', tsx: 'typescript', json: 'json', md: 'markdown', py: 'python', svg: 'xml' } as Record<string, string>)[e] || 'text';
}

// ── Store ──────────────────────────────────────────────────────────

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  projectId: null, projectName: '', projectLoading: false, activeProjectPrompt: '',
  files: [], fileTree: [], openTabs: [], activeFile: null, dirtyFiles: new Set(),
  messages: [], generating: false, generationProgress: '', genPhase: 'idle' as GenPhase, currentRunId: null,
  terminalLines: [], terminalExpanded: false,
  activeView: 'code' as const, previewHtml: null,
  selectedModel: DEFAULT_MODEL, providerAvailable: null, providerCheckedAt: null,
  sessionStatus: 'idle' as const, lastError: null, isAuthenticated: false,

  reset: () => {
    _initLock = false;
    _genLock = false;
    _currentRunId = null;
    _providerCheckedForProject = null;
    set({
      projectId: null, projectName: '', projectLoading: false, activeProjectPrompt: '',
      files: [], fileTree: [], openTabs: [], activeFile: null, dirtyFiles: new Set(),
      messages: [], generating: false, generationProgress: '', genPhase: 'idle', currentRunId: null,
      terminalLines: [], terminalExpanded: false, activeView: 'code', previewHtml: null,
      sessionStatus: 'idle', lastError: null, isAuthenticated: false,
      providerAvailable: null, providerCheckedAt: null,
    });
  },

  saveSession: () => saveToStorage(get()),
  setSelectedModel: (m: ModelConfig) => { _providerCheckedForProject = null; set({ selectedModel: m }); saveToStorage(get()); },

  // ── Init Project (guarded: runs once per id) ─────────────────────
  initProject: async (id: string) => {
    // Module-level lock: prevent concurrent/duplicate init
    if (_initLock) {
      console.log('[Workspace] initProject blocked — already running');
      return;
    }
    _initLock = true;

    set({ projectLoading: true, projectId: id, sessionStatus: 'loading' });

    // 1. Restore from localStorage (instant, no side effects)
    const cached = loadFromStorage(id);
    if (cached && (cached.files?.length > 0 || cached.messages?.length > 0)) {
      const cf = cached.files || [];
      set({
        projectName: cached.projectName || 'Untitled Project',
        activeProjectPrompt: cached.activeProjectPrompt || '',
        files: cf, fileTree: buildFileTree(cf),
        openTabs: cached.openTabs || [], activeFile: cached.activeFile || null,
        messages: cached.messages || [], activeView: cached.activeView || 'code',
        selectedModel: cached.selectedModel || DEFAULT_MODEL,
        previewHtml: buildPreview(cf),
        // Do NOT restore terminalLines — start fresh each session to avoid repeated log confusion
      });
    }

    // 2. Check provider status ONCE per project (cached)
    if (_providerCheckedForProject !== id) {
      _providerCheckedForProject = id;
      try {
        const status = await checkProviderStatus();
        set({ providerAvailable: status.available, providerCheckedAt: Date.now() });
        if (status.available) {
          get().addTerminalLine(`Inworld AI provider: available (model: ${status.modelId})`, 'success');
        } else {
          get().addTerminalLine(`Inworld AI provider: unavailable — ${status.message || status.error}`, 'error');
        }
      } catch {
        get().addTerminalLine('Could not verify provider status', 'info');
      }
    }

    // 3. Try loading from backend API
    // Guard: don't overwrite state if generation is already active
    const currentPhase = get().genPhase;
    const genActive = currentPhase === 'preparing' || currentPhase === 'generating' || currentPhase === 'applying_files';

    try {
      const res = await fetch(`${API_URL}/api/projects/${id}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const project = data.project;
        const files: ProjectFile[] = data.files || [];
        const prompts = data.prompts || [];

        // If generation is already running, only update metadata, skip file/message overwrite
        if (genActive) {
          set({
            projectName: project.name || get().projectName || 'Untitled Project',
            isAuthenticated: true, sessionStatus: 'ready',
          });
          get().addTerminalLine(`Project "${project.name}" loaded (generation in progress, skipping file overwrite)`, 'info');
        } else {
          const chatMsgs: ChatMessage[] = [];
          for (const p of prompts) {
            chatMsgs.push({ id: nextMsgId(), role: 'user', content: p.content, timestamp: new Date(p.created_at).getTime() });
            if (p.change_summary) chatMsgs.push({ id: nextMsgId(), role: 'assistant', content: p.change_summary, summary: p.change_summary, timestamp: new Date(p.completed_at || p.created_at).getTime(), files: [] });
          }
          const eMsgs = get().messages;
          const mMsgs = chatMsgs.length >= eMsgs.length ? chatMsgs : eMsgs;
          const mFiles = files.length > 0 ? files : get().files;
          const tree = buildFileTree(mFiles);
          const firstPrompt = prompts[0]?.content || get().activeProjectPrompt || '';
          const idx = mFiles.find(f => f.path === 'index.html') || mFiles[0];
          const eTabs = get().openTabs;
          set({
            projectName: project.name || get().projectName || 'Untitled Project',
            activeProjectPrompt: firstPrompt,
            files: mFiles, fileTree: tree,
            openTabs: eTabs.length > 0 ? eTabs : (idx ? [idx.path] : []),
            activeFile: get().activeFile || idx?.path || null,
            messages: mMsgs, previewHtml: buildPreview(mFiles),
            isAuthenticated: true, sessionStatus: 'ready',
          });
          get().addTerminalLine(`Loaded project "${project.name}" with ${mFiles.length} files`, 'success');
        }
      } else if (res.status === 401) {
        get().addTerminalLine('User session not found — provider mode active', 'info');
        set({ isAuthenticated: false, sessionStatus: 'ready' });
      } else {
        get().addTerminalLine(`Project API returned ${res.status}`, 'error');
        set({ sessionStatus: 'ready' });
      }
    } catch {
      get().addTerminalLine('Backend unreachable — using cached session', 'info');
      set({ sessionStatus: 'ready' });
    }

    set({ projectLoading: false });
    saveToStorage(get());
    _initLock = false;
  },

  selectFile: (p: string) => {
    const { openTabs } = get();
    set({ activeFile: p, openTabs: openTabs.includes(p) ? openTabs : [...openTabs, p] });
    saveToStorage(get());
  },

  closeTab: (p: string) => {
    const { openTabs, activeFile } = get();
    const nt = openTabs.filter(t => t !== p);
    let na = activeFile;
    if (activeFile === p) { const i = openTabs.indexOf(p); na = nt[Math.min(i, nt.length - 1)] || null; }
    set({ openTabs: nt, activeFile: na });
    saveToStorage(get());
  },

  updateFileContent: (p: string, c: string) => {
    const { files, dirtyFiles } = get();
    const nd = new Set(dirtyFiles); nd.add(p);
    set({ files: files.map(f => f.path === p ? { ...f, content: c } : f), dirtyFiles: nd });
  },

  getFileContent: (p: string) => get().files.find(f => f.path === p)?.content || '',

  // ── Send Prompt (strict single-run, module-level lock) ───────────
  sendPrompt: async (text: string) => {
    // ── Guard 1: module-level lock (survives re-renders) ───────────
    if (_genLock) {
      console.log('[Workspace] Duplicate generation trigger blocked');
      return;
    }

    // ── Guard 2: store-level check ─────────────────────────────────
    const state = get();
    if (!state.projectId || !text.trim()) return;
    if (state.generating || state.genPhase === 'preparing' || state.genPhase === 'generating' || state.genPhase === 'applying_files') {
      console.log('[Workspace] Duplicate generation trigger blocked (state machine)');
      return;
    }

    // ── Acquire lock ───────────────────────────────────────────────
    _genLock = true;
    const runId = makeRunId();
    _currentRunId = runId;

    const isFirstPrompt = state.messages.filter(m => m.role === 'user').length === 0;
    const activeProjectPrompt = isFirstPrompt ? text : state.activeProjectPrompt || text;

    const userMsg: ChatMessage = { id: nextMsgId(), role: 'user', content: text, timestamp: Date.now(), runId };

    // ── Phase: preparing ───────────────────────────────────────────
    set({
      messages: [...state.messages, userMsg],
      generating: true,
      generationProgress: 'Preparing...',
      genPhase: 'preparing',
      currentRunId: runId,
      sessionStatus: 'generating',
      lastError: null,
      activeProjectPrompt,
    });

    get().addTerminalLine(`Run created: ${runId}`, 'info');
    get().addTerminalLine(`$> Prompt: "${text.substring(0, 80)}"`, 'command');
    saveToStorage(get());

    // Prompt registration (best-effort, does not block)
    if (state.isAuthenticated) {
      try {
        await fetch(`${API_URL}/api/projects/${state.projectId}/prompts`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ prompt: text, force_rebuild: false }),
        });
      } catch {}
    }

    // ── Phase: generating ──────────────────────────────────────────
    // Bail if a different run took over (shouldn't happen, but safety)
    if (_currentRunId !== runId) { _genLock = false; return; }

    set({ genPhase: 'generating' });

    const input = {
      projectId: state.projectId,
      rootPrompt: activeProjectPrompt,
      followUpPrompt: isFirstPrompt ? undefined : text,
      fileTree: state.files.map(f => ({ path: f.path, content: f.content, language: f.language })),
      openFiles: state.openTabs,
      buildHistory: state.messages.filter(m => m.role === 'user').map(m => m.content),
    };

    const onLog: LogCallback = (t, ty) => {
      // Only log if this run is still current
      if (_currentRunId !== runId) return;
      get().addTerminalLine(t, ty);
      if (ty !== 'error') set({ generationProgress: t });
    };

    const result = await runGeneration(input, onLog);

    // Bail if a different run took over
    if (_currentRunId !== runId) { _genLock = false; return; }

    if (!result.success) {
      set({
        messages: [...get().messages, {
          id: nextMsgId(), role: 'assistant', content: result.error || 'Generation failed.',
          timestamp: Date.now(), isError: true, retryPrompt: text, errorCode: result.errorCode, runId,
        }],
        generating: false, generationProgress: '', genPhase: 'failed', sessionStatus: 'error', lastError: result.error || null,
      });
      get().addTerminalLine(`Run ${runId}: FAILED — ${result.error}`, 'error');
      saveToStorage(get());
      _genLock = false;
      return;
    }

    // ── Phase: applying_files ──────────────────────────────────────
    set({ genPhase: 'applying_files', generationProgress: 'Updating workspace...' });
    get().addTerminalLine(`Run ${runId}: applying ${result.files.length} files`, 'info');

    const existing = get().files;
    const merged: ProjectFile[] = [...existing];
    for (const nf of result.files) {
      const i = merged.findIndex(f => f.path === nf.path);
      const pf: ProjectFile = {
        file_id: `gen_${Date.now()}_${nf.path}`, path: nf.path, content: nf.content,
        language: nf.language || guessLang(nf.path),
        size_bytes: new Blob([nf.content]).size, line_count: nf.content.split('\n').length,
        version_number: i >= 0 ? (merged[i].version_number + 1) : 1, updated_at: new Date().toISOString(),
      };
      if (i >= 0) merged[i] = pf; else merged.push(pf);
    }

    // Backend file save (best-effort)
    if (state.isAuthenticated && result.files.length > 0) {
      try {
        await fetch(`${API_URL}/api/projects/${state.projectId}/files`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ files: result.files, run_id: null, prompt_id: null, change_reason: text.substring(0, 100) }),
        });
      } catch {}
    }

    const changes = result.files.map(f => ({
      path: f.path,
      action: (existing.find(ef => ef.path === f.path) ? 'updated' : 'created') as 'created' | 'updated',
    }));

    const aiMsg: ChatMessage = {
      id: nextMsgId(), role: 'assistant',
      content: result.summary || `Generated ${result.files.length} files`,
      summary: result.summary, timestamp: Date.now(), files: changes, runId,
    };

    const tree = buildFileTree(merged);
    const firstNew = result.files[0]?.path;
    const { openTabs } = get();
    const newTabs = firstNew && !openTabs.includes(firstNew) ? [...openTabs, firstNew] : openTabs;

    // ── Phase: completed ───────────────────────────────────────────
    set({
      files: merged, fileTree: tree, previewHtml: buildPreview(merged),
      messages: [...get().messages, aiMsg],
      generating: false, generationProgress: '', genPhase: 'completed',
      openTabs: newTabs, activeFile: firstNew || get().activeFile,
      dirtyFiles: new Set(), sessionStatus: 'ready', lastError: null,
    });

    get().addTerminalLine(`Run ${runId}: completed`, 'success');
    saveToStorage(get());
    _genLock = false;
  },

  retryLastPrompt: async () => {
    if (_genLock) return;
    const { messages } = get();
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].isError && messages[i].retryPrompt) {
        const prompt = messages[i].retryPrompt!;
        set({ messages: messages.filter((_, idx) => idx !== i), genPhase: 'idle' });
        await get().sendPrompt(prompt);
        return;
      }
    }
  },

  regenerate: async () => {
    if (_genLock) return;
    const { messages } = get();
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        set({ genPhase: 'idle' });
        await get().sendPrompt(messages[i].content);
        return;
      }
    }
  },

  toggleTerminal: () => set(s => ({ terminalExpanded: !s.terminalExpanded })),

  setActiveView: (v: 'code' | 'app') => {
    set({ activeView: v });
    if (v === 'app') set({ previewHtml: buildPreview(get().files) });
    saveToStorage(get());
  },

  addTerminalLine: (text: string, type: TerminalLine['type']) => {
    set(s => ({ terminalLines: [...s.terminalLines, { text, type, timestamp: Date.now() }] }));
  },

  buildPreviewHtml: () => set({ previewHtml: buildPreview(get().files) }),
}));
