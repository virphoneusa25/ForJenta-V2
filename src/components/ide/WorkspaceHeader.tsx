import { ArrowLeft, Search, Github, Users, Globe, Rocket, MoreHorizontal, Columns2, PanelRight, PanelLeft, Monitor } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  projectName: string;
  activeTab: 'code' | 'app';
  onTabChange: (tab: 'code' | 'app') => void;
}

export default function WorkspaceHeader({ projectName, activeTab, onTabChange }: Props) {
  const navigate = useNavigate();

  return (
    <header className="ide-header" data-testid="workspace-header">
      {/* Left: back + project name */}
      <div className="ide-header-left">
        <button onClick={() => navigate('/workspace')} className="ide-header-icon" aria-label="Back">
          <ArrowLeft size={16} />
        </button>
        <span className="ide-header-project" title={projectName}>
          Project Name: {projectName}
        </span>
      </div>

      {/* Center-left: App / Code tabs */}
      <div className="ide-header-tabs">
        <button className="ide-header-icon" style={{ marginRight: 2 }}>
          <Monitor size={14} />
        </button>
        <button
          className={`ide-tab ${activeTab === 'app' ? 'ide-tab-active' : ''}`}
          onClick={() => onTabChange('app')}
        >App</button>
        <button
          className={`ide-tab ${activeTab === 'code' ? 'ide-tab-active' : ''}`}
          onClick={() => onTabChange('code')}
        >Code</button>
        <button className="ide-header-icon" style={{ marginLeft: 4, fontSize: 16 }}>+</button>
      </div>

      {/* Center: search bar */}
      <div className="ide-header-center">
        <div className="ide-search-bar">
          <Search size={13} className="ide-search-icon" />
          <span className="ide-search-placeholder">app</span>
        </div>
      </div>

      {/* Right: actions */}
      <div className="ide-header-right">
        <div className="ide-header-view-toggles">
          <Columns2 size={14} />
          <PanelRight size={14} />
          <PanelLeft size={14} />
          <Monitor size={14} />
        </div>
        <button className="ide-header-icon"><Github size={16} /></button>
        <button className="ide-header-icon"><Users size={16} /></button>
        <button className="ide-header-icon"><Globe size={16} /></button>
        <button className="ide-deploy-btn">
          <Rocket size={13} />
          <span>Deploy</span>
        </button>
        <button className="ide-header-icon"><MoreHorizontal size={16} /></button>
        <div className="ide-avatar" data-testid="ide-avatar">R</div>
      </div>
    </header>
  );
}
