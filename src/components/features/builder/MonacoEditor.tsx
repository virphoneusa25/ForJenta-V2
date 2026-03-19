import { useRef, useEffect, useCallback } from 'react';
import Editor, { type OnMount, type OnChange } from '@monaco-editor/react';
import { Loader2 } from 'lucide-react';

interface MonacoEditorProps {
  value: string;
  language: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  readOnly?: boolean;
}

const LANG_MAP: Record<string, string> = {
  javascript: 'javascript',
  typescript: 'typescript',
  html: 'html',
  css: 'css',
  json: 'json',
  markdown: 'markdown',
  python: 'python',
  text: 'plaintext',
};

export default function MonacoEditor({ value, language, onChange, onSave, readOnly }: MonacoEditorProps) {
  const editorRef = useRef<any>(null);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Define custom dark theme matching our UI
    monaco.editor.defineTheme('forjenta-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'c084fc' },
        { token: 'string', foreground: '86efac' },
        { token: 'number', foreground: 'fbbf24' },
        { token: 'type', foreground: '67e8f9' },
        { token: 'function', foreground: '93c5fd' },
        { token: 'variable', foreground: 'e5e7eb' },
        { token: 'tag', foreground: 'f87171' },
        { token: 'attribute.name', foreground: 'fbbf24' },
        { token: 'attribute.value', foreground: '86efac' },
        { token: 'delimiter', foreground: '9ca3af' },
      ],
      colors: {
        'editor.background': '#09090b',
        'editor.foreground': '#e5e7eb',
        'editor.lineHighlightBackground': '#ffffff08',
        'editor.selectionBackground': '#7c3aed33',
        'editor.inactiveSelectionBackground': '#7c3aed1a',
        'editorLineNumber.foreground': '#4b5563',
        'editorLineNumber.activeForeground': '#9ca3af',
        'editorCursor.foreground': '#a78bfa',
        'editor.selectionHighlightBackground': '#7c3aed1a',
        'editorBracketMatch.background': '#7c3aed22',
        'editorBracketMatch.border': '#7c3aed55',
        'editorIndentGuide.background': '#ffffff08',
        'editorIndentGuide.activeBackground': '#ffffff15',
        'editorGutter.background': '#09090b',
        'minimap.background': '#09090b',
        'scrollbarSlider.background': '#ffffff15',
        'scrollbarSlider.hoverBackground': '#ffffff25',
        'scrollbarSlider.activeBackground': '#ffffff30',
      },
    });

    monaco.editor.setTheme('forjenta-dark');

    // Register Ctrl+S / Cmd+S keybinding
    if (onSave) {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        onSave();
      });
    }

    // Focus the editor
    editor.focus();
  };

  const handleChange: OnChange = useCallback(
    (val) => {
      if (val !== undefined) onChange(val);
    },
    [onChange]
  );

  // Update editor value if external value changes (e.g. switching files)
  useEffect(() => {
    if (editorRef.current) {
      const currentVal = editorRef.current.getValue();
      if (currentVal !== value) {
        editorRef.current.setValue(value);
      }
    }
  }, [value]);

  const monacoLang = LANG_MAP[language] || 'plaintext';

  return (
    <Editor
      height="100%"
      language={monacoLang}
      value={value}
      onChange={handleChange}
      onMount={handleMount}
      loading={
        <div className="flex h-full items-center justify-center bg-zinc-950">
          <Loader2 className="size-6 text-violet-400 animate-spin" />
        </div>
      }
      options={{
        fontSize: 13,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
        fontLigatures: true,
        lineHeight: 22,
        tabSize: 2,
        minimap: { enabled: true, maxColumn: 80, renderCharacters: false },
        scrollBeyondLastLine: false,
        renderLineHighlight: 'line',
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        smoothScrolling: true,
        bracketPairColorization: { enabled: true },
        matchBrackets: 'always',
        autoClosingBrackets: 'always',
        autoClosingQuotes: 'always',
        autoIndent: 'full',
        formatOnPaste: true,
        wordWrap: 'on',
        padding: { top: 12, bottom: 12 },
        readOnly,
        domReadOnly: readOnly,
        quickSuggestions: true,
        suggestOnTriggerCharacters: true,
        parameterHints: { enabled: true },
        folding: true,
        foldingStrategy: 'indentation',
        showFoldingControls: 'mouseover',
        renderWhitespace: 'selection',
        guides: { indentation: true, bracketPairs: true },
        overviewRulerBorder: false,
        hideCursorInOverviewRuler: true,
        scrollbar: {
          verticalScrollbarSize: 6,
          horizontalScrollbarSize: 6,
          vertical: 'auto',
          horizontal: 'auto',
        },
      }}
    />
  );
}
