import { useWorkspaceStore } from '@/stores/workspaceStore';
import { Monitor, RefreshCw } from 'lucide-react';

export default function PreviewPane() {
  const { previewHtml, files, buildPreviewHtml } = useWorkspaceStore();

  if (!previewHtml) {
    return (
      <div className="ide-editor-empty" data-testid="preview-pane-empty">
        <div className="ide-editor-empty-icon">
          <Monitor size={80} strokeWidth={0.8} />
        </div>
        <p className="text-[#3a3d44] text-sm mt-2">
          {files.length === 0
            ? 'Generate code first to see a preview'
            : 'No index.html found for preview'}
        </p>
      </div>
    );
  }

  const blob = new Blob([previewHtml], { type: 'text/html' });
  const blobUrl = URL.createObjectURL(blob);

  return (
    <div className="ide-preview-pane" data-testid="preview-pane">
      <div className="ide-preview-toolbar">
        <span className="text-[#8b93a1] text-xs">Live Preview</span>
        <button
          className="ide-header-icon"
          onClick={buildPreviewHtml}
          title="Refresh preview"
          data-testid="preview-refresh-btn"
        >
          <RefreshCw size={13} />
        </button>
      </div>
      <iframe
        src={blobUrl}
        className="ide-preview-iframe"
        title="App Preview"
        sandbox="allow-scripts allow-same-origin"
        data-testid="preview-iframe"
      />
    </div>
  );
}
