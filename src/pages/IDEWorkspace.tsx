import { useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
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
  const initCalledFor = useRef<string | null>(null);

  const projectName = useWorkspaceStore(s => s.projectName);
  const projectLoading = useWorkspaceStore(s => s.projectLoading);
  const fileTree = useWorkspaceStore(s => s.fileTree);
  const activeFile = useWorkspaceStore(s => s.activeFile);
  const activeView = useWorkspaceStore(s => s.activeView);
  const terminalExpanded = useWorkspaceStore(s => s.terminalExpanded);
  const files = useWorkspaceStore(s => s.files);
  const initProject = useWorkspaceStore(s => s.initProject);
  const selectFile = useWorkspaceStore(s => s.selectFile);
  const toggleTerminal = useWorkspaceStore(s => s.toggleTerminal);
  const setActiveView = useWorkspaceStore(s => s.setActiveView);
  const reset = useWorkspaceStore(s => s.reset);

  // Init ONCE per project id. Ref prevents double-fire from strict mode / HMR.
  useEffect(() => {
    if (!id) return;
    if (initCalledFor.current === id) return;
    initCalledFor.current = id;
    reset();
    initProject(id);
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
          <Panel defaultSize={30} minSize={20} maxSize={45}>
            <AIFeedPanel />
          </Panel>
          <PanelResizeHandle className="ide-resize-handle" />
          <Panel defaultSize={22} minSize={14} maxSize={35}>
            <div className="ide-center-col">
              <ActivityBar />
              <ExplorerPanel files={fileTree} activeFile={activeFile} onFileSelect={handleFileSelect} />
            </div>
          </Panel>
          <PanelResizeHandle className="ide-resize-handle" />
          <Panel defaultSize={48} minSize={30}>
            <div className="ide-right-col">
              <div className="ide-editor-area">
                {activeView === 'code' ? <EditorCanvas activeFile={activeFile} /> : <PreviewPane />}
              </div>
              <BottomTerminalDock expanded={terminalExpanded} onToggle={toggleTerminal} />
            </div>
          </Panel>
        </PanelGroup>
      </div>
      <div className="ide-global-status-bar">
        <div className="ide-status-left">
          <div className="ide-status-item"><GitBranch size={13} /><span>master</span></div>
          <Lock size={12} className="text-[#8b93a1]" />
        </div>
        <div className="ide-status-center">
          <div className="ide-status-item text-[#d04747]"><XCircle size={12} /><span>0</span></div>
          <div className="ide-status-item text-[#e09932]"><AlertTriangle size={12} /><span>0</span></div>
          <div className="ide-status-item text-[#98c379]"><CheckCircle size={12} /><span>{files.length}</span></div>
        </div>
        <div className="ide-status-right">
          <span className="ide-status-item text-[#8b93a1]">{files.length} files</span>
          <Bell size={12} className="text-[#8b93a1]" />
        </div>
      </div>
    </div>
  );
}
