import { useState, useRef, useEffect } from 'react';
import { Paperclip, Plus, Mic, ArrowUp } from 'lucide-react';

interface PromptComposerProps {
  onSubmit: (prompt: string) => void;
  initialValue?: string;
  disabled?: boolean;
}

export default function PromptComposer({ onSubmit, initialValue = '', disabled }: PromptComposerProps) {
  const [value, setValue] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (initialValue) setValue(initialValue);
  }, [initialValue]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, [value]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="relative rounded-2xl border border-white/[0.08] bg-zinc-900/80 shadow-2xl shadow-black/40 backdrop-blur-sm transition-all focus-within:border-violet-500/30 focus-within:shadow-violet-500/5 animate-glow-pulse">
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe what you want to build..."
          rows={3}
          disabled={disabled}
          className="w-full resize-none bg-transparent px-5 pt-5 pb-2 text-sm text-white outline-none placeholder-gray-500 disabled:opacity-50"
        />

        {/* Action bar */}
        <div className="flex items-center justify-between px-3 pb-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="flex size-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/5 hover:text-gray-300"
              aria-label="Attach file"
            >
              <Paperclip className="size-4" />
            </button>
            <button
              type="button"
              className="flex size-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/5 hover:text-gray-300"
              aria-label="Insert"
            >
              <Plus className="size-4" />
            </button>
            <button
              type="button"
              className="flex size-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/5 hover:text-gray-300"
              aria-label="Voice input"
            >
              <Mic className="size-4" />
            </button>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!value.trim() || disabled}
            className="flex size-9 items-center justify-center rounded-xl bg-white text-black transition-all hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-white"
            aria-label="Submit"
          >
            <ArrowUp className="size-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
