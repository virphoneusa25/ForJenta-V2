/**
 * MobileConversationFeed - Premium conversation/activity feed for mobile builder
 * 
 * The main scrollable area displaying:
 * - Assistant messages with streaming text
 * - User prompts
 * - File action cards
 * - Status updates
 * - Preview snapshots
 * 
 * Features:
 * - Auto-scroll to latest
 * - Generous spacing
 * - Premium empty state
 * - Quick action suggestions
 */

import { useRef, useEffect } from 'react';
import { Sparkles, Wand2, ArrowRight, Zap, Palette, Code2, Layout } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  AssistantMessageCard, 
  UserPromptCard, 
  StatusRow, 
  VerificationCard,
  FileActionCard,
  AgentThinkingIndicator,
} from './AgentMessageCard';
import { MobilePreviewMiniCard } from './MobilePreviewCTA';
import type { AgentMessage, NarrationStatus, FileAction } from '@/lib/agent';

// Legacy feed item types for backward compatibility
type FeedItemType = 
  | 'user_prompt'
  | 'assistant_message'
  | 'file_action'
  | 'status'
  | 'processing'
  | 'preview';

interface LegacyFileAction {
  action: 'created' | 'edited' | 'repaired' | 'viewed' | 'deleted';
  path: string;
  language?: string;
  content?: string;
}

interface FeedItem {
  id: string;
  type: FeedItemType;
  timestamp: string;
  prompt?: string;
  message?: string;
  messageType?: 'assistant' | 'status' | 'warning' | 'error' | 'success' | 'info';
  fileAction?: LegacyFileAction;
  processingMessage?: string;
}

interface MobileConversationFeedProps {
  // Legacy items support
  items?: FeedItem[];
  // New agent-based props
  agentMessages?: AgentMessage[];
  agentStatus?: NarrationStatus;
  // Common props
  isProcessing?: boolean;
  processingMessage?: string;
  onOpenFile?: (path: string) => void;
  onViewFileFull?: (path: string) => void;
  onQuickAction?: (action: string) => void;
  onPreviewClick?: () => void;
  hasPreview?: boolean;
}

export default function MobileConversationFeed({
  items = [],
  agentMessages = [],
  agentStatus,
  isProcessing = false,
  processingMessage,
  onOpenFile,
  onViewFileFull,
  onQuickAction,
  onPreviewClick,
  hasPreview = false,
}: MobileConversationFeedProps) {
  const feedRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new content
  useEffect(() => {
    if (feedRef.current) {
      const scrollOptions: ScrollIntoViewOptions = { behavior: 'smooth', block: 'end' };
      feedRef.current.scrollTo({
        top: feedRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [items.length, agentMessages.length, isProcessing]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Determine content mode
  const useAgentMode = agentMessages.length > 0;
  const hasContent = useAgentMode ? agentMessages.length > 0 : items.length > 0;
  const isComplete = agentStatus === 'complete';

  return (
    <div
      ref={feedRef}
      className="flex-1 overflow-y-auto scrollbar-thin"
      data-testid="mobile-conversation-feed"
    >
      {/* Feed content with generous padding */}
      <div className="px-4 py-6 space-y-6 pb-32">
        {!hasContent && !isProcessing ? (
          <EmptyState onQuickAction={onQuickAction} />
        ) : useAgentMode ? (
          /* Agent-based conversation feed */
          <>
            {agentMessages.map((message, index) => (
              <div key={message.id}>
                {message.type === 'thought' && (
                  <AssistantMessageCard
                    content={message.content}
                    status={message.status}
                    isStreaming={message.isStreaming}
                    fileActions={message.fileActions}
                    onFileClick={onOpenFile}
                  />
                )}

                {message.type === 'status' && (
                  <StatusRow status={message.status} message={message.content} />
                )}

                {message.type === 'verification' && (
                  <VerificationCard
                    passed={message.status === 'complete'}
                    title={message.content}
                    checks={message.subDetails}
                  />
                )}

                {message.type === 'file' && message.fileActions && message.fileActions.length > 0 && (
                  <div className="pl-14 space-y-2">
                    {message.fileActions.map((action, i) => (
                      <FileActionCard key={i} action={action} onClick={onOpenFile} isCompact />
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Show thinking indicator when agent is working */}
            {isProcessing && agentStatus && agentStatus !== 'complete' && agentStatus !== 'failed' && (
              <AgentThinkingIndicator status={agentStatus} message={processingMessage} />
            )}

            {/* Preview card after completion */}
            {isComplete && hasPreview && onPreviewClick && (
              <div className="pt-4">
                <MobilePreviewMiniCard onClick={onPreviewClick} isReady />
              </div>
            )}

            {/* Quick actions after completion */}
            {isComplete && onQuickAction && (
              <QuickActionsPanel onAction={onQuickAction} />
            )}
          </>
        ) : (
          /* Legacy pipeline-based feed */
          <>
            {items.map((item) => (
              <div key={item.id}>
                {item.type === 'user_prompt' && item.prompt && (
                  <UserPromptCard
                    content={item.prompt}
                    timestamp={formatTime(item.timestamp)}
                  />
                )}

                {item.type === 'assistant_message' && item.message && (
                  <AssistantMessageCard
                    content={item.message}
                    status={item.messageType === 'error' ? 'failed' : 
                            item.messageType === 'success' ? 'complete' : 
                            'working'}
                    isStreaming={false}
                  />
                )}

                {item.type === 'file_action' && item.fileAction && (
                  <div className="pl-14">
                    <FileActionCard
                      action={{
                        path: item.fileAction.path,
                        action: item.fileAction.action === 'edited' ? 'updated' : item.fileAction.action,
                        timestamp: item.timestamp,
                      }}
                      onClick={onOpenFile}
                    />
                  </div>
                )}

                {item.type === 'status' && item.message && (
                  <StatusRow status="working" message={item.message} />
                )}

                {item.type === 'preview' && onPreviewClick && (
                  <MobilePreviewMiniCard onClick={onPreviewClick} isReady />
                )}
              </div>
            ))}

            {/* Processing indicator */}
            {isProcessing && (
              <AgentThinkingIndicator status="generating" message={processingMessage} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Premium Empty State
 */
function EmptyState({ onQuickAction }: { onQuickAction?: (action: string) => void }) {
  const suggestions = [
    { icon: Layout, label: 'Build a landing page', prompt: 'Build a modern landing page with hero section, features, and call-to-action' },
    { icon: Code2, label: 'Create a dashboard', prompt: 'Create a dashboard with charts, stats cards, and data tables' },
    { icon: Palette, label: 'Design a portfolio', prompt: 'Design a portfolio website with project gallery and contact form' },
  ];

  return (
    <div 
      className="flex flex-col items-center justify-center min-h-[60vh] py-12 px-6 text-center"
      data-testid="mobile-empty-state"
    >
      {/* Premium icon */}
      <div className="relative mb-6">
        <div className="size-20 rounded-3xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
          <Sparkles className="size-10 text-violet-400" />
        </div>
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-3xl bg-violet-500/10 blur-xl -z-10" />
      </div>
      
      <h3 className="text-xl font-semibold text-white mb-3">
        Ready to build
      </h3>
      <p className="text-[15px] text-gray-500 max-w-[280px] leading-relaxed mb-8">
        Describe what you want to create and I'll build it for you step by step.
      </p>
      
      {/* Quick suggestions */}
      {onQuickAction && (
        <div className="w-full space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-600 mb-3">
            Try one of these
          </p>
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.label}
              onClick={() => onQuickAction(suggestion.prompt)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-left transition-all hover:bg-white/[0.06] hover:border-violet-500/20 active:scale-[0.99]"
            >
              <div className="size-10 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                <suggestion.icon className="size-5 text-violet-400" />
              </div>
              <span className="text-[14px] font-medium text-gray-300">{suggestion.label}</span>
              <ArrowRight className="size-4 text-gray-600 ml-auto" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Quick Actions Panel - Shown after build completion
 */
function QuickActionsPanel({ onAction }: { onAction: (action: string) => void }) {
  const actions = [
    { icon: Wand2, label: 'Enhance the design', prompt: 'Enhance the visual design with better spacing, colors, and animations' },
    { icon: Zap, label: 'Add dark mode', prompt: 'Add a dark mode toggle with smooth theme switching' },
    { icon: Layout, label: 'Improve mobile view', prompt: 'Improve the mobile responsiveness and touch interactions' },
  ];

  return (
    <div className="pt-6 border-t border-white/[0.06]">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="size-4 text-violet-400" />
        <span className="text-[12px] font-semibold uppercase tracking-wider text-gray-500">
          Continue Building
        </span>
      </div>
      <div className="space-y-2">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={() => onAction(action.prompt)}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-left transition-all hover:bg-white/[0.06] hover:border-violet-500/20 active:scale-[0.99]"
          >
            <action.icon className="size-4 text-violet-400 shrink-0" />
            <span className="text-[13px] font-medium text-gray-400">{action.label}</span>
            <ArrowRight className="size-3.5 text-gray-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Helper to convert pipeline messages to feed items (for backward compatibility)
 */
export function convertPipelineToFeedItems(
  messages: any[],
  fileCards: any[]
): FeedItem[] {
  const items: FeedItem[] = [];

  messages.forEach((msg, idx) => {
    if (msg.type === 'prompt') {
      items.push({
        id: `prompt-${idx}`,
        type: 'user_prompt',
        timestamp: msg.timestamp || new Date().toISOString(),
        prompt: msg.data?.text || msg.data || '',
      });
    } else if (msg.type === 'assistant') {
      items.push({
        id: `assistant-${idx}`,
        type: 'assistant_message',
        timestamp: msg.timestamp || new Date().toISOString(),
        message: msg.data?.label || msg.data?.text || '',
        messageType: 'assistant',
      });
    } else if (msg.type === 'error') {
      items.push({
        id: `error-${idx}`,
        type: 'assistant_message',
        timestamp: msg.timestamp || new Date().toISOString(),
        message: msg.data?.error || 'An error occurred',
        messageType: 'error',
      });
    } else if (msg.type === 'status') {
      items.push({
        id: `status-${idx}`,
        type: 'status',
        timestamp: msg.timestamp || new Date().toISOString(),
        message: msg.data?.label || msg.data || '',
      });
    }
  });

  // Add file cards as file actions
  fileCards.forEach((card, idx) => {
    items.push({
      id: `file-${card.path}-${idx}`,
      type: 'file_action',
      timestamp: card.timestamp || new Date().toISOString(),
      fileAction: {
        action: card.isNew ? 'created' : 'edited',
        path: card.path,
        language: card.language,
        content: card.content,
      },
    });
  });

  // Sort by timestamp
  return items.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}
