/**
 * MobileAgentDock - Premium sticky bottom composer for mobile builder
 * 
 * Features:
 * - Status indicator bar when building
 * - Premium input field with glass styling
 * - Quick action shortcuts
 * - Large touch-friendly buttons
 * - Animated accent border when active
 * - Safe area aware
 */

import { useState, useRef, useEffect } from 'react';
import { 
  Send, Mic, Paperclip, Sparkles, Square, Loader2, 
  ChevronUp, X, Wand2, Plus, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

// Premium status configurations
const STATUS_CONFIG: Record<BuildStatus, { label: string; color: string; glow: string; pulse: boolean }> = {
  idle: { label: '', color: 'text-gray-500', glow: '', pulse: false },
  processing: { label: 'Processing...', color: 'text-violet-400', glow: 'shadow-violet-500/20', pulse: true },
  generating: { label: 'Generating code...', color: 'text-violet-400', glow: 'shadow-violet-500/20', pulse: true },
  validating: { label: 'Validating...', color: 'text-cyan-400', glow: 'shadow-cyan-500/20', pulse: true },
  repairing: { label: 'Repairing...', color: 'text-amber-400', glow: 'shadow-amber-500/20', pulse: true },
  preview_ready: { label: 'Preview ready', color: 'text-emerald-400', glow: 'shadow-emerald-500/20', pulse: false },
  paused: { label: 'Paused', color: 'text-gray-400', glow: '', pulse: false },
  failed: { label: 'Build failed', color: 'text-red-400', glow: 'shadow-red-500/20', pulse: false },
  complete: { label: 'Complete', color: 'text-emerald-400', glow: 'shadow-emerald-500/20', pulse: false },
};

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
  placeholder = "What would you like to build?",
  disabled = false,
}: MobileAgentDockProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 140) + 'px';
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
    { icon: Plus, label: 'Add feature', prompt: 'Add ' },
    { icon: Wand2, label: 'Improve UI', prompt: 'Improve the ' },
    { icon: Zap, label: 'Fix bug', prompt: 'Fix the issue with ' },
  ];

  const statusConfig = STATUS_CONFIG[status];
  const showStatus = status !== 'idle' && status !== 'complete';

  return (
    <div 
      className="sticky bottom-0 z-40"
      data-testid="mobile-agent-dock"
    >
      {/* Status banner - shown when actively building */}
      {showStatus && (
        <div className="relative overflow-hidden">
          {/* Animated gradient border */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/60 to-transparent" />
          
          <div className="flex items-center justify-center gap-3 px-4 py-3 bg-black/90 backdrop-blur-xl">
            {/* Animated status orb */}
            <span className="relative flex size-2.5">
              {statusConfig.pulse && (
                <span className={cn(
                  "absolute inset-0 rounded-full animate-ping opacity-60",
                  status === 'validating' ? 'bg-cyan-400' :
                  status === 'repairing' ? 'bg-amber-400' :
                  status === 'failed' ? 'bg-red-400' :
                  'bg-violet-400'
                )} />
              )}
              <span className={cn(
                "relative rounded-full size-2.5",
                status === 'validating' ? 'bg-cyan-500' :
                status === 'repairing' ? 'bg-amber-500' :
                status === 'failed' ? 'bg-red-500' :
                status === 'complete' || status === 'preview_ready' ? 'bg-emerald-500' :
                'bg-violet-500'
              )} />
            </span>
            
            <span className={cn(
              "text-[13px] font-medium tracking-wide",
              statusConfig.color
            )}>
              {statusMessage || statusConfig.label}
            </span>
          </div>
        </div>
      )}

      {/* Quick actions panel */}
      {showQuickActions && !isGenerating && (
        <div className="relative">
          <div className="absolute inset-x-0 top-0 h-px bg-white/[0.06]" />
          <div className="px-4 py-4 bg-zinc-950/98 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Quick Actions</span>
              <button
                onClick={() => setShowQuickActions(false)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex gap-2">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onChange(action.prompt);
                    setShowQuickActions(false);
                    textareaRef.current?.focus();
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[13px] font-medium text-gray-300 hover:bg-white/[0.08] hover:text-white active:scale-[0.98] transition-all"
                >
                  <action.icon className="size-4 text-violet-400" />
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main dock container */}
      <div className="relative">
        {/* Top border */}
        <div className="absolute inset-x-0 top-0 h-px bg-white/[0.08]" />
        
        {/* Background with blur */}
        <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" />
        
        {/* Content */}
        <div className="relative px-4 pt-4 pb-4 safe-area-bottom">
          {/* Input container with premium styling */}
          <div
            className={cn(
              "relative flex items-end gap-3 p-2 rounded-2xl border transition-all duration-300",
              isFocused || isGenerating
                ? "bg-zinc-900/90 border-violet-500/40 shadow-xl shadow-violet-500/10"
                : "bg-zinc-900/60 border-white/[0.08]"
            )}
          >
            {/* Animated border glow when focused */}
            {(isFocused || isGenerating) && (
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-violet-500/20 via-fuchsia-500/20 to-violet-500/20 blur-sm -z-10" />
            )}

            {/* Left actions */}
            <div className="flex items-center gap-1 shrink-0 pb-1">
              {onAttach && (
                <button
                  onClick={onAttach}
                  disabled={isGenerating}
                  className="flex items-center justify-center size-10 rounded-xl text-gray-500 hover:text-white hover:bg-white/[0.08] active:scale-95 disabled:opacity-40 transition-all"
                  aria-label="Attach file"
                >
                  <Paperclip className="size-5" />
                </button>
              )}
              
              <button
                onClick={() => setShowQuickActions(!showQuickActions)}
                disabled={isGenerating}
                className={cn(
                  "flex items-center justify-center size-10 rounded-xl transition-all active:scale-95",
                  showQuickActions
                    ? "bg-violet-500/20 text-violet-400"
                    : "text-gray-500 hover:text-white hover:bg-white/[0.08]",
                  isGenerating && "opacity-40"
                )}
                aria-label="Quick actions"
              >
                <Sparkles className="size-5" />
              </button>
            </div>

            {/* Input field */}
            <div className="flex-1 min-w-0 py-1">
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
                className={cn(
                  "w-full bg-transparent text-[15px] text-white placeholder-gray-600 outline-none resize-none py-1.5 px-1",
                  "max-h-[140px] scrollbar-thin leading-relaxed",
                  "disabled:opacity-50"
                )}
                data-testid="mobile-agent-input"
              />
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-1.5 shrink-0 pb-1">
              {onMic && !value.trim() && !isGenerating && (
                <button
                  onClick={onMic}
                  className="flex items-center justify-center size-10 rounded-xl text-gray-500 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all"
                  aria-label="Voice input"
                >
                  <Mic className="size-5" />
                </button>
              )}

              {/* Submit / Stop button */}
              {isGenerating ? (
                <button
                  onClick={onStop}
                  className="flex items-center justify-center size-11 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 active:scale-95 transition-all"
                  aria-label="Stop generation"
                  data-testid="mobile-stop-btn"
                >
                  <Square className="size-4 fill-current" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!value.trim() || disabled}
                  className={cn(
                    "flex items-center justify-center size-11 rounded-xl transition-all active:scale-95",
                    value.trim() && !disabled
                      ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40"
                      : "bg-white/[0.06] text-gray-600"
                  )}
                  aria-label="Send message"
                  data-testid="mobile-send-btn"
                >
                  <Send className="size-4" />
                </button>
              )}
            </div>
          </div>

          {/* Helper text */}
          <p className="text-[11px] text-gray-600 text-center mt-3 tracking-wide">
            {isGenerating 
              ? "Your agent is working on the project..."
              : "Describe changes or continue building"
            }
          </p>
        </div>
      </div>
    </div>
  );
}
