import { SplitPane } from './SplitPane';
import { CodeEditor } from './Editor';
import { OutputPanel } from './OutputPanel';

export const EditorOutputPane = ({
  code,
  onCodeChange,
  onRun,
  output,
  isRunning,
  elapsedMs,
  backendAvailable,
}) => {
  return (
    <section className="w-full h-screen flex flex-col bg-surface relative">
      {/* Tab Bar */}
      <div className="flex items-center bg-surface border-b border-border">
        <div className="flex">
          <div className="px-4 py-2 bg-surface-panel border-r border-border text-xs text-white font-mono flex items-center gap-2 border-t-2 border-t-primary">
            <span className="material-symbols-outlined text-[14px] text-primary">code</span>
            solution.py
          </div>
          <div className="px-4 py-2 bg-surface border-r border-border text-xs text-content-muted font-mono flex items-center gap-2 hover:bg-surface-subtle cursor-pointer transition-colors">
            <span className="material-symbols-outlined text-[14px]">science</span>
            tests.py
          </div>
        </div>
        <div className="ml-auto px-2 flex items-center gap-2">
          <span className={`size-2 rounded-full ${backendAvailable ? 'bg-secondary' : 'bg-content-muted'}`}></span>
          <span className="text-[10px] uppercase text-content-muted font-bold tracking-wider mr-2">
            {backendAvailable ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Editor and Output Split */}
      <div className="flex-1 relative flex flex-col bg-surface min-h-0">
        <SplitPane direction="vertical" initialPosition={67}>
          {[
            <CodeEditor
              key="editor"
              value={code}
              onChange={onCodeChange}
              onRun={onRun}
              backendAvailable={backendAvailable}
            />,
            <OutputPanel
              key="output"
              output={output}
              isRunning={isRunning}
              elapsedMs={elapsedMs}
            />,
          ]}
        </SplitPane>
      </div>
    </section>
  );
};
