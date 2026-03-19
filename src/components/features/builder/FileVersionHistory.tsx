/**
 * FileVersionHistory - Shows version history for a file
 */

import { useState, useEffect } from 'react';
import { usePersistentProjectStore, FileVersion } from '@/stores/persistentProjectStore';
import { History, ChevronDown, ChevronRight, Clock, Plus, Edit3, Trash2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

const CHANGE_TYPE_CONFIG = {
  created: { icon: Plus, label: 'Created', color: 'text-emerald-400' },
  updated: { icon: Edit3, label: 'Updated', color: 'text-blue-400' },
  deleted: { icon: Trash2, label: 'Deleted', color: 'text-red-400' },
  renamed: { icon: RotateCcw, label: 'Renamed', color: 'text-amber-400' },
  unchanged: { icon: Clock, label: 'Unchanged', color: 'text-gray-400' },
};

interface FileVersionHistoryProps {
  path: string;
  currentContent?: string;
  onSelectVersion?: (version: FileVersion) => void;
}

export default function FileVersionHistory({
  path,
  currentContent,
  onSelectVersion,
}: FileVersionHistoryProps) {
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  
  const getFileVersions = usePersistentProjectStore((s) => s.getFileVersions);
  
  useEffect(() => {
    if (expanded && versions.length === 0) {
      loadVersions();
    }
  }, [expanded, path]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const fetchedVersions = await getFileVersions(path);
      setVersions(fetchedVersions);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSelectVersion = (version: FileVersion) => {
    setSelectedVersion(version.version_id);
    onSelectVersion?.(version);
  };

  return (
    <div className="border-t border-white/5">
      {/* Header - Clickable to expand */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-gray-300 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="size-3.5" />
        ) : (
          <ChevronRight className="size-3.5" />
        )}
        <History className="size-3.5" />
        <span>Version History</span>
        {versions.length > 0 && (
          <span className="ml-auto text-[10px] text-gray-600 tabular-nums">
            {versions.length} versions
          </span>
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="max-h-64 overflow-y-auto scrollbar-thin">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <div className="size-4 animate-spin rounded-full border-2 border-white/10 border-t-violet-500" />
            </div>
          ) : versions.length === 0 ? (
            <div className="px-3 py-4 text-center">
              <p className="text-[10px] text-gray-600">No version history available</p>
            </div>
          ) : (
            <div className="px-3 pb-3 space-y-1">
              {versions.map((version, index) => {
                const config = CHANGE_TYPE_CONFIG[version.change_type as keyof typeof CHANGE_TYPE_CONFIG] || CHANGE_TYPE_CONFIG.unchanged;
                const Icon = config.icon;
                const isSelected = selectedVersion === version.version_id;
                const isCurrent = index === 0;

                return (
                  <button
                    key={version.version_id}
                    onClick={() => handleSelectVersion(version)}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors",
                      isSelected
                        ? "bg-violet-500/10 border border-violet-500/30"
                        : "hover:bg-white/5 border border-transparent"
                    )}
                  >
                    {/* Icon */}
                    <div className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded mt-0.5",
                      config.color,
                      "bg-white/5"
                    )}>
                      <Icon className="size-3" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-[10px] font-medium", config.color)}>
                          v{version.version_number}
                        </span>
                        {isCurrent && (
                          <span className="px-1 py-0.5 text-[9px] bg-emerald-500/20 text-emerald-400 rounded">
                            Current
                          </span>
                        )}
                        <span className="ml-auto text-[9px] text-gray-600">
                          {formatDate(version.created_at)}
                        </span>
                      </div>
                      
                      {version.change_reason && (
                        <p className="mt-0.5 text-[10px] text-gray-500 line-clamp-1">
                          {version.change_reason}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
