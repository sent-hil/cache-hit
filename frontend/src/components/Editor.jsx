import { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';

const INITIAL_CODE = `# Write your Python code here and press Cmd+Enter to run
`;

export const CodeEditor = ({ value, onChange, onRun, backendAvailable }) => {
  const editorRef = useRef(null);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    // Define custom GitHub-style dark theme
    monaco.editor.defineTheme('github-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '8b949e', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'ff7b72' },
        { token: 'string', foreground: 'a5d6ff' },
        { token: 'number', foreground: '79c0ff' },
        { token: 'function', foreground: 'd2a8ff' },
        { token: 'variable', foreground: '79c0ff' },
      ],
      colors: {
        'editor.background': '#0d1117',
        'editor.foreground': '#c9d1d9',
        'editorLineNumber.foreground': '#484f58',
        'editorLineNumber.activeForeground': '#8b949e',
        'editor.lineHighlightBackground': '#161b22',
        'editorCursor.foreground': '#c9d1d9',
        'editor.selectionBackground': '#264f78',
        'editor.inactiveSelectionBackground': '#264f78',
      },
    });

    // Set the custom theme
    monaco.editor.setTheme('github-dark');

    // Add Cmd/Ctrl+Enter keybinding
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      if (onRun) {
        // Get the current value directly from the editor to avoid stale closure
        const currentCode = editor.getValue();
        onRun(currentCode);
      }
    });

    // Configure Python language features
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });
  };

  const handleRunClick = () => {
    if (onRun && editorRef.current) {
      const currentCode = editorRef.current.getValue();
      onRun(currentCode);
    }
  };

  return (
    <div className="h-full w-full relative group">
      <Editor
        height="100%"
        defaultLanguage="python"
        value={value || INITIAL_CODE}
        onChange={onChange}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: 'JetBrains Mono, monospace',
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 4,
          insertSpaces: true,
          wordWrap: 'on',
          quickSuggestions: true,
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnCommitCharacter: true,
          snippetSuggestions: 'inline',
          padding: { top: 16, bottom: 16 },
          scrollbar: {
            vertical: 'visible',
            horizontal: 'visible',
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
          },
        }}
      />
      <div className="absolute top-4 right-4 opacity-100 transition-opacity">
        <button
          onClick={handleRunClick}
          disabled={!backendAvailable}
          className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/40 hover:border-primary px-3 py-1.5 shadow-glow transition-all active:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-[16px]">play_arrow</span>
          <span className="text-xs font-bold uppercase tracking-wider">Run</span>
        </button>
      </div>
    </div>
  );
};
