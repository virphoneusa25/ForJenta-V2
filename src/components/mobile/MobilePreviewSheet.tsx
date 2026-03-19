/**
 * MobilePreviewSheet - Full-screen preview overlay for mobile
 */

import { useState } from 'react';
import {
  X, RotateCcw, Smartphone, Tablet, Monitor, 
  ExternalLink, Terminal, ChevronDown, ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ViewportSize = 'mobile' | 'tablet' | 'desktop';

interface MobilePreviewSheetProps {
  isOpen: boolean;
  onClose: () => void;
  previewHtml: string;
  onRefresh?: () => void;
  projectType?: {
    label: string;
    color: string;
    icon: string;
  };
  showConsole?: boolean;
  consoleLogs?: Array<{ type: string; message: string; timestamp: string }>;
}

export default function MobilePreviewSheet({
  isOpen,
  onClose,
  previewHtml,
  onRefresh,
  projectType,
  showConsole = false,
  consoleLogs = [],
}: MobilePreviewSheetProps) {
  const [viewportSize, setViewportSize] = useState<ViewportSize>('mobile');
  const [showConsolePanel, setShowConsolePanel] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  if (!isOpen) return null;

  const handleRefresh = () => {
    setPreviewKey((k) => k + 1);
    onRefresh?.();
  };

  const viewportWidths: Record<ViewportSize, number | string> = {
    mobile: 375,
    tablet: 768,
    desktop: '100%',
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between h-14 px-3 border-b border-white/10 bg-zinc-950 shrink-0 safe-area-top">
        {/* Left: Close */}
        <button
          onClick={onClose}
          className="flex items-center justify-center size-10 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close preview"
        >
          <X className="size-5" />
        </button>

        {/* Center: Title + type badge */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">Preview</span>
          {projectType && (
            <span className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium border",
              projectType.color
            )}>
              <span>{projectType.icon}</span>
              <span>{projectType.label}</span>
            </span>
          )}
        </div>

        {/* Right: Refresh */}
        <button
          onClick={handleRefresh}
          className="flex items-center justify-center size-10 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Refresh preview"
        >
          <RotateCcw className="size-5" />
        </button>
      </header>

      {/* Viewport size toggles */}
      <div className="flex items-center justify-center gap-1 py-2 bg-zinc-900 border-b border-white/[0.06] shrink-0">
        <button
          onClick={() => setViewportSize('mobile')}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
            viewportSize === 'mobile'
              ? "bg-violet-500/20 text-violet-400"
              : "text-gray-500 hover:text-white hover:bg-white/[0.06]"
          )}
        >
          <Smartphone className="size-3.5" />
          <span>Mobile</span>
        </button>
        <button
          onClick={() => setViewportSize('tablet')}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
            viewportSize === 'tablet'
              ? "bg-violet-500/20 text-violet-400"
              : "text-gray-500 hover:text-white hover:bg-white/[0.06]"
          )}
        >
          <Tablet className="size-3.5" />
          <span>Tablet</span>
        </button>
        <button
          onClick={() => setViewportSize('desktop')}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
            viewportSize === 'desktop'
              ? "bg-violet-500/20 text-violet-400"
              : "text-gray-500 hover:text-white hover:bg-white/[0.06]"
          )}
        >
          <Monitor className="size-3.5" />
          <span>Desktop</span>
        </button>
      </div>

      {/* Preview iframe area */}
      <div className="flex-1 overflow-hidden bg-zinc-900/50">
        <div className="h-full flex items-start justify-center overflow-auto p-4">
          <div
            className={cn(
              "bg-white h-full transition-all duration-300",
              viewportSize === 'mobile' && "rounded-[20px] shadow-2xl shadow-black/50 ring-1 ring-white/10",
              viewportSize === 'tablet' && "rounded-xl shadow-2xl shadow-black/40 ring-1 ring-white/10",
              viewportSize === 'desktop' && "w-full rounded-lg shadow-xl"
            )}
            style={{
              width: viewportWidths[viewportSize],
              maxWidth: '100%',
              minHeight: viewportSize !== 'desktop' ? '600px' : '100%',
            }}
          >
            <iframe
              key={previewKey}
              srcDoc={previewHtml}
              title="Preview"
              className="w-full h-full bg-white"
              sandbox="allow-scripts allow-same-origin"
              style={{
                borderRadius: viewportSize === 'mobile' ? '20px' : viewportSize === 'tablet' ? '12px' : '8px',
              }}
            />
          </div>
        </div>
      </div>

      {/* Console toggle */}
      {showConsole && (
        <button
          onClick={() => setShowConsolePanel(!showConsolePanel)}
          className="flex items-center justify-center gap-2 py-3 bg-zinc-900 border-t border-white/[0.06] text-gray-400 hover:text-white transition-colors"
        >
          <Terminal className="size-4" />
          <span className="text-xs font-medium">Console</span>
          {showConsolePanel ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronUp className="size-4" />
          )}
          {consoleLogs.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-violet-500/20 text-[10px] text-violet-400 font-medium">
              {consoleLogs.length}
            </span>
          )}
        </button>
      )}

      {/* Console panel */}
      {showConsolePanel && showConsole && (
        <div className="h-48 bg-zinc-950 border-t border-white/[0.06] overflow-y-auto safe-area-bottom">
          <div className="p-3 space-y-1 font-mono text-xs">
            {consoleLogs.length === 0 ? (
              <p className="text-gray-600">No console output</p>
            ) : (
              consoleLogs.map((log, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "py-1 px-2 rounded",
                    log.type === 'error' ? "bg-red-500/10 text-red-400" :
                    log.type === 'warn' ? "bg-amber-500/10 text-amber-400" :
                    log.type === 'info' ? "bg-blue-500/10 text-blue-400" :
                    "text-gray-400"
                  )}
                >
                  <span className="text-gray-600 mr-2">{log.timestamp}</span>
                  {log.message}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
