/**
 * MobileBuilderView - Complete mobile-first builder experience
 * 
 * A premium, conversation-driven mobile UI for the AI code builder
 * featuring:
 * - Premium sticky header with project info
 * - Conversational build feed with streaming messages
 * - Inline file action cards
 * - Floating preview access
 * - Sticky bottom agent dock
 * - Full-screen preview overlay
 * - Bottom sheet for tools
 */

import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileBuilderHeader from './MobileBuilderHeader';
import MobileAgentDock from './MobileAgentDock';
import MobilePreviewCTA from './MobilePreviewCTA';
import MobileToolsSheet from './MobileToolsSheet';
import MobilePreviewSheet from './MobilePreviewSheet';
import MobileConversationFeed, { convertPipelineToFeedItems } from './MobileConversationFeed';
import type { ProjectFile } from '@/types';
import type { AgentMessage, NarrationStatus } from '@/lib/agent';

// Build status type
type BuildStatus = 'idle' | 'processing' | 'generating' | 'validating' | 'repairing' | 'preview_ready' | 'paused' | 'failed' | 'complete';

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
  
  // Smart Agent state
  agentMessages?: AgentMessage[];
  agentStatus?: NarrationStatus;
  
  // Prompt history for conversation continuity
  promptHistory?: Array<{
    prompt_id: string;
    content: string;
    prompt_type: string;
    created_at: string;
  }>;
  
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
  promptHistory = [],
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
    if (!isGenerating) {
      // Check if we just completed
      if (agentStatus === 'complete') return 'complete';
      if (agentStatus === 'failed') return 'failed';
      return 'idle';
    }
    
    switch (generationState) {
      case 'planning':
      case 'preparing':
      case 'thinking':
        return 'processing';
      case 'generating':
      case 'building':
        return 'generating';
      case 'validating':
      case 'checking':
      case 'verifying':
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
  }, [isGenerating, generationState, agentStatus]);

  // Convert pipeline data to feed items (legacy support)
  // Include prompt history for conversation continuity
  const feedItems = useMemo(() => {
    const pipelineItems = convertPipelineToFeedItems(pipelineMessages, fileCards);
    
    // Also convert prompt history to feed items (for previously saved prompts)
    const historyItems = promptHistory.map((p, idx) => ({
      id: `history-${p.prompt_id}`,
      type: 'user_prompt' as const,
      timestamp: p.created_at,
      prompt: p.content,
    }));
    
    // Merge and sort by timestamp
    // Filter out duplicate prompts (same content within 1 second)
    const allItems = [...historyItems, ...pipelineItems];
    const seen = new Set<string>();
    const uniqueItems = allItems.filter(item => {
      if (item.type === 'user_prompt' && item.prompt) {
        const key = `${item.prompt.trim()}-${Math.floor(new Date(item.timestamp).getTime() / 1000)}`;
        if (seen.has(key)) return false;
        seen.add(key);
      }
      return true;
    });
    
    return uniqueItems.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [pipelineMessages, fileCards, promptHistory]);

  // Determine if we have any content (including history)
  const hasHistory = promptHistory.length > 0 || pipelineMessages.length > 0;

  // Status message based on generation state
  const statusMessage = useMemo(() => {
    switch (generationState) {
      case 'planning': return 'Planning your changes...';
      case 'preparing': return 'Setting up...';
      case 'thinking': return 'Analyzing request...';
      case 'generating': return 'Generating code...';
      case 'building': return 'Building files...';
      case 'validating': return 'Validating changes...';
      case 'verifying': return 'Verifying preview...';
      case 'checking': return 'Running checks...';
      case 'repairing': return 'Auto-repairing...';
      case 'complete': return 'Build complete!';
      case 'failed': return 'Build failed';
      default: return '';
    }
  }, [generationState]);

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
    onOpenFile(path);
    setShowPreviewSheet(false);
  }, [onOpenFile]);

  const handleQuickAction = useCallback((prompt: string) => {
    setChatInput(prompt);
    // Optionally auto-submit
    // onSend(prompt);
  }, [setChatInput]);

  // Has content if files exist OR if there's conversation history
  const hasContent = files.length > 0 || hasHistory;
  const showPreviewCTA = files.length > 0 && !isGenerating && !showPreviewSheet;

  return (
    <div className="flex flex-col h-screen bg-black" data-testid="mobile-builder-view">
      {/* Premium Header */}
      <MobileBuilderHeader
        projectName={projectName}
        onBack={handleBack}
        onPreview={handlePreview}
        onMenu={handleMenu}
        isConnected={true}
        isGenerating={isGenerating}
      />

      {/* Main Conversation Feed */}
      <MobileConversationFeed
        items={feedItems}
        agentMessages={agentMessages}
        agentStatus={agentStatus}
        isProcessing={isGenerating}
        processingMessage={statusMessage}
        onOpenFile={onOpenFile}
        onViewFileFull={handleViewFileFull}
        onQuickAction={onQuickAction || handleQuickAction}
        onPreviewClick={handlePreview}
        hasPreview={hasContent}
      />

      {/* Floating Preview CTA */}
      <MobilePreviewCTA
        onClick={handlePreview}
        hasContent={hasContent}
        isVisible={showPreviewCTA}
      />

      {/* Premium Agent Dock */}
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
            ? "What would you like to build?"
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
