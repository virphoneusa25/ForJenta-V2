/**
 * ContinuationPromptComposer - Prompt input for continuing a project
 * Clearly indicates that prompts will continue the existing project.
 */

import { useState, useRef, useEffect } from 'react';
import { usePersistentProjectStore } from '@/stores/persistentProjectStore';
import { Send, Loader2, GitBranch, AlertCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContinuationPromptComposerProps {
  onSubmit: (prompt: string, forceRebuild: boolean) => void;
  isGenerating?: boolean;
  placeholder?: string;
}

export default function ContinuationPromptComposer({
  onSubmit,
  isGenerating = false,
  placeholder = "Continue building... (e.g., 'Add a contact form' or 'Fix the header layout')"
}: ContinuationPromptComposerProps) {
  const [prompt, setPrompt] = useState('');
  const [forceRebuild, setForceRebuild] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const currentProject = usePersistentProjectStore((s) => s.currentProject);
  const currentFiles = usePersistentProjectStore((s) => s.currentFiles);
  const lastClassification = usePersistentProjectStore((s) => s.lastClassification);
  
  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [prompt]);

  const handleSubmit = () => {
    if (!prompt.trim() || isGenerating) return;
    onSubmit(prompt.trim(), forceRebuild);
    setPrompt('');
    setForceRebuild(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!currentProject) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Context indicator */}
      <div className="flex items-center gap-2 px-1">
        <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
          <GitBranch className="size-3" />
          <span>Continuing:</span>
          <span className="font-medium text-gray-400">{currentProject.name}</span>
        </div>
        
        {currentFiles.length > 0 && (
          <div className="flex items-center gap-1 text-[10px] text-gray-600">
            <span className="text-gray-500">•</span>
            <span>{currentFiles.length} files</span>
          </div>
        )}
        
        {lastClassification && (
          <div className={cn(
            "ml-auto flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded",
            lastClassification.is_continuation 
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-amber-500/10 text-amber-400"
          )}>
            <Sparkles className="size-3" />
            {lastClassification.is_continuation ? 'Continuation' : 'Rebuild'}
          </div>
        )}
      </div>

      {/* Main input area */}
      <div className="relative flex items-end gap-2 rounded-xl border border-white/10 bg-zinc-900/50 p-2 focus-within:border-violet-500/50 transition-colors">
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isGenerating}
          className="flex-1 resize-none bg-transparent text-sm text-white placeholder-gray-600 outline-none min-h-[40px] max-h-[200px] scrollbar-thin"
          rows={1}
        />
        
        <button
          onClick={handleSubmit}
          disabled={!prompt.trim() || isGenerating}
          className={cn(
            "flex items-center justify-center size-8 rounded-lg transition-all",
            prompt.trim() && !isGenerating
              ? "bg-violet-500 hover:bg-violet-400 text-white"
              : "bg-white/5 text-gray-600"
          )}
        >
          {isGenerating ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </button>
      </div>

      {/* Options row */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          {/* Force rebuild toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={forceRebuild}
              onChange={(e) => setForceRebuild(e.target.checked)}
              className="size-3 rounded border-gray-600 bg-transparent text-violet-500 focus:ring-violet-500 focus:ring-offset-0"
            />
            <span className="text-[10px] text-gray-500 group-hover:text-gray-400 transition-colors">
              Force full rebuild
            </span>
          </label>
        </div>

        <div className="text-[10px] text-gray-600">
          <span className="text-gray-500">Shift+Enter</span> for new line
        </div>
      </div>

      {/* Rebuild warning */}
      {forceRebuild && (
        <div className="flex items-start gap-2 px-2 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertCircle className="size-3.5 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-[10px] text-amber-300/80">
            Full rebuild will regenerate all files from scratch. Your existing code structure will be replaced. 
            Use this only if you want to completely restart the project.
          </p>
        </div>
      )}

      {/* Continuation hint */}
      {!forceRebuild && currentFiles.length > 0 && (
        <p className="text-[10px] text-gray-600 px-1">
          Your prompt will modify the existing project. Only affected files will be updated.
        </p>
      )}
    </div>
  );
}
