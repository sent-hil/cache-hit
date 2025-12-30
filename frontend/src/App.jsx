import { useState, useEffect } from 'react';
import { QuestionPane } from './components/QuestionPane';
import { EditorOutputPane } from './components/EditorOutputPane';
import { Footer } from './components/Footer';
import { SplitPane } from './components/SplitPane';
import { BackendStatus } from './components/BackendStatus';
import { useBackendHealth } from './hooks/useBackendHealth';
import { useCodeExecution } from './hooks/useCodeExecution';

function App() {
  const [code, setCode] = useState('# Write your Python code here and press Cmd+Enter to run\n');
  const { available: backendAvailable, checking, checkHealth } = useBackendHealth();
  const {
    output,
    isRunning,
    queuedCode,
    elapsedMs,
    executeCode,
    executeQueuedCode,
  } = useCodeExecution(backendAvailable);

  // Execute queued code when backend becomes available
  useEffect(() => {
    if (backendAvailable && queuedCode) {
      executeQueuedCode();
    }
  }, [backendAvailable, queuedCode, executeQueuedCode]);

  const handleRun = (codeOverride) => {
    // If code is passed directly (from keyboard shortcut), use it
    // Otherwise use the state (from Run button click)
    executeCode(codeOverride || code);
  };

  const handleCodeChange = (value) => {
    setCode(value || '');
  };

  return (
    <div className="flex flex-col h-screen bg-surface">
      <header className="h-12 border-b border-border bg-surface-panel flex items-center justify-between px-4 shrink-0 z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-primary font-bold tracking-tight">
            <span className="material-symbols-outlined text-[20px]">terminal</span>
            <span>CacheHit</span>
          </div>
          <span className="text-border">/</span>
          <div className="flex items-center gap-2 text-sm text-content-muted">
            <span>decks</span>
            <span className="text-border">/</span>
            <span className="text-content">python</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="text-content-muted">PROGRESS</span>
            <div className="flex items-center gap-1">
              <span className="text-primary font-bold">12</span>
              <span className="text-content-muted">/</span>
              <span>50</span>
            </div>
            <div className="hidden md:flex text-content-muted tracking-tighter">
              <span className="text-primary">||||||||||</span>
              <span>....................</span>
            </div>
          </div>
          <div className="h-4 w-px bg-border mx-2"></div>
        </div>
      </header>

      <BackendStatus
        available={backendAvailable}
        checking={checking}
        onRetry={checkHealth}
      />

      <main className="flex-1 flex min-w-0 min-h-0 relative">
        <SplitPane direction="horizontal">
          {[
            <QuestionPane key="question" />,
            <EditorOutputPane
              key="editor-output"
              code={code}
              onCodeChange={handleCodeChange}
              onRun={handleRun}
              output={output}
              isRunning={isRunning}
              elapsedMs={elapsedMs}
              backendAvailable={backendAvailable}
            />,
          ]}
        </SplitPane>
      </main>

      <Footer />
    </div>
  );
}

export default App;
