import { useState, useRef, useEffect } from 'react';
import { FileCode, Send, Bot, Loader2, RotateCcw, Star, AlertCircle } from 'lucide-react';
import { useWorkspaceStore, type ChatMessage } from '@/stores/workspaceStore';
import type { ModelConfig } from '@/lib/modelConfig';

/* ── File Change Card ─────────────────────────────────── */
function FileChangeCard({ name, action }: { name: string; action: 'created' | 'updated' }) {
  const isNew = action === 'created';
  return (
    <div className="ai-file-card" data-testid={`file-change-${name}`}>
      <div className="ai-file-card-left">
        <FileCode size={15} className={isNew ? 'text-[#98c379]' : 'text-[#e09932]'} />
        <span className="ai-file-card-name" style={{ color: isNew ? '#98c379' : '#e09932' }}>{name}</span>
      </div>
      <span className="ai-file-card-diff" style={{ color: isNew ? '#98c379' : '#e09932' }}>
        {isNew ? 'new' : 'modified'}
      </span>
    </div>
  );
}

/* ── Error Card with Retry ────────────────────────────── */
function ErrorCard({ message }: { message: ChatMessage }) {
  const { retryLastPrompt } = useWorkspaceStore();
  const codeLabel = message.errorCode ? ` (${message.errorCode})` : '';
  return (
    <div className="ai-error-card" data-testid="chat-error-message">
      <div className="ai-error-card-header">
        <AlertCircle size={14} className="text-[#d04747]" />
        <span className="text-[#d04747] text-xs font-medium">Generation Failed{codeLabel}</span>
      </div>
      <p className="ai-error-card-text">{message.content}</p>
      {message.retryPrompt && (
        <button className="ai-retry-btn" onClick={retryLastPrompt} data-testid="retry-generation-btn">
          <RotateCcw size={12} />
          <span>Retry with provider</span>
        </button>
      )}
    </div>
  );
}

/* ── Message Bubble ─────────────────────────────────── */
function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <div className="ai-prompt-card" data-testid="chat-user-message">
        <div className="ai-prompt-card-icon">
          <FileCode size={16} className="text-[#6db3f2]" />
        </div>
        <div className="ai-prompt-card-body">
          <span className="ai-prompt-card-desc">{message.content}</span>
        </div>
      </div>
    );
  }

  if (message.isError) {
    return <ErrorCard message={message} />;
  }

  return (
    <div className="ai-assistant-message" data-testid="chat-assistant-message">
      <div className="ai-narration">
        <p className="ai-narration-text">{message.content}</p>
      </div>
      {message.files && message.files.length > 0 && (
        <div className="ai-file-changes">
          {message.files.map(f => (
            <FileChangeCard key={f.path} name={f.path} action={f.action} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Generation Progress ─────────────────────────────── */
function GeneratingIndicator({ progress }: { progress: string }) {
  return (
    <div className="ai-generating" data-testid="ai-generating">
      <div className="ai-generating-spinner">
        <Loader2 size={16} className="animate-spin text-[#6db3f2]" />
        <span className="text-[#8b93a1] text-xs">{progress || 'Generating...'}</span>
      </div>
    </div>
  );
}

/* ── Prompt Composer ─────────────────────────────────── */
function PromptComposer() {
  const [input, setInput] = useState('');
  const { sendPrompt, generating, selectedModel } = useWorkspaceStore();

  const handleSend = () => {
    if (!input.trim() || generating) return;
    sendPrompt(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="ai-composer">
      <div className="ai-composer-input-row">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe what to build or change..."
          className="ai-composer-input"
          data-testid="ai-composer-input"
          disabled={generating}
        />
      </div>
      <div className="ai-composer-controls">
        <div className="ai-composer-left">
          <div className="ai-composer-pill">
            <Bot size={13} className="text-[#6db3f2]" />
            <span>Agent</span>
          </div>
        </div>
        <div className="ai-composer-right">
          <div className="ai-composer-pill" data-testid="model-selector">
            <Star size={13} className="text-[#e09932]" />
            <span>{selectedModel.providerLabel} — {selectedModel.modelLabel}</span>
          </div>
          <button className="ai-composer-send" data-testid="ai-composer-send" disabled={!input.trim() || generating} onClick={handleSend}>
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main AI Feed Panel ──────────────────────────────── */
export default function AIFeedPanel() {
  const { messages, generating, generationProgress, regenerate, activeProjectPrompt } = useWorkspaceStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, generating]);

  const hasMessages = messages.length > 0;
  const lastMsgIsAssistant = hasMessages && messages[messages.length - 1].role === 'assistant' && !messages[messages.length - 1].isError;

  return (
    <div className="ai-feed-panel" data-testid="ai-feed-panel">
      <div className="ai-feed-scroll" ref={scrollRef}>
        {!hasMessages && !generating && (
          <div className="ai-feed-empty">
            <Bot size={32} className="text-[#3a3d44] mb-2" />
            <p className="text-[#8b93a1] text-xs text-center">
              Describe your app or ask for changes.<br />
              ForJenta will generate the code.
            </p>
          </div>
        )}

        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {generating && <GeneratingIndicator progress={generationProgress} />}

        {/* Regenerate button after successful generation */}
        {lastMsgIsAssistant && !generating && (
          <div className="ai-regen-row">
            <button className="ai-regen-btn" onClick={regenerate} data-testid="regenerate-btn">
              <RotateCcw size={12} />
              <span>Regenerate</span>
            </button>
          </div>
        )}
      </div>

      <PromptComposer />
    </div>
  );
}
