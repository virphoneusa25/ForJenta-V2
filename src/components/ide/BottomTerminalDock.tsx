import { Terminal, Plus } from 'lucide-react';
import { useWorkspaceStore, type TerminalLine } from '@/stores/workspaceStore';
import { useEffect, useRef } from 'react';

interface Props {
  expanded: boolean;
  onToggle: () => void;
}

function getLineColor(type: TerminalLine['type']): string {
  switch (type) {
    case 'success': return '#98c379';
    case 'error': return '#d04747';
    case 'command': return '#6db3f2';
    default: return '#8b93a1';
  }
}

export default function BottomTerminalDock({ expanded, onToggle }: Props) {
  const { terminalLines } = useWorkspaceStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [terminalLines]);

  return (
    <div className={`ide-terminal-dock ${expanded ? 'ide-terminal-expanded' : ''}`} data-testid="terminal-dock">
      {expanded && (
        <div className="ide-terminal-content">
          <div className="ide-terminal-tabs">
            <button className="ide-terminal-tab ide-terminal-tab-active" onClick={onToggle}>
              <Terminal size={13} />
              <span>Terminal</span>
            </button>
            <button className="ide-terminal-tab-add"><Plus size={13} /></button>
          </div>
          <div className="ide-terminal-body" ref={scrollRef}>
            {terminalLines.length === 0 ? (
              <div className="ide-terminal-line text-[#8b93a1]">
                Ready. Use the AI panel to generate code.
              </div>
            ) : (
              terminalLines.map((line, i) => (
                <div key={i} className="ide-terminal-line" style={{ color: getLineColor(line.type) }}>
                  {line.type === 'command' && <span className="text-[#98c379] mr-1">$</span>}
                  {line.text}
                </div>
              ))
            )}
          </div>
        </div>
      )}
      {!expanded && (
        <div className="ide-terminal-collapsed" onClick={onToggle}>
          <Terminal size={13} className="text-[#8b93a1]" />
          <span className="text-[11px] text-[#8b93a1]">Terminal ({terminalLines.length})</span>
        </div>
      )}
    </div>
  );
}
