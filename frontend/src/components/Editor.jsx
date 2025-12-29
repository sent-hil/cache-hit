import { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';

const INITIAL_CODE = `# Write your Python code here and press Cmd+Enter to run
`;

export const CodeEditor = ({ value, onChange, onRun }) => {
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

  return (
    <div className="h-full w-full">
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
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
        }}
      />
    </div>
  );
};
