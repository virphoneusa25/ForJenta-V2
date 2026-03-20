import { Files, Search, GitBranch, Bug, Blocks, User, Settings } from 'lucide-react';
import { useState } from 'react';

const TOP_ICONS = [
  { icon: Files, label: 'Explorer', id: 'explorer' },
  { icon: Search, label: 'Search', id: 'search' },
  { icon: GitBranch, label: 'Source Control', id: 'scm' },
  { icon: Bug, label: 'Run & Debug', id: 'debug' },
  { icon: Blocks, label: 'Extensions', id: 'extensions' },
];

const BOTTOM_ICONS = [
  { icon: User, label: 'Account', id: 'account' },
  { icon: Settings, label: 'Settings', id: 'settings' },
];

export default function ActivityBar() {
  const [active, setActive] = useState('explorer');

  return (
    <div className="ide-activity-bar" data-testid="activity-bar">
      <div className="ide-activity-top">
        {TOP_ICONS.map(({ icon: Icon, label, id }) => (
          <button
            key={id}
            className={`ide-activity-icon ${active === id ? 'ide-activity-icon-active' : ''}`}
            onClick={() => setActive(id)}
            title={label}
            aria-label={label}
          >
            <Icon size={22} />
          </button>
        ))}
      </div>
      <div className="ide-activity-bottom">
        {BOTTOM_ICONS.map(({ icon: Icon, label, id }) => (
          <button key={id} className="ide-activity-icon" title={label} aria-label={label}>
            <Icon size={22} />
          </button>
        ))}
      </div>
    </div>
  );
}
