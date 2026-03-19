/**
 * MobilePreviewCTA - Floating preview call-to-action for mobile
 * 
 * Premium floating pill that provides quick access to preview
 * with glass-morphism styling and subtle animations.
 */

import { Eye, Play, Maximize2, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobilePreviewCTAProps {
  onClick: () => void;
  isLoading?: boolean;
  hasContent?: boolean;
  isVisible?: boolean;
  className?: string;
}

export default function MobilePreviewCTA({
  onClick,
  isLoading = false,
  hasContent = true,
  isVisible = true,
  className,
}: MobilePreviewCTAProps) {
  if (!isVisible || !hasContent) return null;

  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={cn(
        // Positioning
        "fixed bottom-28 right-4 z-30",
        // Layout
        "flex items-center gap-2.5 px-5 py-3.5",
        // Shape
        "rounded-2xl",
        // Premium glass styling
        "bg-black/80 backdrop-blur-xl",
        "border border-white/10",
        // Shadow and glow
        "shadow-2xl shadow-black/50",
        // Text
        "text-[14px] font-semibold text-white",
        // Animation
        "transition-all duration-300",
        "hover:bg-black/90 hover:border-violet-500/30 hover:shadow-violet-500/10",
        "active:scale-95",
        // Disabled state
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      aria-label="View Preview"
      data-testid="mobile-preview-cta"
    >
      {/* Subtle gradient border effect */}
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-violet-500/20 via-fuchsia-500/10 to-violet-500/20 opacity-0 hover:opacity-100 transition-opacity -z-10 blur-sm" />
      
      {isLoading ? (
        <>
          <Loader2 className="size-5 animate-spin text-violet-400" />
          <span className="text-gray-300">Loading...</span>
        </>
      ) : (
        <>
          <div className="flex size-8 items-center justify-center rounded-xl bg-violet-500/20">
            <Eye className="size-4 text-violet-400" />
          </div>
          <span>View Preview</span>
        </>
      )}
    </button>
  );
}

/**
 * MobilePreviewMiniCard - Small preview thumbnail card for the feed
 */
interface MobilePreviewMiniCardProps {
  thumbnailSrc?: string;
  onClick: () => void;
  isReady?: boolean;
  title?: string;
}

export function MobilePreviewMiniCard({
  thumbnailSrc,
  onClick,
  isReady = true,
  title = "Your App Preview",
}: MobilePreviewMiniCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative w-full aspect-[16/10] rounded-2xl overflow-hidden",
        "border border-white/[0.08]",
        "bg-zinc-900",
        "group transition-all duration-300",
        "hover:border-violet-500/30",
        "active:scale-[0.99]"
      )}
      data-testid="mobile-preview-card"
    >
      {/* Thumbnail or placeholder */}
      {thumbnailSrc ? (
        <img
          src={thumbnailSrc}
          alt="Preview"
          className="w-full h-full object-cover object-top"
        />
      ) : (
        <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-zinc-900 to-zinc-950">
          <div className="size-14 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-3">
            <Sparkles className="size-7 text-violet-400" />
          </div>
          <p className="text-[13px] font-medium text-gray-400">{title}</p>
          <p className="text-[11px] text-gray-600 mt-1">Tap to open preview</p>
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm">
          <Play className="size-4 text-white" />
          <span className="text-[13px] font-medium text-white">Open Preview</span>
        </div>
      </div>

      {/* Live indicator */}
      {isReady && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10">
          <span className="relative flex size-2">
            <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
            <span className="relative rounded-full size-2 bg-emerald-500" />
          </span>
          <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wide">Live</span>
        </div>
      )}
    </button>
  );
}
