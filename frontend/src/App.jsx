import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { QuestionPane } from './components/QuestionPane';
import { EditorOutputPane } from './components/EditorOutputPane';
import { Footer } from './components/Footer';
import { SplitPane } from './components/SplitPane';
import { RunButton } from './components/RunButton';
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
    <div className="flex h-screen bg-background-dark">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-border bg-surface-darker flex items-center justify-between px-6 shrink-0">
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold leading-tight text-white">
                Review: Python Data Structures
              </h1>
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                LEARNING
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
              <span>Spaced Repetition</span>
              <span>•</span>
              <span>Daily Mix</span>
              <span>•</span>
              <span className="font-medium">Card 12 of 50</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 rounded-lg text-sm font-medium text-text-muted hover:text-white hover:bg-surface-dark transition-colors">
              End Session
            </button>
            <RunButton
              onClick={() => handleRun()}
              isRunning={isRunning}
              disabled={!backendAvailable}
            />
          </div>
        </header>

        {/* Backend Status Banner */}
        <BackendStatus
          available={backendAvailable}
          checking={checking}
          onRetry={checkHealth}
        />

        {/* Split Layout: Question Pane | Editor + Output */}
        <div className="flex-1 min-h-0">
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
              />,
            ]}
          </SplitPane>
        </div>

        {/* Footer */}
        <Footer />
      </main>
    </div>
  );
}

export default App;
