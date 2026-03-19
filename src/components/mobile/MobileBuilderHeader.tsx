/**
 * MobileBuilderHeader - Premium sticky header for mobile builder
 * 
 * Features:
 * - Clean back navigation
 * - Project title with status indicator
 * - Primary Preview CTA
 * - Overflow menu
 * - Glass-morphism styling
 */

import { ArrowLeft, Eye, MoreVertical, Zap, Sparkles } from 'lucide-react';
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
    <header 
      className="sticky top-0 z-40 safe-area-top"
      data-testid="mobile-builder-header"
    >
      {/* Glass background layer */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black/98 to-black/95 backdrop-blur-2xl" />
      
      {/* Bottom border glow when generating */}
      <div className={cn(
        "absolute inset-x-0 bottom-0 h-px transition-opacity duration-500",
        isGenerating 
          ? "opacity-100 bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" 
          : "opacity-100 bg-white/[0.06]"
      )} />
      
      {/* Content */}
      <div className="relative flex h-16 items-center justify-between gap-3 px-3">
        {/* Left: Back button */}
        <button
          onClick={onBack}
          className="flex items-center justify-center size-11 -ml-1 rounded-2xl text-gray-400 hover:text-white hover:bg-white/[0.06] active:bg-white/10 active:scale-95 transition-all"
          aria-label="Go back"
          data-testid="mobile-back-btn"
        >
          <ArrowLeft className="size-5" strokeWidth={2} />
        </button>

        {/* Center: Project title + status */}
        <div className="flex-1 min-w-0 text-center px-2">
          <h1 className="text-[15px] font-semibold text-white truncate tracking-tight">
            {projectName}
          </h1>
          <div className="flex items-center justify-center gap-2 mt-1">
            {isGenerating ? (
              <div className="flex items-center gap-1.5">
                <span className="relative flex size-2">
                  <span className="absolute inset-0 rounded-full bg-violet-400 animate-ping opacity-75" />
                  <span className="relative rounded-full size-2 bg-violet-500" />
                </span>
                <span className="text-[11px] font-medium text-violet-400 tracking-wide">
                  Building...
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "size-1.5 rounded-full",
                  isConnected ? "bg-emerald-500" : "bg-gray-600"
                )} />
                <span className={cn(
                  "text-[11px] font-medium tracking-wide",
                  isConnected ? "text-emerald-500/80" : "text-gray-600"
                )}>
                  {isConnected ? 'Ready' : 'Offline'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Preview + Menu */}
        <div className="flex items-center gap-1.5">
          {/* Preview button - premium pill style */}
          <button
            onClick={onPreview}
            className={cn(
              "flex items-center gap-2 h-10 px-4 rounded-xl font-semibold text-[13px] transition-all active:scale-95",
              "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white",
              "shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30",
              "hover:from-violet-500 hover:to-fuchsia-500"
            )}
            data-testid="mobile-preview-btn"
          >
            <Eye className="size-4" strokeWidth={2.5} />
            <span>Preview</span>
          </button>
          
          {/* Menu button */}
          <button
            onClick={onMenu}
            className="flex items-center justify-center size-11 rounded-2xl text-gray-400 hover:text-white hover:bg-white/[0.06] active:bg-white/10 active:scale-95 transition-all"
            aria-label="Menu"
            data-testid="mobile-menu-btn"
          >
            <MoreVertical className="size-5" strokeWidth={2} />
          </button>
        </div>
      </div>
    </header>
  );
}
