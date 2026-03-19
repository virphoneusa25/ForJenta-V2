/**
 * MobileBuilderHeader - Compact premium header for mobile builder
 */

import { ArrowLeft, Eye, MoreVertical, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileBuilderHeaderProps {
  projectName: string;
  onBack: () => void;
  onPreview: () => void;
  onMenu: () => void;
  isConnected?: boolean;
  isGenerating?: boolean;
}

export default function MobileBuilderHeader({
  projectName,
  onBack,
  onPreview,
  onMenu,
  isConnected = true,
  isGenerating = false,
}: MobileBuilderHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-2 border-b border-white/[0.06] bg-black/95 backdrop-blur-xl px-2 safe-area-top">
      {/* Left: Back button */}
      <button
        onClick={onBack}
        className="flex items-center justify-center size-10 rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.06] active:bg-white/10 transition-colors"
        aria-label="Go back"
      >
        <ArrowLeft className="size-5" />
      </button>

      {/* Center: Project title + status */}
      <div className="flex-1 min-w-0 text-center">
        <h1 className="text-sm font-semibold text-white truncate px-2">
          {projectName}
        </h1>
        <div className="flex items-center justify-center gap-1.5 mt-0.5">
          {isGenerating ? (
            <>
              <span className="size-1.5 rounded-full bg-violet-500 animate-pulse" />
              <span className="text-[10px] text-violet-400">Building...</span>
            </>
          ) : (
            <>
              {isConnected ? (
                <Wifi className="size-3 text-emerald-500" />
              ) : (
                <WifiOff className="size-3 text-gray-500" />
              )}
              <span className="text-[10px] text-gray-500">
                {isConnected ? 'Connected' : 'Offline'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right: Preview + Menu */}
      <div className="flex items-center gap-1">
        <button
          onClick={onPreview}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-500 text-white text-xs font-semibold hover:bg-violet-400 active:bg-violet-600 transition-colors"
          data-testid="mobile-preview-btn"
        >
          <Eye className="size-3.5" />
          <span>Preview</span>
        </button>
        
        <button
          onClick={onMenu}
          className="flex items-center justify-center size-10 rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.06] active:bg-white/10 transition-colors"
          aria-label="Menu"
          data-testid="mobile-menu-btn"
        >
          <MoreVertical className="size-5" />
        </button>
      </div>
    </header>
  );
}
