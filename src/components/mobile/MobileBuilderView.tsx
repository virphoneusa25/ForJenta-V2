/**
 * MobileBuilderView - Complete mobile-first builder experience
 * 
 * A conversation-driven, mobile-first UI for the AI code builder
 * featuring:
 * - Sticky agent composer dock at bottom
 * - Floating preview CTA
 * - File action cards in conversation feed
 * - Full-screen preview overlay
 * - Bottom sheet for tools
 */

import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MobileBuilderHeader,
  MobileAgentDock,
  MobilePreviewCTA,
  MobileToolsSheet,
  MobilePreviewSheet,
  MobileConversationFeed,
  convertPipelineToFeedItems,
} from './index';
import type { ProjectFile } from '@/types';

// Build status type
type BuildStatus = 'idle' | 'processing' | 'generating' | 'validating' | 'repairing' | 'preview_ready' | 'paused' | 'failed' | 'complete';

// Import agent types
import type { AgentMessage, NarrationStatus } from '@/lib/agent';

// Props from ProjectBuilder
interface MobileBuilderViewProps {
  // Project data
  projectName: string;
  projectId: string;
  files: ProjectFile[];
  
  // Generation state
  isGenerating: boolean;
  generationState: string;
  pipelineMessages: any[];
  fileCards: any[];
  
  // Smart Agent state (optional - for new agent mode)
  agentMessages?: AgentMessage[];
  agentStatus?: NarrationStatus;
  
  // Input state
  chatInput: string;
  setChatInput: (value: string) => void;
  
  // Actions
  onSend: (prompt?: string) => void;
  onSave: () => void;
  onDownload: () => void;
  onNewFile: () => void;
  onRefreshPreview: () => void;
  onDebugRepair: () => void;
  onOpenFile: (path: string) => void;
  onQuickAction?: (action: string) => void;
  
  // Panel toggles
  onShowVersions: () => void;
  onShowHistory: () => void;
  onShowChanges: () => void;
  onShowGitHub: () => void;
  
  // Preview
  generatePreviewHTML: () => string;
  projectType?: {
    type: string;
    label: string;
    color: string;
    icon: string;
  };
  
  // Other
  isSaving?: boolean;
  hasGitHub?: boolean;
}

export default function MobileBuilderView({
  projectName,
  projectId,
  files,
  isGenerating,
  generationState,
  pipelineMessages,
  fileCards,
  agentMessages = [],
  agentStatus,
  chatInput,
  setChatInput,
  onSend,
  onSave,
  onDownload,
  onNewFile,
  onRefreshPreview,
  onDebugRepair,
  onOpenFile,
  onQuickAction,
  onShowVersions,
  onShowHistory,
  onShowChanges,
  onShowGitHub,
  generatePreviewHTML,
  projectType,
  isSaving = false,
  hasGitHub = false,
}: MobileBuilderViewProps) {
  const navigate = useNavigate();
  
  // Sheet states
  const [showToolsSheet, setShowToolsSheet] = useState(false);
  const [showPreviewSheet, setShowPreviewSheet] = useState(false);

  // Map generation state to build status
  const buildStatus: BuildStatus = useMemo(() => {
    if (!isGenerating) return 'idle';
    switch (generationState) {
      case 'planning':
      case 'preparing':
        return 'processing';
      case 'generating':
      case 'building':
        return 'generating';
      case 'validating':
      case 'checking':
        return 'validating';
      case 'repairing':
      case 'fixing':
        return 'repairing';
      case 'complete':
      case 'done':
        return 'complete';
      case 'failed':
      case 'error':
        return 'failed';
      default:
        return 'processing';
    }
  }, [isGenerating, generationState]);

  // Convert pipeline data to feed items
  const feedItems = useMemo(() => {
    return convertPipelineToFeedItems(pipelineMessages, fileCards);
  }, [pipelineMessages, fileCards]);

  // Handlers
  const handleBack = useCallback(() => {
    navigate('/workspace');
  }, [navigate]);

  const handlePreview = useCallback(() => {
    setShowPreviewSheet(true);
  }, []);

  const handleMenu = useCallback(() => {
    setShowToolsSheet(true);
  }, []);

  const handleSubmit = useCallback(() => {
    if (chatInput.trim()) {
      onSend(chatInput);
    }
  }, [chatInput, onSend]);

  const handleViewFileFull = useCallback((path: string) => {
    // Open file in editor (or could show a modal)
    onOpenFile(path);
    // Close preview if open
    setShowPreviewSheet(false);
  }, [onOpenFile]);

  // Status message based on generation state
  const statusMessage = useMemo(() => {
    switch (generationState) {
      case 'planning': return 'Planning your changes...';
      case 'preparing': return 'Setting up...';
      case 'generating': return 'Generating code...';
      case 'building': return 'Building files...';
      case 'validating': return 'Validating preview...';
      case 'checking': return 'Checking for errors...';
      case 'repairing': return 'Auto-repairing...';
      case 'complete': return 'Build complete!';
      case 'failed': return 'Build failed';
      default: return '';
    }
  }, [generationState]);

  const hasContent = files.length > 0;

  return (
    <div className="flex flex-col h-screen bg-black">
      {/* Header */}
      <MobileBuilderHeader
        projectName={projectName}
        onBack={handleBack}
        onPreview={handlePreview}
        onMenu={handleMenu}
        isConnected={true}
        isGenerating={isGenerating}
      />

      {/* Main conversation feed */}
      <MobileConversationFeed
        items={feedItems}
        isProcessing={isGenerating}
        processingMessage={statusMessage}
        onOpenFile={onOpenFile}
        onViewFileFull={handleViewFileFull}
        agentMessages={agentMessages}
        agentStatus={agentStatus}
        onQuickAction={onQuickAction}
      />

      {/* Floating Preview CTA (hidden when generating or preview sheet open) */}
      {hasContent && !isGenerating && !showPreviewSheet && (
        <MobilePreviewCTA
          onClick={handlePreview}
          hasContent={hasContent}
        />
      )}

      {/* Agent Dock (sticky bottom) */}
      <MobileAgentDock
        value={chatInput}
        onChange={setChatInput}
        onSubmit={handleSubmit}
        onStop={() => {}} // TODO: Implement stop
        onAttach={() => {}} // TODO: Implement file attach
        onSettings={handleMenu}
        status={buildStatus}
        statusMessage={statusMessage}
        isGenerating={isGenerating}
        placeholder={
          files.length === 0
            ? "Describe what you want to build..."
            : "Continue building or describe changes..."
        }
      />

      {/* Tools Bottom Sheet */}
      <MobileToolsSheet
        isOpen={showToolsSheet}
        onClose={() => setShowToolsSheet(false)}
        onSave={onSave}
        onDownload={onDownload}
        onVersions={() => {
          setShowToolsSheet(false);
          onShowVersions();
        }}
        onHistory={() => {
          setShowToolsSheet(false);
          onShowHistory();
        }}
        onChanges={() => {
          setShowToolsSheet(false);
          onShowChanges();
        }}
        onGitHub={() => {
          setShowToolsSheet(false);
          onShowGitHub();
        }}
        onNewFile={() => {
          setShowToolsSheet(false);
          onNewFile();
        }}
        onRefresh={onRefreshPreview}
        onDebug={onDebugRepair}
        isSaving={isSaving}
        hasGitHub={hasGitHub}
      />

      {/* Preview Full-screen Sheet */}
      <MobilePreviewSheet
        isOpen={showPreviewSheet}
        onClose={() => setShowPreviewSheet(false)}
        previewHtml={generatePreviewHTML()}
        onRefresh={onRefreshPreview}
        projectType={projectType}
        showConsole={true}
        consoleLogs={[]}
      />
    </div>
  );
}
