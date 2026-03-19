/**
 * MobilePreviewCTA - Floating preview call-to-action for mobile
 */

import { Eye, Play, Maximize2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobilePreviewCTAProps {
  onClick: () => void;
  isLoading?: boolean;
  hasContent?: boolean;
  className?: string;
}

export default function MobilePreviewCTA({
  onClick,
  isLoading = false,
  hasContent = true,
  className,
}: MobilePreviewCTAProps) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading || !hasContent}
      className={cn(
        "fixed bottom-24 right-4 z-30 flex items-center gap-2 px-5 py-3 rounded-2xl",
        "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold text-sm",
        "shadow-lg shadow-violet-500/30 hover:shadow-violet-500/40",
        "active:scale-95 transition-all duration-200",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
        className
      )}
      aria-label="View Preview"
    >
      {isLoading ? (
        <>
          <Loader2 className="size-5 animate-spin" />
          <span>Loading...</span>
        </>
      ) : (
        <>
          <Eye className="size-5" />
          <span>View Preview</span>
        </>
      )}
    </button>
  );
}

/**
 * MobilePreviewMiniCard - Small preview thumbnail card
 */
interface MobilePreviewMiniCardProps {
  thumbnailSrc?: string;
  onClick: () => void;
  isReady?: boolean;
}

export function MobilePreviewMiniCard({
  thumbnailSrc,
  onClick,
  isReady = true,
}: MobilePreviewMiniCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative w-full aspect-video rounded-xl overflow-hidden border",
        "bg-zinc-900 border-white/10 hover:border-violet-500/50",
        "group transition-all duration-200"
      )}
    >
      {/* Thumbnail or placeholder */}
      {thumbnailSrc ? (
        <img
          src={thumbnailSrc}
          alt="Preview"
          className="w-full h-full object-cover object-top"
        />
      ) : (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Eye className="size-8 text-gray-600 mx-auto mb-2" />
            <p className="text-xs text-gray-500">Preview your app</p>
          </div>
        </div>
      )}

      {/* Overlay on hover */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <div className="flex items-center gap-2 text-white">
          <Play className="size-5" />
          <span className="text-sm font-medium">Open Preview</span>
        </div>
      </div>

      {/* Status indicator */}
      {isReady && (
        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/20 backdrop-blur-sm">
          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-emerald-400 font-medium">Live</span>
        </div>
      )}
    </button>
  );
}
