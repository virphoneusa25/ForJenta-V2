import { Terminal, Plus } from 'lucide-react';

interface Props {
  expanded: boolean;
  onToggle: () => void;
}

export default function BottomTerminalDock({ expanded, onToggle }: Props) {
  return (
    <div className={`ide-terminal-dock ${expanded ? 'ide-terminal-expanded' : ''}`} data-testid="terminal-dock">
      {expanded && (
        <div className="ide-terminal-content">
          <div className="ide-terminal-tabs">
            <button className="ide-terminal-tab ide-terminal-tab-active">
              <Terminal size={13} />
              <span>Terminal</span>
            </button>
            <button className="ide-terminal-tab-add"><Plus size={13} /></button>
          </div>
          <div className="ide-terminal-body">
            <div className="ide-terminal-line">
              <span className="text-[#98c379]">user@app</span>
              <span className="text-[#c1c1c1]">:</span>
              <span className="text-[#6db3f2]">~/project</span>
              <span className="text-[#c1c1c1]">$ npm run dev</span>
            </div>
            <div className="ide-terminal-line text-[#8b93a1]">
              VITE v5.0.0  ready in 243 ms
            </div>
            <div className="ide-terminal-line text-[#8b93a1]">
              ➜  Local: http://localhost:5173/
            </div>
          </div>
        </div>
      )}
      {!expanded && (
        <div className="ide-terminal-collapsed" onClick={onToggle}>
          <Terminal size={13} className="text-[#8b93a1]" />
          <span className="text-[11px] text-[#8b93a1]">Terminal</span>
        </div>
      )}
    </div>
  );
}
