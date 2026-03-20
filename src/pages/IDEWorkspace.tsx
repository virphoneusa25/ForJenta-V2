import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { GitBranch, Lock, XCircle, AlertTriangle, CheckCircle, Bell } from 'lucide-react';
import WorkspaceHeader from '@/components/ide/WorkspaceHeader';
import AIFeedPanel from '@/components/ide/AIFeedPanel';
import ActivityBar from '@/components/ide/ActivityBar';
import ExplorerPanel from '@/components/ide/ExplorerPanel';
import EditorCanvas from '@/components/ide/EditorCanvas';
import BottomTerminalDock from '@/components/ide/BottomTerminalDock';

export default function IDEWorkspace() {
  const { id } = useParams<{ id: string }>();
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'code' | 'app'>('code');
  const [terminalExpanded, setTerminalExpanded] = useState(false);

  const handleFileSelect = useCallback((path: string) => {
    setActiveFile(path);
  }, []);

  // Mock project files matching the screenshot
  const projectFiles = [
    { path: '.orchids', type: 'folder' as const, children: [] },
    { path: 'node_modules', type: 'folder' as const, children: [] },
    { path: 'src', type: 'folder' as const, children: [
      { path: 'src/engine', type: 'folder' as const, children: [] },
      { path: 'src/world', type: 'folder' as const, children: [] },
      { path: 'src/player', type: 'folder' as const, children: [] },
      { path: 'src/vehicles', type: 'folder' as const, children: [] },
    ]},
    { path: '.gitignore', type: 'file' as const, language: 'git' },
    { path: 'index.html', type: 'file' as const, language: 'html' },
    { path: 'package-lock.json', type: 'file' as const, language: 'json' },
    { path: 'package.json', type: 'file' as const, language: 'json' },
  ];

  return (
    <div className="ide-shell" data-testid="ide-workspace">
      <WorkspaceHeader
        projectName="AI-Powered Document Summari..."
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      <div className="ide-main">
        <PanelGroup direction="horizontal" autoSaveId="ide-layout">
          {/* Left AI Feed Panel */}
          <Panel defaultSize={30} minSize={20} maxSize={45}>
            <AIFeedPanel />
          </Panel>
          <PanelResizeHandle className="ide-resize-handle" />
          {/* Center: Activity Bar + Explorer */}
          <Panel defaultSize={22} minSize={14} maxSize={35}>
            <div className="ide-center-col">
              <ActivityBar />
              <ExplorerPanel
                files={projectFiles}
                activeFile={activeFile}
                onFileSelect={handleFileSelect}
              />
            </div>
          </Panel>
          <PanelResizeHandle className="ide-resize-handle" />
          {/* Right: Editor + Terminal */}
          <Panel defaultSize={48} minSize={30}>
            <div className="ide-right-col">
              <div className="ide-editor-area">
                <EditorCanvas activeFile={activeFile} />
              </div>
              <BottomTerminalDock
                expanded={terminalExpanded}
                onToggle={() => setTerminalExpanded(e => !e)}
              />
            </div>
          </Panel>
        </PanelGroup>
      </div>
      {/* Global Status Bar */}
      <div className="ide-global-status-bar">
        <div className="ide-status-left">
          <div className="ide-status-item">
            <GitBranch size={13} />
            <span>master</span>
          </div>
          <Lock size={12} className="text-[#8b93a1]" />
        </div>
        <div className="ide-status-center">
          <div className="ide-status-item text-[#d04747]">
            <XCircle size={12} />
            <span>0</span>
          </div>
          <div className="ide-status-item text-[#e09932]">
            <AlertTriangle size={12} />
            <span>0</span>
          </div>
          <div className="ide-status-item text-[#98c379]">
            <CheckCircle size={12} />
            <span>1</span>
          </div>
        </div>
        <div className="ide-status-right">
          <span className="ide-status-item text-[#8b93a1]">Layout: US</span>
          <Bell size={12} className="text-[#8b93a1]" />
        </div>
      </div>
    </div>
  );
}
