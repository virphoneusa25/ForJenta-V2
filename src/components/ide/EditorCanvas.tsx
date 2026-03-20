import Editor from '@monaco-editor/react';
import { FileCode, X } from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspaceStore';

interface Props {
  activeFile: string | null;
}

function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    html: 'html', htm: 'html', css: 'css',
    js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    json: 'json', md: 'markdown', py: 'python', svg: 'xml', txt: 'plaintext',
  };
  return map[ext] || 'plaintext';
}

function getShortName(path: string): string {
  return path.split('/').pop() || path;
}

export default function EditorCanvas({ activeFile }: Props) {
  const { files, openTabs, selectFile, closeTab, updateFileContent } = useWorkspaceStore();

  const currentFile = activeFile ? files.find(f => f.path === activeFile) : null;

  if (!activeFile || !currentFile) {
    return (
      <div className="ide-editor-empty" data-testid="editor-canvas">
        <div className="ide-editor-empty-icon">
          <FileCode size={80} strokeWidth={0.8} />
        </div>
        <p className="text-[#3a3d44] text-sm mt-2">Select a file to edit</p>
      </div>
    );
  }

  const language = getLanguageFromPath(activeFile);

  return (
    <div className="ide-editor-active" data-testid="editor-canvas">
      {/* Tab bar */}
      <div className="ide-editor-tab-bar">
        {openTabs.map(tabPath => (
          <div
            key={tabPath}
            className={`ide-editor-tab ${tabPath === activeFile ? 'ide-editor-tab-active' : ''}`}
            onClick={() => selectFile(tabPath)}
            data-testid={`editor-tab-${getShortName(tabPath)}`}
          >
            <span>{getShortName(tabPath)}</span>
            <button
              className="ide-tab-close"
              onClick={(e) => { e.stopPropagation(); closeTab(tabPath); }}
              data-testid={`close-tab-${getShortName(tabPath)}`}
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
      {/* Monaco Editor */}
      <Editor
        height="100%"
        language={language}
        value={currentFile.content}
        theme="vs-dark"
        onChange={(value) => {
          if (value !== undefined) {
            updateFileContent(activeFile, value);
          }
        }}
        options={{
          readOnly: false,
          minimap: { enabled: false },
          fontSize: 13,
          lineHeight: 20,
          fontFamily: "'Fira Code', 'Consolas', 'Courier New', monospace",
          scrollBeyondLastLine: false,
          renderLineHighlight: 'line',
          padding: { top: 8 },
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          overviewRulerBorder: false,
          scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
          automaticLayout: true,
        }}
      />
    </div>
  );
}
