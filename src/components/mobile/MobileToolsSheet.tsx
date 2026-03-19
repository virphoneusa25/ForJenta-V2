/**
 * MobileToolsSheet - Bottom sheet for tools and actions
 */

import { useState } from 'react';
import {
  X, Save, Download, GitBranch, History, Github, Diff,
  FolderPlus, FileCode2, Trash2, RefreshCw, Settings,
  ChevronDown, ExternalLink, Bug, Wand2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Tool {
  id: string;
  icon: React.ElementType;
  label: string;
  description?: string;
  color?: string;
  badge?: string;
}

interface MobileToolsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
  onDownload?: () => void;
  onVersions?: () => void;
  onHistory?: () => void;
  onGitHub?: () => void;
  onChanges?: () => void;
  onNewFile?: () => void;
  onRefresh?: () => void;
  onDebug?: () => void;
  onSettings?: () => void;
  isSaving?: boolean;
  hasGitHub?: boolean;
}

export default function MobileToolsSheet({
  isOpen,
  onClose,
  onSave,
  onDownload,
  onVersions,
  onHistory,
  onGitHub,
  onChanges,
  onNewFile,
  onRefresh,
  onDebug,
  onSettings,
  isSaving = false,
  hasGitHub = false,
}: MobileToolsSheetProps) {
  if (!isOpen) return null;

  const primaryTools: Tool[] = [
    { id: 'save', icon: Save, label: isSaving ? 'Saving...' : 'Save', color: 'text-emerald-400' },
    { id: 'refresh', icon: RefreshCw, label: 'Refresh Preview', color: 'text-blue-400' },
    { id: 'debug', icon: Bug, label: 'Debug & Repair', color: 'text-amber-400' },
  ];

  const projectTools: Tool[] = [
    { id: 'history', icon: History, label: 'Build History', description: 'View prompt history' },
    { id: 'changes', icon: Diff, label: 'What Changed', description: 'See recent changes' },
    { id: 'versions', icon: GitBranch, label: 'Versions', description: 'Restore previous versions' },
    { id: 'newfile', icon: FolderPlus, label: 'New File', description: 'Add a new file' },
  ];

  const exportTools: Tool[] = [
    { id: 'download', icon: Download, label: 'Download All', description: 'Export as files' },
    { 
      id: 'github', 
      icon: Github, 
      label: 'Push to GitHub', 
      description: hasGitHub ? 'Connected' : 'Connect account',
      badge: hasGitHub ? 'Connected' : undefined,
    },
  ];

  const handleToolClick = (toolId: string) => {
    switch (toolId) {
      case 'save': onSave?.(); break;
      case 'refresh': onRefresh?.(); break;
      case 'debug': onDebug?.(); break;
      case 'history': onHistory?.(); break;
      case 'changes': onChanges?.(); break;
      case 'versions': onVersions?.(); break;
      case 'newfile': onNewFile?.(); break;
      case 'download': onDownload?.(); break;
      case 'github': onGitHub?.(); break;
      case 'settings': onSettings?.(); break;
    }
    // Auto-close for single-action tools
    if (['save', 'refresh', 'download', 'newfile'].includes(toolId)) {
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom duration-300">
        <div className="bg-zinc-950 rounded-t-3xl border-t border-white/10 max-h-[80vh] overflow-hidden">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full bg-gray-700" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pb-4">
            <h2 className="text-lg font-semibold text-white">Tools</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-4 pb-8 space-y-6 overflow-y-auto max-h-[60vh] safe-area-bottom">
            {/* Primary Actions */}
            <div className="grid grid-cols-3 gap-3">
              {primaryTools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => handleToolClick(tool.id)}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] active:bg-white/10 transition-colors"
                >
                  <tool.icon className={cn("size-6", tool.color || "text-gray-400")} />
                  <span className="text-xs text-gray-300 font-medium">{tool.label}</span>
                </button>
              ))}
            </div>

            {/* Project Tools */}
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-3 px-1">
                Project
              </p>
              <div className="space-y-2">
                {projectTools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => handleToolClick(tool.id)}
                    className="flex items-center gap-4 w-full p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] active:bg-white/[0.08] transition-colors"
                  >
                    <div className="flex items-center justify-center size-10 rounded-xl bg-white/[0.06]">
                      <tool.icon className="size-5 text-gray-400" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-white">{tool.label}</p>
                      {tool.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{tool.description}</p>
                      )}
                    </div>
                    <ChevronDown className="size-4 text-gray-600 -rotate-90" />
                  </button>
                ))}
              </div>
            </div>

            {/* Export Tools */}
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-3 px-1">
                Export
              </p>
              <div className="space-y-2">
                {exportTools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => handleToolClick(tool.id)}
                    className="flex items-center gap-4 w-full p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] active:bg-white/[0.08] transition-colors"
                  >
                    <div className="flex items-center justify-center size-10 rounded-xl bg-white/[0.06]">
                      <tool.icon className="size-5 text-gray-400" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-white">{tool.label}</p>
                      {tool.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{tool.description}</p>
                      )}
                    </div>
                    {tool.badge && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-[10px] text-emerald-400 font-medium">
                        {tool.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
