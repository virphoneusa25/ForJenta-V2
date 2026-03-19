/**
 * MobileConversationFeed - Main conversation/activity feed for mobile builder
 */

import { useRef, useEffect } from 'react';
import { Sparkles, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import MobileFileActionCard from './MobileFileActionCard';
import MobileBuildMessageCard, { MobileProcessingIndicator } from './MobileBuildMessageCard';

type FeedItemType = 
  | 'user_prompt'
  | 'assistant_message'
  | 'file_action'
  | 'status'
  | 'processing';

interface FileAction {
  action: 'created' | 'edited' | 'repaired' | 'viewed' | 'deleted';
  path: string;
  language?: string;
  content?: string;
}

interface FeedItem {
  id: string;
  type: FeedItemType;
  timestamp: string;
  // For user_prompt
  prompt?: string;
  // For assistant_message
  message?: string;
  messageType?: 'assistant' | 'status' | 'warning' | 'error' | 'success' | 'info';
  // For file_action
  fileAction?: FileAction;
  // For processing
  processingMessage?: string;
}

interface MobileConversationFeedProps {
  items: FeedItem[];
  isProcessing?: boolean;
  processingMessage?: string;
  onOpenFile?: (path: string) => void;
  onViewFileFull?: (path: string) => void;
}

export default function MobileConversationFeed({
  items,
  isProcessing = false,
  processingMessage,
  onOpenFile,
  onViewFileFull,
}: MobileConversationFeedProps) {
  const feedRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new items
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTo({
        top: feedRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [items.length, isProcessing]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      ref={feedRef}
      className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin"
    >
      {items.length === 0 && !isProcessing ? (
        <EmptyState />
      ) : (
        <>
          {items.map((item) => (
            <div key={item.id}>
              {item.type === 'user_prompt' && (
                <UserPromptCard
                  prompt={item.prompt || ''}
                  timestamp={formatTime(item.timestamp)}
                />
              )}

              {item.type === 'assistant_message' && (
                <MobileBuildMessageCard
                  type={item.messageType || 'assistant'}
                  content={item.message || ''}
                  timestamp={formatTime(item.timestamp)}
                />
              )}

              {item.type === 'file_action' && item.fileAction && (
                <MobileFileActionCard
                  action={item.fileAction.action}
                  filePath={item.fileAction.path}
                  language={item.fileAction.language}
                  content={item.fileAction.content}
                  timestamp={formatTime(item.timestamp)}
                  onOpen={() => onOpenFile?.(item.fileAction!.path)}
                  onViewFull={() => onViewFileFull?.(item.fileAction!.path)}
                />
              )}

              {item.type === 'status' && (
                <MobileBuildMessageCard
                  type="status"
                  content={item.message || ''}
                  timestamp={formatTime(item.timestamp)}
                />
              )}
            </div>
          ))}

          {/* Processing indicator at end */}
          {isProcessing && (
            <MobileProcessingIndicator message={processingMessage} />
          )}
        </>
      )}
    </div>
  );
}

/**
 * UserPromptCard - Displays user's prompt in the feed
 */
function UserPromptCard({ prompt, timestamp }: { prompt: string; timestamp: string }) {
  return (
    <div className="flex gap-3 justify-end">
      <div className="max-w-[85%] flex flex-col items-end">
        <div className="px-4 py-3 rounded-2xl rounded-tr-md bg-violet-600 text-white">
          <p className="text-sm leading-relaxed">{prompt}</p>
        </div>
        <span className="text-[10px] text-gray-600 mt-1 mr-1">{timestamp}</span>
      </div>
    </div>
  );
}

/**
 * EmptyState - Shown when no activity yet
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-12 px-6 text-center">
      <div className="size-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-4">
        <Sparkles className="size-8 text-violet-400" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">
        Ready to build
      </h3>
      <p className="text-sm text-gray-500 max-w-[280px]">
        Describe what you want to create and I'll generate the code for you. All changes will appear here.
      </p>
      
      {/* Quick suggestions */}
      <div className="flex flex-wrap justify-center gap-2 mt-6">
        {['Build a landing page', 'Create a dashboard', 'Make a todo app'].map((suggestion) => (
          <span
            key={suggestion}
            className="px-3 py-1.5 rounded-full bg-white/[0.06] text-xs text-gray-400 border border-white/[0.08]"
          >
            {suggestion}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Helper to convert pipeline messages to feed items
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
