import { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { GitBranch, Lock, XCircle, AlertTriangle, CheckCircle, Bell } from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import WorkspaceHeader from '@/components/ide/WorkspaceHeader';
import AIFeedPanel from '@/components/ide/AIFeedPanel';
import ActivityBar from '@/components/ide/ActivityBar';
import ExplorerPanel from '@/components/ide/ExplorerPanel';
import EditorCanvas from '@/components/ide/EditorCanvas';
import BottomTerminalDock from '@/components/ide/BottomTerminalDock';
import PreviewPane from '@/components/ide/PreviewPane';

export default function IDEWorkspace() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    projectName,
    projectLoading,
    fileTree,
    activeFile,
    activeView,
    terminalExpanded,
    files,
    loadProject,
    selectFile,
    toggleTerminal,
    setActiveView,
    reset,
  } = useWorkspaceStore();

  useEffect(() => {
    if (id) {
      reset();
      loadProject(id);
    }
    return () => { reset(); };
  }, [id]);

  const handleFileSelect = useCallback((path: string) => {
    selectFile(path);
  }, [selectFile]);

  if (projectLoading) {
    return (
      <div className="ide-shell" data-testid="ide-workspace-loading">
        <div className="flex items-center justify-center h-screen bg-[#1a1b1e]">
          <div className="flex flex-col items-center gap-3">
            <div className="size-8 rounded-full border-2 border-white/10 border-t-[#6db3f2] animate-spin" />
            <span className="text-sm text-[#8b93a1]">Loading project...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ide-shell" data-testid="ide-workspace">
      <WorkspaceHeader
        projectName={projectName || 'Untitled Project'}
        activeTab={activeView}
        onTabChange={setActiveView}
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
                files={fileTree}
                activeFile={activeFile}
                onFileSelect={handleFileSelect}
              />
            </div>
          </Panel>
          <PanelResizeHandle className="ide-resize-handle" />
          {/* Right: Editor/Preview + Terminal */}
          <Panel defaultSize={48} minSize={30}>
            <div className="ide-right-col">
              <div className="ide-editor-area">
                {activeView === 'code' ? (
                  <EditorCanvas activeFile={activeFile} />
                ) : (
                  <PreviewPane />
                )}
              </div>
              <BottomTerminalDock
                expanded={terminalExpanded}
                onToggle={toggleTerminal}
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
            <span>{files.length}</span>
          </div>
        </div>
        <div className="ide-status-right">
          <span className="ide-status-item text-[#8b93a1]">{files.length} files</span>
          <Bell size={12} className="text-[#8b93a1]" />
        </div>
      </div>
    </div>
  );
}
