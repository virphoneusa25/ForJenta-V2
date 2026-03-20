import Editor from '@monaco-editor/react';
import { FileCode } from 'lucide-react';

interface Props {
  activeFile: string | null;
}

// Mock file contents
const FILE_CONTENTS: Record<string, { content: string; language: string }> = {
  'index.html': {
    language: 'html',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AI-Powered Document Summarizer</title>
  <script type="module" src="/src/main.js"></script>
</head>
<body>
  <div id="app"></div>
</body>
</html>`,
  },
  '.gitignore': {
    language: 'plaintext',
    content: `node_modules/
dist/
.env
.DS_Store`,
  },
  'package.json': {
    language: 'json',
    content: `{
  "name": "ai-document-summarizer",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "three": "^0.162.0",
    "vite": "^5.0.0"
  }
}`,
  },
};

export default function EditorCanvas({ activeFile }: Props) {
  if (!activeFile || !FILE_CONTENTS[activeFile]) {
    return (
      <div className="ide-editor-empty" data-testid="editor-canvas">
        <div className="ide-editor-empty-icon">
          <FileCode size={80} strokeWidth={0.8} />
        </div>
      </div>
    );
  }

  const { content, language } = FILE_CONTENTS[activeFile];

  return (
    <div className="ide-editor-active" data-testid="editor-canvas">
      <div className="ide-editor-tab-bar">
        <div className="ide-editor-tab ide-editor-tab-active">
          <span>{activeFile.split('/').pop()}</span>
        </div>
      </div>
      <Editor
        height="100%"
        language={language}
        value={content}
        theme="vs-dark"
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
        }}
      />
    </div>
  );
}
