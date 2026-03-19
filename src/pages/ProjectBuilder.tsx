
import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileCode2,
  Play,
  Copy,
  Check,
  FolderOpen,
  Save,
  Download,
  GitBranch,
  Clock,
  Plus,
  Trash2,
  Send,
  X,
  Menu,
  Loader2,
  Sparkles,
  Terminal,
  Globe,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Eye,
  Code2,
  MessageSquare,
  Smartphone,
  Tablet,
  Monitor,
} from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { useToast } from '@/hooks/use-toast';
import { useGenerationPipeline } from '@/hooks/useGenerationPipeline';
import { debugAndRepair } from '@/lib/api';
import GenerationPanel from '@/components/features/builder/GenerationPanel';
import SafePreviewShell from '@/components/features/builder/SafePreviewShell';
import ErrorBoundary from '@/components/features/ErrorBoundary';
import MonacoEditor from '@/components/features/builder/MonacoEditor';
import PreviewConsole from '@/components/features/builder/PreviewConsole';
import type { ProjectFile } from '@/types';
import { renderPreviewHTML, buildPlaceholderHTML } from '@/lib/previewRenderer';
import CreditDisplay from '@/components/features/credits/CreditDisplay';
import CreditEstimate from '@/components/features/credits/CreditEstimate';
import InsufficientCreditsModal from '@/components/features/credits/InsufficientCreditsModal';
import { useCredits } from '@/hooks/useCredits';
import type { CreditCheckResult } from '@/types/credits';
import logoImg from '@/assets/logo.png';

// ─── Constants ─────────────────────────────────────────────────────

const langColors: Record<string, string> = {
  html: 'text-orange-400', css: 'text-blue-400', javascript: 'text-yellow-400',
  typescript: 'text-blue-300', python: 'text-green-400', markdown: 'text-gray-400',
  json: 'text-amber-300', text: 'text-gray-400',
};
const langLabels: Record<string, string> = {
  html: 'HTML', css: 'CSS', javascript: 'JavaScript', typescript: 'TypeScript',
  python: 'Python', markdown: 'Markdown', json: 'JSON', text: 'Text',
};
function langFromPath(p: string): string {
  const ext = p.split('.').pop()?.toLowerCase() || '';
  const m: Record<string, string> = { js:'javascript', jsx:'javascript', ts:'typescript', tsx:'typescript', html:'html', css:'css', json:'json', md:'markdown', py:'python' };
  return m[ext] || 'text';
}

// ─── Terminal Panel ────────────────────────────────────────────────

function TerminalPanel() {
  const { terminalLines, addTerminalLine, clearTerminal } = useProjectStore();
  const [input, setInput] = useState('');
  const termRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    termRef.current?.scrollTo(0, termRef.current.scrollHeight);
  }, [terminalLines]);

  const handleCommand = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input.trim()) {
      addTerminalLine(`$ ${input}`, 'command');
      const cmd = input.trim().toLowerCase();
      if (cmd === 'clear') clearTerminal();
      else if (cmd === 'help') addTerminalLine('Available: help, clear, version, status', 'output');
      else if (cmd === 'version') addTerminalLine('ForJenta IDE v2.0.0', 'success');
      else if (cmd === 'status') addTerminalLine('All systems operational', 'success');
      else addTerminalLine(`sh: command not found: ${input.trim().split(' ')[0]}`, 'error');
      setInput('');
    }
  };

  const colors: Record<string, string> = {
    info: 'text-gray-400', success: 'text-green-400', error: 'text-red-400',
    command: 'text-cyan-300', output: 'text-gray-300',
  };

  return (
    <div className="flex h-full flex-col bg-zinc-950 text-sm">
      <div className="flex items-center gap-1 border-b border-white/5 px-2">
        <button className="flex items-center gap-1 px-1 py-0.5 text-gray-500">
          <ChevronDown className="size-3" />
        </button>
        <button className="flex items-center gap-1.5 border-b-2 border-white px-3 py-2 text-xs font-medium text-white">
          <Terminal className="size-3" />Terminal
        </button>
        <button className="ml-1 rounded p-1 text-gray-500 hover:bg-white/5 hover:text-white">
          <Plus className="size-3" />
        </button>
      </div>
      <div ref={termRef} className="flex-1 overflow-auto p-3 font-mono text-xs leading-relaxed">
        {terminalLines.map((line) => (
          <div key={line.id} className={colors[line.type] || 'text-gray-400'}>{line.text}</div>
        ))}
      </div>
      <div className="flex items-center border-t border-white/5 px-3 py-2 font-mono text-xs">
        <span className="mr-2 text-green-400">$</span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleCommand}
          className="flex-1 bg-transparent text-gray-200 outline-none placeholder-gray-600"
          placeholder="Type a command..."
        />
      </div>
    </div>
  );
}

// ─── Main Builder ──────────────────────────────────────────────────

function ProjectBuilderInner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const project = useProjectStore((s) => s.getProject(id || ''));
  const updateFile = useProjectStore((s) => s.updateFile);
  const addFileToProject = useProjectStore((s) => s.addFile);
  const deleteFileFromProject = useProjectStore((s) => s.deleteFile);
  const addVersion = useProjectStore((s) => s.addVersion);
  const restoreVersion = useProjectStore((s) => s.restoreVersion);
  const addTerminalLine = useProjectStore((s) => s.addTerminalLine);
  const { toast } = useToast();

  // Generation pipeline
  const pipeline = useGenerationPipeline();

  const [activeFileIdx, setActiveFileIdx] = useState(0);
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showFiles, setShowFiles] = useState(true);
  const [showGenPanel, setShowGenPanel] = useState(true);
  const [showVersions, setShowVersions] = useState(false);
  const [mobileView, setMobileView] = useState<'code' | 'preview'>('code');
  const [previewKey, setPreviewKey] = useState(0);
  const [showTerminal, setShowTerminal] = useState(true);
  const [showConsole, setShowConsole] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [viewportSize, setViewportSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [terminalCollapsed, setTerminalCollapsed] = useState(false);
  const [insufficientCreditsModal, setInsufficientCreditsModal] = useState<CreditCheckResult | null>(null);
  const credits = useCredits();

  // Auto-preview: debounced refresh when files change
  const autoPreviewTimer = useRef<ReturnType<typeof setTimeout>>();
  const lastFileHash = useRef('');

  // ── Listen for "Fix with AI" postMessage from preview iframe ──
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'preview-fix-errors') {
        const payload = event.data.payload;
        if (!payload) return;
        const errorFile = payload.file || 'unknown file';
        const errorMsg = payload.error || 'Unknown error';
        const phase = payload.phase || 'preview';
        const line = payload.line ? ` at line ${payload.line}` : '';
        const excerpt = payload.excerpt ? `\nCode excerpt: ${payload.excerpt.substring(0, 200)}` : '';

        const repairPrompt = `Fix the preview error in ${errorFile}${line}. Phase: ${phase}. Error: ${errorMsg}${excerpt}\n\nPlease regenerate or repair the affected file(s) to resolve this error.`;

        setChatInput(repairPrompt);
        setShowGenPanel(true);
        addTerminalLine(`> Auto-repair requested for ${errorFile}`, 'command');

        // Send directly with the prompt — don't rely on setChatInput state update
        setTimeout(() => {
          handleSendRef.current?.(repairPrompt);
        }, 150);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [addTerminalLine]);

  // Compute file hash for change detection
  const computeFileHash = useCallback(() => {
    if (!project) return '';
    return project.files.map((f) => `${f.path}:${f.content.length}:${f.content.slice(-20)}`).join('|');
  }, [project]);

  // Watch for file changes and auto-refresh preview
  useEffect(() => {
    if (!showPreview || pipeline.isGenerating) return;
    const currentHash = computeFileHash();
    if (lastFileHash.current && lastFileHash.current !== currentHash) {
      if (autoPreviewTimer.current) clearTimeout(autoPreviewTimer.current);
      autoPreviewTimer.current = setTimeout(() => {
        setPreviewKey((k) => k + 1);
        addTerminalLine('> Preview auto-refreshed', 'info');
      }, 800);
    }
    lastFileHash.current = currentHash;
    return () => { if (autoPreviewTimer.current) clearTimeout(autoPreviewTimer.current); };
  }, [computeFileHash, showPreview, pipeline.isGenerating, addTerminalLine]);

  // Sync code when file changes
  useEffect(() => {
    if (project && project.files[activeFileIdx]) {
      setCode(project.files[activeFileIdx].content);
    }
  }, [activeFileIdx, project]);

  // ── Apply files helper ──
  const applyFiles = useCallback((files: { path: string; content: string; language: string }[]) => {
    let updatedCount = 0;
    let createdCount = 0;
    if (!project || files.length === 0) return { updatedCount, createdCount };

    const freshProject = useProjectStore.getState().getProject(project.id);
    if (!freshProject) return { updatedCount, createdCount };

    for (const newFile of files) {
      const existing = freshProject.files.find((f) => f.path === newFile.path);
      if (existing) {
        updateFile(freshProject.id, existing.id, newFile.content);
        addTerminalLine(`  Updated: ${newFile.path}`, 'info');
        updatedCount++;
      } else {
        const fileToAdd: ProjectFile = {
          id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          path: newFile.path,
          content: newFile.content,
          language: newFile.language || langFromPath(newFile.path),
        };
        addFileToProject(freshProject.id, fileToAdd);
        addTerminalLine(`  Created: ${newFile.path}`, 'success');
        createdCount++;
      }
    }
    return { updatedCount, createdCount };
  }, [project, updateFile, addFileToProject, addTerminalLine]);

  // ── Auto-generate from homepage prompt flow ──
  useEffect(() => {
    const raw = sessionStorage.getItem('forjenta_auto_generate');
    if (!raw || !project) return;

    let autoGen: { projectId: string; prompt: string; category: string };
    try {
      autoGen = JSON.parse(raw);
    } catch {
      sessionStorage.removeItem('forjenta_auto_generate');
      return;
    }

    if (autoGen.projectId !== id) return;
    sessionStorage.removeItem('forjenta_auto_generate');

    console.log('[AutoGenerate] Starting pipeline for:', autoGen.prompt);
    addTerminalLine(`> Auto-generating: "${autoGen.prompt.substring(0, 60)}..."`, 'command');
    setShowGenPanel(true);

    const existingPaths = project.files.map((f) => f.path);

    pipeline.generate(
      autoGen.prompt,
      [autoGen.category || 'Web'],
      undefined,
      existingPaths,
      applyFiles
    ).then((result) => {
      if (result?.success) {
        addTerminalLine(`> Build complete: ${result.files?.length || 0} file(s)`, 'success');
        toast({ title: 'App generated!', description: `${result.files?.length || 0} files created` });
        setShowPreview(true);
        setPreviewKey((k) => k + 1);
      } else {
        addTerminalLine(`> Build failed: ${result?.error || 'Unknown'}`, 'error');
      }
    });
  }, [id, project?.id, applyFiles, addTerminalLine, setShowGenPanel, pipeline, toast, setShowPreview, setPreviewKey]);

  // ── Handle file chip click → open in editor ──
  const handleFileChipClick = useCallback((filePath: string) => {
    if (!project) return;
    const idx = project.files.findIndex((f) => f.path === filePath || f.path.endsWith(filePath));
    if (idx >= 0) {
      setActiveFileIdx(idx);
      setShowPreview(false);
      addTerminalLine(`> Opened: ${filePath}`, 'info');
    } else {
      addTerminalLine(`> File not found: ${filePath}`, 'error');
    }
  }, [project, addTerminalLine]);

  // Ref for handleSend to allow preview-fix-errors listener to call it
  const handleSendRef = useRef<((overridePrompt?: string) => void) | null>(null);

  // ── Send chat message / trigger generation ──
  const handleSend = async (overridePrompt?: string) => {
    const prompt = (overridePrompt || chatInput).trim();
    if (!prompt || pipeline.isGenerating) return;
    setChatInput('');

    addTerminalLine(`> Request: "${prompt.substring(0, 60)}..."`, 'command');

    const context = project
      ? project.files.map((f) => `--- ${f.path} ---\n${f.content}`).join('\n\n')
      : '';
    const existingPaths = project?.files.map((f) => f.path) || [];

    const result = await pipeline.generate(
      prompt,
      project?.categories || ['Web'],
      context,
      existingPaths,
      applyFiles
    );

    if ((result as any)?.insufficientCredits) {
      setInsufficientCreditsModal((result as any).creditCheck);
      addTerminalLine('> Insufficient credits', 'error');
      return;
    }

    if (result?.success) {
      addTerminalLine(`> Build complete: ${result.files?.length || 0} file(s)`, 'success');
      toast({ title: 'Build complete!', description: `${result.files?.length || 0} files generated` });
      setShowPreview(true);
      setPreviewKey((k) => k + 1);
      credits.refresh();
    } else {
      addTerminalLine(`> Build failed: ${result?.error || 'Unknown'}`, 'error');
      credits.refresh();
    }
  };

  // Keep ref updated for preview-fix-errors listener
  handleSendRef.current = handleSend;

  // ── Debug & repair ──
  const handleDebugRepair = async () => {
    if (!project || pipeline.isGenerating) return;
    addTerminalLine('> Starting debug + repair...', 'command');

    const errorLogs = project.files.length === 0
      ? 'No files in project'
      : 'User requested debug analysis';
    const currentFiles = project.files.map((f) => ({ path: f.path, content: f.content }));

    try {
      const result = await debugAndRepair(errorLogs, currentFiles);
      if (result.success && result.files.length > 0) {
        const { updatedCount, createdCount } = applyFiles(result.files);
        const summary = [updatedCount > 0 ? `${updatedCount} repaired` : '', createdCount > 0 ? `${createdCount} added` : ''].filter(Boolean).join(', ');
        pipeline.addMessage('repair', { actions: result.files.map((f: any) => ({ id: f.path, filePath: f.path, issue: 'Auto-detected', action: 'Repaired', status: 'fixed', timestamp: new Date().toISOString() })), status: 'complete' });
        addTerminalLine(`> Repairs complete: ${summary}`, 'success');
        toast({ title: 'Repairs applied!', description: summary });
      } else {
        addTerminalLine('> No issues found', 'success');
        pipeline.addMessage('assistant', { label: result.explanation || 'No issues found.' });
      }
    } catch (err: any) {
      addTerminalLine(`> Debug error: ${err.message}`, 'error');
      pipeline.addMessage('error', { step: 'debug', error: err.message });
    }
  };

  const currentFile = project?.files[activeFileIdx];

  // ── File operations ──
  const handleSave = useCallback(() => {
    if (!project || !currentFile) return;
    setIsSaving(true);
    updateFile(project.id, currentFile.id, code);
    addTerminalLine(`  ✓ Saved: ${currentFile.path}`, 'success');
    toast({ title: 'Saved!', description: currentFile.path });
    setIsSaving(false);
  }, [project, currentFile, code, updateFile, addTerminalLine, toast]);

  const handleRun = () => {
    setPreviewKey((k) => k + 1);
    setShowPreview(true);
    addTerminalLine('> Preview refreshed', 'success');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast({ title: 'Copied!' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!project) return;
    project.files.forEach((file) => {
      const blob = new Blob([file.content], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = file.path;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
    toast({ title: 'Downloaded!', description: `${project.files.length} files` });
  };

  const handleSaveVersion = () => {
    if (!project) return;
    const msg = prompt('Version message:');
    if (!msg) return;
    addVersion(project.id, msg);
    toast({ title: 'Version saved!', description: msg });
  };

  const handleRestoreVersion = (versionId: string) => {
    if (!project) return;
    restoreVersion(project.id, versionId);
    setActiveFileIdx(0);
    setShowVersions(false);
    toast({ title: 'Version restored' });
  };

  const handleNewFile = () => {
    if (!project) return;
    const path = prompt('File path (e.g. components/Header.jsx):');
    if (!path) return;
    addFileToProject(project.id, { id: `f-${Date.now()}`, path, content: `// ${path}\n`, language: langFromPath(path) });
    toast({ title: 'File created', description: path });
  };

  const handleDeleteFile = (fileId: string, path: string) => {
    if (!project || !confirm(`Delete ${path}?`)) return;
    deleteFileFromProject(project.id, fileId);
    if (activeFileIdx >= project.files.length - 1) setActiveFileIdx(Math.max(0, activeFileIdx - 1));
    toast({ title: 'Deleted', description: path });
  };

  // ── Generate preview HTML ──
  const generatePreviewHTML = useCallback(() => {
    if (!project || project.files.length === 0) {
      return buildPlaceholderHTML('No files yet', 'Submit a prompt to start building your app.');
    }
    return renderPreviewHTML(project.files);
  }, [project]);

  // ── Not found ──
  if (!project) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4">
        <FolderOpen className="size-16 text-gray-600" />
        <h1 className="mt-6 font-display text-xl font-semibold text-white">Project not found</h1>
        <p className="mt-2 text-sm text-gray-400">This project may have been deleted.</p>
        <Link to="/workspace" className="mt-6 gradient-primary rounded-xl px-6 py-2.5 text-sm font-medium text-white">
          Back to Workspace
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-black">
      {/* ═══ TOP BAR ═══ */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/5 bg-zinc-950 px-3">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/workspace')} className="flex items-center text-gray-400 hover:text-white" aria-label="Back">
            <ArrowLeft className="size-4" />
          </button>
          <div className="flex items-center gap-1.5">
            <img src={logoImg} alt="ForJenta" className="size-8 rounded-lg object-contain" />
            <span className="font-display text-sm font-semibold text-white">{project.name}</span>
          </div>
          {pipeline.isGenerating && (
            <span className="flex items-center gap-1.5 rounded-full bg-violet-500/10 px-2.5 py-0.5 text-[10px] font-medium text-violet-400">
              <Loader2 className="size-3 animate-spin" />
              {pipeline.state.replace(/_/g, ' ')}
            </span>
          )}
        </div>

        {/* Credit display */}
        <div className="hidden md:flex items-center">
          <CreditDisplay />
        </div>

        {/* Center tabs */}
        <div className="hidden items-center gap-1 md:flex">
          <button
            onClick={() => setShowPreview(false)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${!showPreview ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
          >Code</button>
          <button
            onClick={() => { setShowPreview(true); setPreviewKey((k) => k + 1); }}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${showPreview ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
          >App</button>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1">
          <button onClick={() => setShowFiles(!showFiles)} className="rounded-md p-1.5 text-gray-400 hover:bg-white/5 hover:text-white md:hidden" aria-label="Files"><Menu className="size-4" /></button>
          <button onClick={handleSave} disabled={isSaving} className="hidden items-center gap-1.5 rounded-md bg-zinc-800 px-2.5 py-1.5 text-xs text-white hover:bg-zinc-700 md:flex">
            <Save className="size-3" />{isSaving ? 'Saving...' : 'Save'}
          </button>
          <button onClick={handleRun} className="hidden items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 md:flex">
            <Play className="size-3" />Run
          </button>
          <button onClick={() => setShowGenPanel(!showGenPanel)} className="flex items-center gap-1.5 rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 px-2.5 py-1.5 text-xs font-medium text-white hover:opacity-90">
            <MessageSquare className="size-3" /><span className="hidden md:inline">AI</span>
          </button>
          <button onClick={() => setShowVersions(!showVersions)} className="hidden items-center gap-1.5 rounded-md bg-zinc-800 px-2.5 py-1.5 text-xs text-white hover:bg-zinc-700 md:flex">
            <Clock className="size-3" /><span>History</span>
          </button>
          <button onClick={handleDownload} className="hidden items-center gap-1.5 rounded-md bg-zinc-800 px-2.5 py-1.5 text-xs text-white hover:bg-zinc-700 md:flex" aria-label="Download">
            <Download className="size-3" />
          </button>
        </div>
      </header>

      {/* ═══ MAIN BODY ═══ */}
      <div className="flex flex-1 overflow-hidden">
        {/* Generation Panel (left) */}
        {showGenPanel && (
          <div className="hidden w-[380px] shrink-0 md:block lg:w-[420px]">
            <GenerationPanel
              state={pipeline.state}
              steps={pipeline.steps}
              messages={pipeline.messages}
              fileCards={pipeline.fileCards}
              currentFileIndex={pipeline.currentFileIndex}
              chatInput={chatInput}
              setChatInput={setChatInput}
              isGenerating={pipeline.isGenerating}
              onSend={handleSend}
              onClose={() => setShowGenPanel(false)}
              onDebug={handleDebugRepair}
              onFileClick={handleFileChipClick}
            />
          </div>
        )}

        {/* Right panel */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-1 overflow-hidden">
            {/* File sidebar */}
            {showFiles && (
              <aside className="hidden w-52 shrink-0 flex-col overflow-y-auto border-r border-white/5 bg-zinc-950 p-3 md:flex">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-gray-500">Files</span>
                  <button onClick={handleNewFile} className="rounded p-1 text-gray-500 hover:bg-white/5 hover:text-white" aria-label="New file"><Plus className="size-3.5" /></button>
                </div>
                {project.files.map((file, idx) => (
                  <div key={file.id} className={`group flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${activeFileIdx === idx ? 'bg-white/5 text-white' : 'text-gray-400 hover:bg-white/[0.03] hover:text-gray-200'}`}>
                    <button onClick={() => setActiveFileIdx(idx)} className="flex items-center gap-2 truncate">
                      <FileCode2 className={`size-4 shrink-0 ${langColors[file.language] || 'text-gray-500'}`} />
                      <span className="truncate text-xs">{file.path}</span>
                    </button>
                    <button onClick={() => handleDeleteFile(file.id, file.path)} className="hidden rounded p-0.5 text-gray-600 hover:text-red-400 group-hover:block" aria-label={`Delete ${file.path}`}>
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                ))}
              </aside>
            )}

            {/* Code / Preview area */}
            <div className="flex flex-1 flex-col overflow-hidden">
              {showPreview ? (
                <>
                  {/* Preview nav */}
                  <div className="flex h-10 shrink-0 items-center gap-2 border-b border-white/5 bg-zinc-950 px-3">
                    <div className="flex items-center gap-1.5">
                      <button className="rounded p-1 text-gray-500 hover:bg-white/5 hover:text-white" aria-label="Back"><ArrowLeft className="size-3.5" /></button>
                      <button className="rounded p-1 text-gray-500 hover:bg-white/5 hover:text-white" aria-label="Forward"><ArrowLeft className="size-3.5 rotate-180" /></button>
                      <button onClick={() => setPreviewKey((k) => k + 1)} className="rounded p-1 text-gray-500 hover:bg-white/5 hover:text-white" aria-label="Refresh"><RotateCcw className="size-3.5" /></button>
                    </div>
                    <div className="flex flex-1 items-center gap-2 rounded-md bg-zinc-900 px-3 py-1.5">
                      <span className="text-xs text-gray-500">Preview</span>
                      {viewportSize !== 'desktop' && (
                        <span className="rounded bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-medium text-violet-400 tabular-nums">
                          {viewportSize === 'mobile' ? '375px' : '768px'}
                        </span>
                      )}
                      <span className="ml-auto flex items-center gap-1 text-[10px] text-gray-600">
                        <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Auto-refresh
                      </span>
                    </div>
                    {/* Device viewport toggles */}
                    <div className="flex items-center gap-0.5 rounded-lg bg-zinc-900 p-0.5">
                      <button
                        onClick={() => setViewportSize('mobile')}
                        className={`rounded-md p-1.5 transition-colors ${viewportSize === 'mobile' ? 'bg-violet-500/20 text-violet-400' : 'text-gray-500 hover:bg-white/5 hover:text-white'}`}
                        aria-label="Mobile view"
                        title="Mobile (375px)"
                      >
                        <Smartphone className="size-3.5" />
                      </button>
                      <button
                        onClick={() => setViewportSize('tablet')}
                        className={`rounded-md p-1.5 transition-colors ${viewportSize === 'tablet' ? 'bg-violet-500/20 text-violet-400' : 'text-gray-500 hover:bg-white/5 hover:text-white'}`}
                        aria-label="Tablet view"
                        title="Tablet (768px)"
                      >
                        <Tablet className="size-3.5" />
                      </button>
                      <button
                        onClick={() => setViewportSize('desktop')}
                        className={`rounded-md p-1.5 transition-colors ${viewportSize === 'desktop' ? 'bg-violet-500/20 text-violet-400' : 'text-gray-500 hover:bg-white/5 hover:text-white'}`}
                        aria-label="Desktop view"
                        title="Desktop (Full)"
                      >
                        <Monitor className="size-3.5" />
                      </button>
                    </div>
                    <button
                      onClick={() => setShowConsole(!showConsole)}
                      className={`rounded p-1 transition-colors hover:bg-white/5 ${showConsole ? 'text-violet-400' : 'text-gray-500 hover:text-white'}`}
                      aria-label="Toggle console"
                      title="Toggle console"
                    >
                      <Terminal className="size-3.5" />
                    </button>
                    <button className="rounded p-1 text-gray-500 hover:bg-white/5 hover:text-white" aria-label="Open"><Globe className="size-3.5" /></button>
                  </div>
                  {/* Safe preview: show SafePreviewShell during generation, iframe otherwise */}
                  {pipeline.isGenerating ? (
                    <SafePreviewShell
                      state={pipeline.state}
                      currentStep={pipeline.steps.find((s) => s.status === 'running')?.label}
                    />
                  ) : (
                    <div className="flex flex-1 flex-col overflow-hidden">
                      <div className={`flex-1 overflow-auto ${viewportSize !== 'desktop' ? 'bg-zinc-900/80 flex justify-center' : 'bg-zinc-900'}`}>
                        <div
                          className={`h-full bg-white transition-all duration-300 ease-out ${
                            viewportSize === 'mobile'
                              ? 'mx-auto my-4 rounded-[20px] shadow-2xl shadow-black/50 ring-1 ring-white/10 overflow-hidden'
                              : viewportSize === 'tablet'
                              ? 'mx-auto my-3 rounded-xl shadow-2xl shadow-black/40 ring-1 ring-white/10 overflow-hidden'
                              : ''
                          }`}
                          style={{
                            width: viewportSize === 'mobile' ? 375 : viewportSize === 'tablet' ? 768 : '100%',
                            maxWidth: '100%',
                            ...(viewportSize !== 'desktop' ? { height: 'calc(100% - 24px)' } : {}),
                          }}
                        >
                          <iframe
                            key={previewKey}
                            srcDoc={generatePreviewHTML()}
                            title="Preview"
                            className="h-full w-full bg-white"
                            sandbox="allow-scripts allow-same-origin"
                            style={viewportSize !== 'desktop' ? { borderRadius: 'inherit' } : undefined}
                          />
                        </div>
                      </div>
                      {/* Preview Console Panel */}
                      {showConsole && (
                        <PreviewConsole onClose={() => setShowConsole(false)} />
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Editor tab bar */}
                  {currentFile && (
                    <div className="flex h-9 shrink-0 items-center justify-between border-b border-white/5 bg-zinc-950 px-3">
                      <div className="flex items-center gap-2">
                        <FileCode2 className={`size-3.5 ${langColors[currentFile.language || 'text']}`} />
                        <span className="text-xs text-gray-300">{currentFile.path}</span>
                        <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-500">{langLabels[currentFile.language] || currentFile.language}</span>
                      </div>
                      <button onClick={handleCopy} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-400 hover:bg-white/5 hover:text-white" aria-label="Copy">
                        {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  )}
                  {/* Monaco Editor */}
                  <div className="flex-1 overflow-hidden">
                    {currentFile ? (
                      <MonacoEditor
                        value={code}
                        language={currentFile.language || 'text'}
                        onChange={(val) => setCode(val)}
                        onSave={handleSave}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-zinc-950">
                        <div className="text-center">
                          <FileCode2 className="mx-auto size-10 text-gray-600" />
                          <p className="mt-3 text-sm text-gray-500">No file selected</p>
                          <p className="mt-1 text-xs text-gray-600">Select a file from the sidebar or create a new one</p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Terminal — collapsible */}
          {showTerminal && (
            <div className="shrink-0 border-t border-white/5">
              {/* Collapse header */}
              <button
                onClick={() => setTerminalCollapsed(!terminalCollapsed)}
                className="flex w-full items-center justify-between px-3 py-1.5 bg-zinc-950 hover:bg-zinc-900/80 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <Terminal className="size-3 text-gray-500" />
                  <span className="text-[11px] font-medium text-gray-400">Terminal</span>
                </div>
                {terminalCollapsed ? (
                  <ChevronUp className="size-3 text-gray-600" />
                ) : (
                  <ChevronDown className="size-3 text-gray-600" />
                )}
              </button>
              {!terminalCollapsed && (
                <div style={{ height: 180 }}>
                  <TerminalPanel />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Version sidebar */}
      {showVersions && (
        <div className="fixed inset-y-0 right-0 z-50 w-80 border-l border-white/5 bg-zinc-950 shadow-2xl">
          <div className="flex h-12 items-center justify-between border-b border-white/5 px-4">
            <div className="flex items-center gap-2">
              <GitBranch className="size-4 text-violet-400" />
              <span className="text-sm font-medium text-white">History ({project.versions?.length || 0})</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleSaveVersion} className="gradient-primary rounded-md px-3 py-1 text-xs font-medium text-white">Save</button>
              <button onClick={() => setShowVersions(false)} className="rounded p-1 text-gray-500 hover:bg-white/5 hover:text-white"><X className="size-4" /></button>
            </div>
          </div>
          <div className="overflow-y-auto p-4">
            {(!project.versions || project.versions.length === 0) ? (
              <p className="text-center text-sm text-gray-500">No versions yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {[...project.versions].reverse().map((v) => (
                  <div key={v.id} className="rounded-xl border border-white/5 bg-zinc-900 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-white">v{v.versionNumber}</span>
                      <span className="text-[10px] text-gray-500">{new Date(v.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-400">{v.message}</p>
                    <button onClick={() => handleRestoreVersion(v.id)} className="mt-2 flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300">
                      <RotateCcw className="size-3" />Restore
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile nav */}
      <div className="flex h-14 items-center justify-around border-t border-white/5 bg-zinc-950 md:hidden">
        <button onClick={() => { setShowPreview(false); setMobileView('code'); }} className={`flex flex-col items-center gap-1 px-4 py-2 text-[10px] ${mobileView === 'code' ? 'text-violet-400' : 'text-gray-500'}`}>
          <Code2 className="size-5" />Code
        </button>
        <button onClick={() => { setShowPreview(true); setMobileView('preview'); setPreviewKey((k) => k + 1); }} className={`flex flex-col items-center gap-1 px-4 py-2 text-[10px] ${mobileView === 'preview' ? 'text-violet-400' : 'text-gray-500'}`}>
          <Eye className="size-5" />Preview
        </button>
        <button onClick={() => setShowGenPanel(!showGenPanel)} className="flex flex-col items-center gap-1 px-4 py-2 text-[10px] text-gray-500">
          <Sparkles className="size-5" />AI
        </button>
        <button onClick={handleSave} className="flex flex-col items-center gap-1 px-4 py-2 text-[10px] text-gray-500">
          <Save className="size-5" />Save
        </button>
      </div>

      {/* Insufficient Credits Modal */}
      {insufficientCreditsModal && (
        <InsufficientCreditsModal
          check={insufficientCreditsModal}
          actionLabel="AI generation"
          onClose={() => setInsufficientCreditsModal(null)}
        />
      )}

      {/* Mobile AI overlay */}
      {showGenPanel && (
        <div className="fixed inset-0 z-50 md:hidden">
          <GenerationPanel
            state={pipeline.state}
            steps={pipeline.steps}
            messages={pipeline.messages}
            fileCards={pipeline.fileCards}
            currentFileIndex={pipeline.currentFileIndex}
            chatInput={chatInput}
            setChatInput={setChatInput}
            isGenerating={pipeline.isGenerating}
            onSend={handleSend}
            onClose={() => setShowGenPanel(false)}
            onDebug={handleDebugRepair}
            onFileClick={handleFileChipClick}
          />
        </div>
      )}
    </div>
  );
}

// ─── Export with Error Boundary ────────────────────────────────────

export default function ProjectBuilder() {
  return (
    <ErrorBoundary>
      <ProjectBuilderInner />
    </ErrorBoundary>
  );
}
