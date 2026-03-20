import { useState } from 'react';
import { FileCode, FileType, FileJson, ChevronDown, ChevronRight, Paperclip, Send, Sparkles, Bot, Circle } from 'lucide-react';

/* ── File Change Card ─────────────────────────────────── */
function FileChangeCard({ name, additions, color, icon }: { name: string; additions: number; color: string; icon: React.ReactNode }) {
  return (
    <div className="ai-file-card">
      <div className="ai-file-card-left">
        {icon}
        <span className="ai-file-card-name" style={{ color }}>{name}</span>
      </div>
      <span className="ai-file-card-diff">+{additions}</span>
    </div>
  );
}

/* ── Code Preview Block ────────────────────────────────── */
function CodePreviewBlock() {
  const lines = [
    { num: 37, tokens: [{ text: 'SEDAN', cls: 'tok-keyword' }, { text: ': {', cls: 'tok-default' }] },
    { num: 38, tokens: [{ text: '  name', cls: 'tok-prop' }, { text: ": '", cls: 'tok-default' }, { text: 'Phantom', cls: 'tok-string' }, { text: "',", cls: 'tok-default' }] },
    { num: 39, tokens: [{ text: '  speed', cls: 'tok-prop' }, { text: ': ', cls: 'tok-default' }, { text: '80', cls: 'tok-number' }, { text: ',', cls: 'tok-default' }] },
    { num: 40, tokens: [{ text: '  durability', cls: 'tok-prop' }, { text: ': ', cls: 'tok-default' }, { text: '100', cls: 'tok-number' }, { text: ',', cls: 'tok-default' }] },
    { num: 41, tokens: [{ text: '  price', cls: 'tok-prop' }, { text: ': ', cls: 'tok-default' }, { text: '15000', cls: 'tok-number' }, { text: ',', cls: 'tok-default' }] },
    { num: 42, tokens: [{ text: '  color', cls: 'tok-prop' }, { text: ': ', cls: 'tok-default' }, { text: '0x222222', cls: 'tok-number' }, { text: ',', cls: 'tok-default' }] },
    { num: 43, tokens: [{ text: '},', cls: 'tok-default' }] },
    { num: 44, tokens: [{ text: 'MUSCLE', cls: 'tok-keyword' }, { text: ': {', cls: 'tok-default' }] },
    { num: 45, tokens: [{ text: '  name', cls: 'tok-prop' }, { text: ": '", cls: 'tok-default' }, { text: 'Torque', cls: 'tok-string' }, { text: "',", cls: 'tok-default' }] },
    { num: 46, tokens: [{ text: '  speed', cls: 'tok-prop' }, { text: ': ', cls: 'tok-default' }, { text: '90', cls: 'tok-number' }, { text: ',', cls: 'tok-default' }] },
    { num: 47, tokens: [{ text: '  price', cls: 'tok-prop' }, { text: ': ', cls: 'tok-default' }, { text: '35000', cls: 'tok-number' }, { text: ',', cls: 'tok-default' }] },
    { num: 48, tokens: [{ text: '  color', cls: 'tok-prop' }, { text: ': ', cls: 'tok-default' }, { text: '0xff2200', cls: 'tok-number' }, { text: ',', cls: 'tok-default' }] },
    { num: 49, tokens: [{ text: '},', cls: 'tok-default' }] },
  ];
  return (
    <div className="ai-code-block">
      <div className="ai-code-header">
        <FileCode size={13} className="text-[#e5c07b]" />
        <span>constants.js</span>
      </div>
      <div className="ai-code-body">
        {lines.map(l => (
          <div key={l.num} className="ai-code-line">
            <span className="ai-code-num">{l.num}</span>
            <span className="ai-code-content">
              {l.tokens.map((t, i) => <span key={i} className={t.cls}>{t.text}</span>)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Todo Panel ───────────────────────────────────────── */
function TodoPanel() {
  const [open, setOpen] = useState(true);
  const todos = [
    { text: 'Build core 3D engine, city world, and district' },
    { text: 'Implement player controller, camera, and movement' },
    { text: 'Build vehicle system with 5 drivable vehicles' },
    { text: 'Create combat system (melee + ranged)' },
  ];
  return (
    <div className="ai-todo-panel">
      <button className="ai-todo-header" onClick={() => setOpen(o => !o)}>
        <span>Completing 0/14 todos</span>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {open && (
        <div className="ai-todo-list">
          <div className="ai-todo-group-header">Set up project scaffolding (Vite + Three.js + Tailwind)</div>
          {todos.map((t, i) => (
            <div key={i} className="ai-todo-item">
              <Circle size={14} className="ai-todo-circle" />
              <span>{t.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Prompt Composer ─────────────────────────────────── */
function PromptComposer() {
  const [input, setInput] = useState('');
  return (
    <div className="ai-composer">
      <div className="ai-composer-input-row">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Give Orchids a followup..."
          className="ai-composer-input"
          data-testid="ai-composer-input"
        />
      </div>
      <div className="ai-composer-controls">
        <div className="ai-composer-left">
          <div className="ai-composer-pill">
            <Bot size={13} className="text-[#6db3f2]" />
            <span>Agent</span>
            <ChevronDown size={12} />
          </div>
        </div>
        <div className="ai-composer-right">
          <div className="ai-composer-pill">
            <Sparkles size={13} className="text-[#e09932]" />
            <span>Claude Opus 4.6</span>
            <ChevronDown size={12} />
          </div>
          <button className="ai-composer-icon"><Paperclip size={15} /></button>
          <button className="ai-composer-send" data-testid="ai-composer-send" disabled={!input.trim()}>
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main AI Feed Panel ──────────────────────────────── */
export default function AIFeedPanel() {
  return (
    <div className="ai-feed-panel" data-testid="ai-feed-panel">
      <div className="ai-feed-scroll">
        {/* AI Response chip */}
        <div className="ai-response-chip">
          <span>My apologies, but I...</span>
        </div>

        {/* Uploaded prompt card */}
        <div className="ai-prompt-card">
          <div className="ai-prompt-card-icon">
            <FileCode size={16} className="text-[#6db3f2]" />
          </div>
          <div className="ai-prompt-card-body">
            <span className="ai-prompt-card-name">user_prompt-1774009597107.md</span>
            <span className="ai-prompt-card-desc">use the attached as the prompt</span>
          </div>
        </div>

        {/* File change cards */}
        <FileChangeCard name=".gitignore" additions={4} color="#d04747" icon={<FileType size={15} className="text-[#d04747]" />} />
        <FileChangeCard name="index.html" additions={23} color="#e09932" icon={<FileCode size={15} className="text-[#e09932]" />} />

        {/* Build narration */}
        <div className="ai-narration">
          <p className="ai-narration-cmd">
            Ran mkdir -p /home/user/app/src/&#123;engine,world,player,vehicles,com...
          </p>
          <p className="ai-narration-text">
            Now I'll build all the game systems. Let me write all the core files.
          </p>
        </div>

        {/* Code preview */}
        <CodePreviewBlock />

        {/* Todo panel */}
        <TodoPanel />
      </div>

      {/* Bottom prompt composer */}
      <PromptComposer />
    </div>
  );
}
