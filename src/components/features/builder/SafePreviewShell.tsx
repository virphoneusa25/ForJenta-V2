import { Loader2, AlertTriangle, Eye, Wrench, FileCode2, RefreshCw } from 'lucide-react';
import type { GenerationState } from '@/types/generation';

interface SafePreviewShellProps {
  state: GenerationState;
  currentStep?: string;
  errorMessage?: string;
  failingFile?: string;
  unresolvedImports?: string[];
  phase?: string;
  onRetry?: () => void;
}

export default function SafePreviewShell({
  state,
  currentStep,
  errorMessage,
  failingFile,
  unresolvedImports,
  phase,
  onRetry,
}: SafePreviewShellProps) {
  const isGenerating =
    state !== 'idle' && state !== 'complete' && state !== 'failed';
  const isFailed = state === 'failed';

  return (
    <div className="flex h-full flex-col items-center justify-center bg-zinc-950 p-8">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div
          className={`mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl ${
            isFailed ? 'bg-red-500/10' : isGenerating ? 'bg-violet-500/10' : 'bg-zinc-800'
          }`}
        >
          {isFailed ? (
            <AlertTriangle className="size-8 text-red-400" />
          ) : isGenerating ? (
            <Loader2 className="size-8 text-violet-400 animate-spin" />
          ) : (
            <Eye className="size-8 text-gray-500" />
          )}
        </div>

        {/* Title */}
        <h3 className="font-display text-lg font-semibold text-white">
          {isFailed
            ? 'Preview Unavailable'
            : isGenerating
              ? 'Building Your App'
              : 'Preview Will Appear Here'}
        </h3>

        {/* Description */}
        <p className="mt-2 text-sm text-gray-400">
          {isFailed
            ? errorMessage || 'Generation encountered an error.'
            : isGenerating
              ? currentStep || 'Processing your request...'
              : 'Submit a prompt to start generating your app.'}
        </p>

        {/* Failing file info */}
        {isFailed && failingFile && (
          <div className="mt-4 rounded-xl border border-red-500/10 bg-red-500/[0.03] p-3 text-left">
            <p className="text-[11px] font-medium text-red-300 mb-1">Failing file</p>
            <p className="font-mono text-xs text-red-400/80">{failingFile}</p>
          </div>
        )}

        {/* Unresolved imports */}
        {isFailed && unresolvedImports && unresolvedImports.length > 0 && (
          <div className="mt-3 rounded-xl border border-amber-500/10 bg-amber-500/[0.03] p-3 text-left">
            <p className="text-[11px] font-medium text-amber-300 mb-1">
              Unresolved imports ({unresolvedImports.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {unresolvedImports.slice(0, 6).map((imp) => (
                <span
                  key={imp}
                  className="rounded bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] text-amber-400"
                >
                  {imp}
                </span>
              ))}
              {unresolvedImports.length > 6 && (
                <span className="text-[10px] text-amber-500">
                  +{unresolvedImports.length - 6} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Phase info */}
        {isFailed && phase && (
          <p className="mt-3 text-[11px] text-gray-600">
            Failed at phase: <span className="font-medium text-gray-400">{phase}</span>
          </p>
        )}

        {/* Progress indicator during generation */}
        {isGenerating && (
          <div className="mt-6 flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg bg-violet-500/10 px-4 py-2">
              {state === 'wiring' ? (
                <Wrench className="size-3.5 text-violet-400" />
              ) : state === 'generating_boot_files' || state === 'generating_feature_files' ? (
                <FileCode2 className="size-3.5 text-violet-400" />
              ) : (
                <Loader2 className="size-3.5 text-violet-400 animate-spin" />
              )}
              <span className="text-xs text-violet-300">
                {currentStep || state.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="h-1 w-48 overflow-hidden rounded-full bg-zinc-800">
              <div className="h-full w-1/2 animate-shimmer rounded-full bg-gradient-to-r from-violet-500/50 via-fuchsia-500/50 to-violet-500/50" />
            </div>
          </div>
        )}

        {/* Error actions */}
        {isFailed && onRetry && (
          <button
            onClick={onRetry}
            className="mt-5 inline-flex items-center gap-2 rounded-xl gradient-primary px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <RefreshCw className="size-4" />
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}
