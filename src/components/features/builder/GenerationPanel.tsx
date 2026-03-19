import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Sparkles,
  Send,
  X,
  ChevronDown,
  ChevronRight,
  Loader2,
  FileCode2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Copy,
  Check,
  Bot,
  ArrowRight,
  Wand2,
  Layers,
  AlertTriangle,
  Bug,
  Settings,
  Target,
  Cpu,
  Palette,
  Rocket,
  FileText,
  FolderTree,
  Eye,
  LayoutDashboard,
  Lightbulb,
  Link2,
  CheckCircle2,
  Zap,
  Paperclip,
  Image as ImageIcon,
} from 'lucide-react';
import StreamedFileCard from '@/components/features/builder/StreamedFileCard';
import ValidationCard from '@/components/features/builder/ValidationCard';
import RepairCard from '@/components/features/builder/RepairCard';
import SummaryCard from '@/components/features/builder/SummaryCard';
import type { BuildMessage, BuildStep, GeneratedFileCard, GenerationState, FileActionChip, StepSubDetail } from '@/types/generation';
import CreditEstimate from '@/components/features/credits/CreditEstimate';
import { useCredits } from '@/hooks/useCredits';
import { Wrench as WrenchIcon } from 'lucide-react';

interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  file: File;
}

interface GenerationPanelProps {
  state: GenerationState;
  steps: BuildStep[];
  messages: BuildMessage[];
  fileCards: GeneratedFileCard[];
  currentFileIndex: number;
  chatInput: string;
  setChatInput: (v: string) => void;
  isGenerating: boolean;
  onSend: () => void;
  onClose: () => void;
  onDebug: () => void;
  onFileClick?: (filePath: string) => void;
  // Prompt history for conversation continuity
  promptHistory?: Array<{
    prompt_id: string;
    content: string;
    prompt_type: string;
    created_at: string;
  }>;
}

// ─── Typing animation component ────────────────────────────────────

const TYPING_SPEED = 12;
const TYPING_BATCH = 3;

function TypingText({
  text,
  animate,
  onComplete,
}: {
  text: string;
  animate: boolean;
  onComplete?: () => void;
}) {
  const [displayLength, setDisplayLength] = useState(animate ? 0 : text.length);
  const completeRef = useRef(!animate);

  useEffect(() => {
    if (!animate || completeRef.current) {
      setDisplayLength(text.length);
      return;
    }
    if (displayLength >= text.length) {
      completeRef.current = true;
      onComplete?.();
      return;
    }
    const timer = setTimeout(() => {
      setDisplayLength((prev) => Math.min(prev + TYPING_BATCH, text.length));
    }, TYPING_SPEED);
    return () => clearTimeout(timer);
  }, [displayLength, text, animate, onComplete]);

  const visible = text.slice(0, displayLength);
  const isTyping = displayLength < text.length && animate;

  const renderText = (t: string) => {
    const parts = t.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <span key={i} className="font-semibold text-white">{part.slice(2, -2)}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <span>
      {renderText(visible)}
      {isTyping && (
        <span className="inline-block w-[2px] h-[14px] bg-violet-400 animate-pulse ml-0.5 align-text-bottom rounded-full" />
      )}
    </span>
  );
}

// ─── File action chip component ────────────────────────────────────

const ACTION_STYLES: Record<string, { icon: typeof FileCode2; bg: string; text: string }> = {
  created:   { icon: Plus,       bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  edited:    { icon: FileCode2,  bg: 'bg-blue-500/10',    text: 'text-blue-400' },
  updated:   { icon: RefreshCw,  bg: 'bg-blue-500/10',    text: 'text-blue-400' },
  repaired:  { icon: WrenchIcon, bg: 'bg-amber-500/10',   text: 'text-amber-400' },
  validated: { icon: ShieldCheck, bg: 'bg-cyan-500/10',   text: 'text-cyan-400' },
  deleted:   { icon: X,          bg: 'bg-red-500/10',     text: 'text-red-400' },
};

function FileActionChipComponent({ chip, onClick }: { chip: FileActionChip; onClick?: (path: string) => void }) {
  const style = ACTION_STYLES[chip.action] || ACTION_STYLES.created;
  const Icon = style.icon;
  const fileName = chip.path.split('/').pop() || chip.path;
  const isClickable = !!onClick;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) onClick(chip.path);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium ${style.bg} ${style.text} transition-all ${isClickable ? 'cursor-pointer hover:brightness-125 hover:ring-1 hover:ring-current/20 active:scale-[0.97]' : 'cursor-default hover:opacity-80'}`}
      title={isClickable ? `Open ${chip.path} in editor` : chip.path}
    >
      <Icon className="size-2.5 shrink-0" />
      <span className="capitalize mr-0.5">{chip.action}</span>
      <span className="font-mono opacity-80 truncate max-w-[140px]">{fileName}</span>
    </button>
  );
}

// ─── Expandable sub-details ────────────────────────────────────────

function ExpandableSubDetails({ details }: { details: StepSubDetail[] }) {
  const [expanded, setExpanded] = useState(false);
  if (!details || details.length === 0) return null;

  const preview = details.slice(0, 3);
  const rest = details.slice(3);

  return (
    <div className="mt-2 rounded-lg bg-black/20 border border-white/[0.04] overflow-hidden">
      {preview.map((d, i) => (
        <div key={i} className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.02] last:border-0">
          <span className="text-[10px] text-gray-500 truncate">{d.label}</span>
          <span className={`text-[10px] font-medium tabular-nums shrink-0 ml-2 ${
            d.status === 'ok' ? 'text-emerald-400' : d.status === 'warn' ? 'text-amber-400' : d.status === 'error' ? 'text-red-400' : 'text-gray-300'
          }`}>{d.value}</span>
        </div>
      ))}
      {rest.length > 0 && expanded && rest.map((d, i) => (
        <div key={i + 3} className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.02] last:border-0">
          <span className="text-[10px] text-gray-500 truncate">{d.label}</span>
          <span className={`text-[10px] font-medium tabular-nums shrink-0 ml-2 ${
            d.status === 'ok' ? 'text-emerald-400' : d.status === 'warn' ? 'text-amber-400' : d.status === 'error' ? 'text-red-400' : 'text-gray-300'
          }`}>{d.value}</span>
        </div>
      ))}
      {rest.length > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-3 py-1 text-[10px] text-gray-600 hover:text-gray-400 transition-colors text-center"
        >
          {expanded ? 'Show less' : `+${rest.length} more`}
        </button>
      )}
    </div>
  );
}

// ─── Quick action suggestion buttons ───────────────────────────────

function QuickActionButtons({
  actions,
  onAction,
}: {
  actions: string[];
  onAction: (action: string) => void;
}) {
  if (!actions || actions.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-white/[0.04]">
      <div className="flex items-center gap-1.5 mb-2">
        <Wand2 className="size-3 text-violet-400" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Quick Actions</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={() => onAction(action)}
            className="group flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-zinc-800/80 px-3 py-1.5 text-[11px] text-gray-400 transition-all hover:border-violet-500/20 hover:bg-violet-500/[0.06] hover:text-violet-300 hover:shadow-sm hover:shadow-violet-500/5 active:scale-[0.98]"
          >
            <ArrowRight className="size-3 opacity-0 -ml-1 transition-all group-hover:opacity-100 group-hover:ml-0 text-violet-400" />
            {action}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Working indicator ─────────────────────────────────────────────

function WorkingIndicator() {
  return (
    <div className="flex items-center gap-2 py-1">
      <div className="flex size-5 items-center justify-center">
        <svg viewBox="0 0 16 16" className="size-4 text-violet-400">
          <polygon points="3,1 13,8 3,15" fill="currentColor" />
        </svg>
      </div>
      <span className="text-[13px] text-gray-400">Working...</span>
    </div>
  );
}

// ─── Conversational assistant update card ──────────────────────────

function AssistantUpdateCard({
  msg,
  shouldAnimate,
  onQuickAction,
  isLastComplete,
  onFileClick,
}: {
  msg: BuildMessage;
  shouldAnimate: boolean;
  onQuickAction?: (action: string) => void;
  isLastComplete: boolean;
  onFileClick?: (path: string) => void;
}) {
  const { text, status, fileActions, subDetails, expandable } = msg.data;
  const [showFiles, setShowFiles] = useState(false);
  const [typingDone, setTypingDone] = useState(!shouldAnimate);
  const hasFiles = fileActions && fileActions.length > 0;
  const hasSubs = subDetails && subDetails.length > 0;

  const showQuickActions = isLastComplete && status === 'complete' && typingDone;

  return (
    <div className="flex flex-col gap-1">
      {/* Conversational text */}
      <p className="text-[13px] leading-relaxed text-gray-300">
        <TypingText
          text={text}
          animate={shouldAnimate}
          onComplete={() => setTypingDone(true)}
        />
      </p>

      {/* Expandable sub-details */}
      {hasSubs && expandable && typingDone && <ExpandableSubDetails details={subDetails} />}

      {/* File action chips */}
      {hasFiles && typingDone && (
        <div className={`mt-1 transition-opacity duration-300 ${typingDone ? 'opacity-100' : 'opacity-0'}`}>
          {fileActions.length <= 4 ? (
            <div className="flex flex-wrap gap-1">
              {fileActions.map((chip: FileActionChip, i: number) => (
                <FileActionChipComponent key={i} chip={chip} onClick={onFileClick} />
              ))}
            </div>
          ) : (
            <>
              <button
                onClick={() => setShowFiles(!showFiles)}
                className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showFiles ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                <span>{fileActions.length} files touched</span>
              </button>
              {showFiles && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {fileActions.map((chip: FileActionChip, i: number) => (
                    <FileActionChipComponent key={i} chip={chip} onClick={onFileClick} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Quick actions on final completion */}
      {showQuickActions && onQuickAction && (
        <QuickActionButtons
          actions={[
            'Add dark mode toggle',
            'Improve mobile responsiveness',
            'Add user authentication',
            'Enhance the styling and animations',
          ]}
          onAction={onQuickAction}
        />
      )}
    </div>
  );
}

// ─── Collapsible file section ──────────────────────────────────────

function FileCardsSection({
  fileCards,
  currentFileIndex,
  isGenerating,
}: {
  fileCards: GeneratedFileCard[];
  currentFileIndex: number;
  isGenerating: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const completedCount = fileCards.filter(
    (c) => c.status === 'complete' || c.status === 'updated' || c.status === 'repaired'
  ).length;
  const streamingCard = fileCards.find(
    (c) => c.status === 'generating' || c.status === 'streaming'
  );

  const groups = {
    boot: fileCards.filter((c) => c.group === 'boot'),
    page: fileCards.filter((c) => c.group === 'page'),
    component: fileCards.filter((c) => c.group === 'component'),
    hook: fileCards.filter((c) => c.group === 'hook'),
    lib: fileCards.filter((c) => c.group === 'lib' || c.group === 'type'),
    other: fileCards.filter((c) => c.group === 'style' || c.group === 'config' || c.group === 'doc'),
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 px-1 py-1 rounded-lg transition-colors hover:bg-white/[0.02]"
      >
        <div className="flex size-5 items-center justify-center">
          {collapsed ? <ChevronRight className="size-3.5 text-gray-500" /> : <ChevronDown className="size-3.5 text-gray-500" />}
        </div>
        <Layers className="size-3.5 text-violet-400" />
        <span className="text-xs font-medium text-gray-400">Generated Files</span>
        <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-400 tabular-nums">
          {completedCount}/{fileCards.length}
        </span>
        {streamingCard && (
          <span className="flex items-center gap-1 text-[10px] text-violet-300 ml-auto">
            <span className="size-1.5 rounded-full bg-violet-400 animate-pulse" />
            {streamingCard.path.split('/').pop()}
          </span>
        )}
      </button>

      {!collapsed && (
        <div className="flex flex-col gap-3 pl-1">
          {Object.entries(groups).map(([groupName, groupCards]) => {
            if (groupCards.length === 0) return null;
            const groupLabels: Record<string, string> = {
              boot: 'Boot Files',
              page: 'Pages',
              component: 'Components',
              hook: 'Hooks & Stores',
              lib: 'Utilities & Types',
              other: 'Styles & Config',
            };
            return (
              <div key={groupName}>
                <div className="flex items-center gap-2 mb-1.5 px-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-600">
                    {groupLabels[groupName] || groupName}
                  </span>
                  <span className="text-[10px] text-gray-700">{groupCards.length}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {groupCards.map((card) => (
                    <StreamedFileCard
                      key={card.id}
                      card={card}
                      isActive={fileCards.indexOf(card) === currentFileIndex || card.status === 'generating' || card.status === 'streaming'}
                      defaultExpanded={card.status === 'generating' || card.status === 'streaming'}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Requirements card ─────────────────────────────────────────────

function RequirementsCard({ data }: { data: any }) {
  return (
    <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.03] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Target className="size-4 text-blue-400" />
        <h4 className="text-xs font-semibold text-blue-300">Requirements Extracted</h4>
      </div>
      <div className="flex flex-col gap-2">
        {data.appType && (
          <div className="flex items-center gap-2 rounded-lg bg-black/20 px-3 py-2">
            <Cpu className="size-3 text-gray-500" />
            <span className="text-[11px] text-gray-400">Type</span>
            <span className="ml-auto text-[11px] font-medium text-blue-300">{data.appType}</span>
          </div>
        )}
        {data.features && data.features.length > 0 && (
          <div className="rounded-lg bg-black/20 px-3 py-2">
            <div className="flex items-center gap-2 mb-1.5">
              <Rocket className="size-3 text-gray-500" />
              <span className="text-[11px] text-gray-400">Features</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {data.features.slice(0, 8).map((f: string, i: number) => (
                <span key={i} className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] text-blue-400">{f}</span>
              ))}
            </div>
          </div>
        )}
        {data.pages && data.pages.length > 0 && (
          <div className="rounded-lg bg-black/20 px-3 py-2">
            <div className="flex items-center gap-2 mb-1.5">
              <FileText className="size-3 text-gray-500" />
              <span className="text-[11px] text-gray-400">Pages</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {data.pages.slice(0, 6).map((p: any, i: number) => (
                <span key={i} className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] text-indigo-400">
                  {typeof p === 'string' ? p : p.name}
                </span>
              ))}
            </div>
          </div>
        )}
        {data.designDNA && (
          <div className="flex items-center gap-2 rounded-lg bg-black/20 px-3 py-2">
            <Palette className="size-3 text-gray-500" />
            <span className="text-[11px] text-gray-400">Design</span>
            <span className="ml-auto text-[11px] text-gray-300">{data.designDNA.theme} · {data.designDNA.style}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Message card renderer ─────────────────────────────────────────

function MessageCard({
  msg,
  shouldAnimate,
  onQuickAction,
  isLastCompleteUpdate,
  onFileClick,
}: {
  msg: BuildMessage;
  shouldAnimate: boolean;
  onQuickAction?: (action: string) => void;
  isLastCompleteUpdate: boolean;
  onFileClick?: (path: string) => void;
}) {
  if (msg.type === 'assistant_update') {
    return (
      <AssistantUpdateCard
        msg={msg}
        shouldAnimate={shouldAnimate}
        onQuickAction={onQuickAction}
        isLastComplete={isLastCompleteUpdate}
        onFileClick={onFileClick}
      />
    );
  }

  if (msg.type === 'user_prompt') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl bg-gradient-to-br from-violet-600 to-violet-700 px-4 py-3 text-sm text-white shadow-lg shadow-violet-500/10">
          <p className="whitespace-pre-wrap">{msg.data.prompt}</p>
          {msg.data.categories && (
            <div className="mt-2 flex gap-1.5">
              {msg.data.categories.map((c: string) => (
                <span key={c} className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] backdrop-blur-sm">{c}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (msg.type === 'requirements') return <RequirementsCard data={msg.data} />;
  if (msg.type === 'validation') return <ValidationCard result={msg.data} />;
  if (msg.type === 'repair') return <RepairCard actions={msg.data.actions || []} />;
  if (msg.type === 'summary') return <SummaryCard summary={msg.data} />;

  if (msg.type === 'error') {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/[0.03] p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
            <AlertTriangle className="size-4 text-red-400" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-red-300">Generation Failed</h4>
            <p className="mt-1 text-[11px] text-red-400/80">{msg.data.error}</p>
            {msg.data.step && <p className="mt-1 text-[10px] text-gray-500">Failed at: {msg.data.step}</p>}
            {msg.data.suggestion && (
              <p className="mt-2 text-[11px] text-gray-400 bg-red-500/5 rounded-lg px-3 py-2">{msg.data.suggestion}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (msg.type === 'manifest') {
    const files = msg.data.files || [];
    const groups: Record<string, any[]> = {};
    for (const f of files) {
      const g = f.group || 'other';
      if (!groups[g]) groups[g] = [];
      groups[g].push(f);
    }
    return (
      <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/[0.03] p-4">
        <div className="flex items-center gap-2 mb-3">
          <FolderTree className="size-4 text-indigo-400" />
          <h4 className="text-xs font-semibold text-indigo-300">File Manifest</h4>
          <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-400 tabular-nums">
            {msg.data.totalCount || files.length} files
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {Object.entries(groups).map(([group, groupFiles]) => (
            <div key={group}>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-600 mb-1 block">{group}</span>
              <div className="flex flex-col gap-0.5">
                {groupFiles.slice(0, 10).map((f: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg bg-black/20 px-3 py-1.5">
                    <FileText className="size-3 text-gray-500 shrink-0" />
                    <span className="text-[11px] text-gray-300 truncate font-mono">{f.path}</span>
                    <span className="ml-auto text-[10px] text-gray-600 truncate max-w-[100px]">{f.purpose}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (msg.type === 'file_generation') return null;

  if (msg.type === 'architecture') {
    return (
      <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.03] p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10">
            <LayoutDashboard className="size-4 text-cyan-400" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-cyan-300">Architecture Designed</h4>
            {msg.data.projectName && (
              <p className="mt-1 text-[11px] text-gray-400">Project: <span className="text-gray-300 font-medium">{msg.data.projectName}</span></p>
            )}
            {msg.data.explanation && (
              <p className="mt-1 text-[11px] text-gray-400 line-clamp-2">{msg.data.explanation}</p>
            )}
            <p className="mt-1 text-[10px] text-gray-500">{msg.data.fileCount} files planned</p>
            {msg.data.fileGroups && (
              <div className="mt-2 flex flex-wrap gap-1">
                {Object.entries(msg.data.fileGroups).map(([group, files]: [string, any]) => (
                  <span key={group} className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-400">
                    {group}: {Array.isArray(files) ? files.length : 0}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (msg.type === 'preview_status') {
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10">
            <Eye className="size-4 text-emerald-400" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-emerald-300">Preview Ready</h4>
            <p className="mt-0.5 text-[11px] text-gray-400">Your app is live. Click "App" in the toolbar to view it.</p>
          </div>
          <span className="ml-auto flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </span>
        </div>
      </div>
    );
  }

  // Fallback for unknown types
  return null;
}

// ─── Main panel ────────────────────────────────────────────────────

export default function GenerationPanel({
  state,
  steps,
  messages,
  fileCards,
  currentFileIndex,
  chatInput,
  setChatInput,
  isGenerating,
  onSend,
  onClose,
  onDebug,
  onFileClick,
  promptHistory = [],
}: GenerationPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { balance } = useCredits();
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  // Track which messages have already been animated
  const animatedMsgIds = useRef(new Set<string>());
  
  // Combine messages with prompt history for display
  // Convert prompt history to BuildMessage format and merge
  const allMessages = React.useMemo(() => {
    // Convert prompt history to message format
    const historyMessages: BuildMessage[] = promptHistory.map((p) => ({
      id: `history-${p.prompt_id}`,
      type: 'user_prompt' as const,
      timestamp: p.created_at,
      data: {
        prompt: p.content,
        categories: [p.prompt_type],
      },
    }));
    
    // Merge and dedupe (avoid showing same prompt twice)
    const seenPrompts = new Set<string>();
    const combined: BuildMessage[] = [];
    
    // Add history first (older)
    for (const msg of historyMessages) {
      const key = msg.data?.prompt?.trim();
      if (key && !seenPrompts.has(key)) {
        seenPrompts.add(key);
        combined.push(msg);
      }
    }
    
    // Add current messages
    for (const msg of messages) {
      if (msg.type === 'user_prompt') {
        const key = msg.data?.prompt?.trim();
        if (key && seenPrompts.has(key)) continue; // Skip duplicate
        if (key) seenPrompts.add(key);
      }
      combined.push(msg);
    }
    
    // Sort by timestamp
    return combined.sort((a, b) => 
      new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime()
    );
  }, [messages, promptHistory]);
  
  // Determine if we have any conversation history
  const hasHistory = allMessages.length > 0 || promptHistory.length > 0;

  // Always auto-scroll to the bottom when content changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, fileCards, currentFileIndex, isGenerating]);

  // Attachment handlers
  const handleAttachFiles = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newAttachments: Attachment[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 5 * 1024 * 1024) continue; // Skip files > 5MB
      newAttachments.push({
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: file.name,
        type: file.type,
        size: file.size,
        url: URL.createObjectURL(file),
        file,
      });
    }
    setAttachments((prev) => [...prev, ...newAttachments].slice(0, 5)); // Max 5 attachments
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const removed = prev.find((a) => a.id === id);
      if (removed) URL.revokeObjectURL(removed.url);
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  // Quick action handler
  const handleQuickAction = useCallback((action: string) => {
    setChatInput(action);
    setTimeout(() => {
      onSend();
    }, 50);
  }, [setChatInput, onSend]);

  // Find the last complete assistant_update for quick action placement
  const lastCompleteUpdateId = (() => {
    for (let i = allMessages.length - 1; i >= 0; i--) {
      if (allMessages[i].type === 'assistant_update' && allMessages[i].data?.status === 'complete') {
        return allMessages[i].id;
      }
    }
    return null;
  })();

  // Split messages around file_generation marker
  const fileGenIdx = allMessages.findIndex((m) => m.type === 'file_generation');
  const beforeFileGen = fileGenIdx >= 0 ? allMessages.slice(0, fileGenIdx) : allMessages;
  const afterFileGen = fileGenIdx >= 0 ? allMessages.slice(fileGenIdx + 1) : [];

  // Determine which messages should be animated
  const shouldAnimateMsg = (msg: BuildMessage): boolean => {
    if (msg.type !== 'assistant_update') return false;
    if (animatedMsgIds.current.has(msg.id)) return false;
    animatedMsgIds.current.add(msg.id);
    return true;
  };

  const renderMessage = (msg: BuildMessage) => {
    const animate = shouldAnimateMsg(msg);
    const isLastComplete = !isGenerating && msg.id === lastCompleteUpdateId;
    return (
      <MessageCard
        key={msg.id}
        msg={msg}
        shouldAnimate={animate}
        onQuickAction={!isGenerating ? handleQuickAction : undefined}
        isLastCompleteUpdate={isLastComplete}
        onFileClick={onFileClick}
      />
    );
  };

  return (
    <div className="flex h-full flex-col border-r border-white/5 bg-zinc-950">
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/5 px-4">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500">
            <Sparkles className="size-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-white">AI Builder</span>
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-white/5 hover:text-white" aria-label="Close">
          <X className="size-4" />
        </button>
      </div>

      {/* Scrollable content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        <div className="flex flex-col gap-4">
          {/* Messages before file gen */}
          {beforeFileGen.map(renderMessage)}

          {/* File cards section */}
          {fileCards.length > 0 && (
            <FileCardsSection fileCards={fileCards} currentFileIndex={currentFileIndex} isGenerating={isGenerating} />
          )}

          {/* Messages after file gen */}
          {afterFileGen.map(renderMessage)}

          {/* Working indicator when generating */}
          {isGenerating && (
            <WorkingIndicator />
          )}

          {/* Idle state - only show if NO history and NO messages */}
          {state === 'idle' && !hasHistory && (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20">
                <Sparkles className="size-6 text-violet-400" />
              </div>
              <h3 className="text-sm font-semibold text-white">Describe your web app...</h3>
              <p className="mt-2 text-xs text-gray-500 max-w-[260px] mx-auto leading-relaxed">
                Tell me what you want to build and I'll generate the complete project for you.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-white/5 p-3">
        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="group relative flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-zinc-800/80 px-2 py-1.5 transition-colors hover:border-white/[0.12]"
              >
                {att.type.startsWith('image/') ? (
                  <img
                    src={att.url}
                    alt={att.name}
                    className="size-8 rounded-md object-cover ring-1 ring-white/10"
                  />
                ) : (
                  <div className="flex size-8 items-center justify-center rounded-md bg-violet-500/10">
                    <Paperclip className="size-3.5 text-violet-400" />
                  </div>
                )}
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-medium text-gray-300 truncate max-w-[100px]">{att.name}</span>
                  <span className="text-[9px] text-gray-600">{(att.size / 1024).toFixed(0)}KB</span>
                </div>
                <button
                  onClick={() => removeAttachment(att.id)}
                  className="ml-0.5 rounded-full p-0.5 text-gray-600 transition-colors hover:bg-red-500/10 hover:text-red-400"
                  aria-label={`Remove ${att.name}`}
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 transition-colors focus-within:border-violet-500/30 focus-within:ring-1 focus-within:ring-violet-500/10">
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && onSend()}
            placeholder={isGenerating ? 'Generation in progress...' : 'Describe your web app...'}
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder-gray-500"
            disabled={isGenerating}
          />
          <button
            onClick={onSend}
            disabled={isGenerating || !chatInput.trim()}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white transition-all hover:bg-violet-500 disabled:opacity-30 disabled:bg-zinc-700"
            aria-label="Send"
          >
            {isGenerating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </button>
        </div>
        {!isGenerating && chatInput.trim() && (
          <div className="mt-2 px-1">
            <CreditEstimate cost={5} balance={balance} label="App generation" />
          </div>
        )}
        <div className="mt-2 flex items-center gap-2 px-1">
          {/* Attachment upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.txt,.md,.json,.csv"
            multiple
            onChange={handleAttachFiles}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isGenerating || attachments.length >= 5}
            className="flex items-center gap-1 rounded-md bg-zinc-800 px-2 py-1 text-[10px] text-gray-400 transition-colors hover:bg-zinc-700 hover:text-white disabled:opacity-40"
            title={attachments.length >= 5 ? 'Max 5 attachments' : 'Attach reference files (images, docs)'}
          >
            <Paperclip className="size-3" />
            Attach
            {attachments.length > 0 && (
              <span className="rounded-full bg-violet-500/20 px-1 text-[9px] font-medium text-violet-400">{attachments.length}</span>
            )}
          </button>
          <button
            onClick={onDebug}
            disabled={isGenerating}
            className="flex items-center gap-1 rounded-md bg-zinc-800 px-2 py-1 text-[10px] text-amber-400 transition-colors hover:bg-zinc-700 disabled:opacity-40"
          >
            <Bug className="size-3" />
            Debug
          </button>
        </div>
      </div>
    </div>
  );
}
