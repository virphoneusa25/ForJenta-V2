import { useState } from 'react';
import { ChevronDown, Plus, Check } from 'lucide-react';

interface Workspace {
  id: string;
  name: string;
  emoji: string;
}

const workspaces: Workspace[] = [
  { id: 'personal', name: 'Personal', emoji: '👤' },
  { id: 'team', name: 'Team Projects', emoji: '👥' },
];

export default function WorkspaceSwitcher() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(workspaces[0]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-white/5"
      >
        <span className="flex size-7 items-center justify-center rounded-md bg-white/5 text-sm">
          {active.emoji}
        </span>
        <span className="flex-1 truncate text-sm font-medium text-white">
          {active.name}
        </span>
        <ChevronDown
          className={`size-3.5 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-white/10 bg-zinc-900/95 p-1.5 shadow-2xl backdrop-blur-xl animate-fade-in">
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => { setActive(ws); setOpen(false); }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-white/5"
            >
              <span className="text-sm">{ws.emoji}</span>
              <span className="flex-1 text-gray-200">{ws.name}</span>
              {active.id === ws.id && <Check className="size-3.5 text-violet-400" />}
            </button>
          ))}
          <div className="my-1 h-px bg-white/5" />
          <button className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-gray-400 transition-colors hover:bg-white/5 hover:text-white">
            <Plus className="size-3.5" />
            New workspace
          </button>
        </div>
      )}
    </div>
  );
}
