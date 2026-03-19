/**
 * MobileAgentDock - Sticky bottom composer dock for mobile builder
 */

import { useState, useRef, useEffect } from 'react';
import { 
  Send, Mic, Paperclip, Settings, Square, Loader2, 
  Sparkles, ChevronUp, X 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import MobileBuildStatusPill from './MobileBuildStatusPill';

type BuildStatus = 'idle' | 'processing' | 'generating' | 'validating' | 'repairing' | 'preview_ready' | 'paused' | 'failed' | 'complete';

interface MobileAgentDockProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop?: () => void;
  onAttach?: () => void;
  onSettings?: () => void;
  onMic?: () => void;
  status: BuildStatus;
  statusMessage?: string;
  isGenerating: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export default function MobileAgentDock({
  value,
  onChange,
  onSubmit,
  onStop,
  onAttach,
  onSettings,
  onMic,
  status,
  statusMessage,
  isGenerating,
  placeholder = "Continue building...",
  disabled = false,
}: MobileAgentDockProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [value]);

  const handleSubmit = () => {
    if (value.trim() && !isGenerating && !disabled) {
      onSubmit();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const quickActions = [
    { label: 'Add a feature', prompt: 'Add ' },
    { label: 'Fix a bug', prompt: 'Fix ' },
    { label: 'Improve UI', prompt: 'Improve the ' },
    { label: 'Add dark mode', prompt: 'Add dark mode to the app' },
  ];

  return (
    <div className="sticky bottom-0 z-40 safe-area-bottom">
      {/* Status banner (shown when processing) */}
      {status !== 'idle' && status !== 'complete' && (
        <div className="flex items-center justify-center px-4 py-2 bg-black/80 backdrop-blur-xl border-t border-white/[0.06]">
          <MobileBuildStatusPill status={status} message={statusMessage} />
        </div>
      )}

      {/* Quick actions (expandable) */}
      {showQuickActions && !isGenerating && (
        <div className="px-4 py-3 bg-zinc-900/95 backdrop-blur-xl border-t border-white/[0.06]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 font-medium">Quick Actions</span>
            <button
              onClick={() => setShowQuickActions(false)}
              className="p-1 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.06]"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => {
                  onChange(action.prompt);
                  setShowQuickActions(false);
                  textareaRef.current?.focus();
                }}
                className="px-3 py-1.5 rounded-full bg-white/[0.06] text-xs text-gray-300 hover:bg-white/10 active:bg-white/[0.15] transition-colors"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main dock */}
      <div className="px-3 py-3 bg-black/95 backdrop-blur-xl border-t border-white/[0.08]">
        <div
          className={cn(
            "flex items-end gap-2 p-2 rounded-2xl border transition-all",
            isFocused
              ? "bg-zinc-900 border-violet-500/30 shadow-lg shadow-violet-500/10"
              : "bg-zinc-900/80 border-white/[0.08]"
          )}
        >
          {/* Left actions */}
          <div className="flex items-center gap-1 shrink-0 pb-1">
            {onAttach && (
              <button
                onClick={onAttach}
                disabled={isGenerating}
                className="flex items-center justify-center size-9 rounded-xl text-gray-500 hover:text-white hover:bg-white/[0.06] active:bg-white/10 disabled:opacity-50 transition-colors"
                aria-label="Attach file"
              >
                <Paperclip className="size-5" />
              </button>
            )}
            
            <button
              onClick={() => setShowQuickActions(!showQuickActions)}
              disabled={isGenerating}
              className={cn(
                "flex items-center justify-center size-9 rounded-xl transition-colors",
                showQuickActions
                  ? "bg-violet-500/20 text-violet-400"
                  : "text-gray-500 hover:text-white hover:bg-white/[0.06] active:bg-white/10"
              )}
              aria-label="Quick actions"
            >
              <Sparkles className="size-5" />
            </button>
          </div>

          {/* Input */}
          <div className="flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled || isGenerating}
              rows={1}
              className="w-full bg-transparent text-sm text-white placeholder-gray-600 outline-none resize-none py-2 px-1 max-h-[120px] scrollbar-thin disabled:opacity-50"
            />
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1 shrink-0 pb-1">
            {onMic && !value.trim() && !isGenerating && (
              <button
                onClick={onMic}
                className="flex items-center justify-center size-9 rounded-xl text-gray-500 hover:text-white hover:bg-white/[0.06] active:bg-white/10 transition-colors"
                aria-label="Voice input"
              >
                <Mic className="size-5" />
              </button>
            )}

            {/* Submit / Stop button */}
            {isGenerating ? (
              <button
                onClick={onStop}
                className="flex items-center justify-center size-10 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 active:bg-red-500/40 transition-colors"
                aria-label="Stop generation"
              >
                <Square className="size-4 fill-current" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!value.trim() || disabled}
                className={cn(
                  "flex items-center justify-center size-10 rounded-xl transition-all",
                  value.trim() && !disabled
                    ? "bg-violet-500 text-white hover:bg-violet-400 active:bg-violet-600 shadow-lg shadow-violet-500/25"
                    : "bg-white/[0.06] text-gray-600"
                )}
                aria-label="Send message"
              >
                <Send className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* Helper text */}
        <p className="text-[10px] text-gray-600 text-center mt-2 px-4">
          {isGenerating 
            ? "Agent is working on your project..."
            : "Prompts continue your project • Full rebuild only if requested"
          }
        </p>
      </div>
    </div>
  );
}
