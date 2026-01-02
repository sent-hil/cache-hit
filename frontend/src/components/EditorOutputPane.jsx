import { SplitPane } from "./SplitPane";
import { CodeEditor } from "./Editor";
import { OutputPanel } from "./OutputPanel";

export const EditorOutputPane = ({
  code,
  onCodeChange,
  onRun,
  output,
  isRunning,
  elapsedMs,
  backendAvailable,
  backendChecking,
  backendError,
  onClearOutput,
  onReconnect,
  language = "python",
}) => {
  return (
    <section className="w-full h-full flex flex-col bg-surface relative">
      <div className="flex items-center bg-surface border-b border-border">
        <div className="flex">
          <div className="px-4 py-2 border-r border-border text-xs font-mono flex items-center gap-2 bg-surface-panel text-white border-t-2 border-t-primary">
            <span className="material-symbols-outlined text-[14px] text-primary">
              code
            </span>
            Your Code
          </div>
        </div>
        <div className="ml-auto px-2 flex items-center gap-2">
          {backendChecking ? (
            <>
              <svg
                className="animate-spin h-3 w-3 text-content-muted"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span className="text-[10px] uppercase text-content-muted font-bold tracking-wider">
                Connecting...
              </span>
            </>
          ) : (
            <>
              <span
                className={`size-2 rounded-full ${
                  backendAvailable ? "bg-secondary" : "bg-content-muted"
                }`}
              ></span>
              <span className="text-[10px] uppercase text-content-muted font-bold tracking-wider">
                {backendAvailable ? "Connected" : "Disconnected"}
              </span>
              {!backendAvailable && !backendError && (
                <>
                  <span className="text-content-muted">·</span>
                  <button
                    onClick={onReconnect}
                    className="text-[10px] text-primary hover:text-primary/80 font-bold tracking-wider transition-colors"
                  >
                    Reconnect
                  </button>
                </>
              )}
              {backendError && (
                <>
                  <span className="text-content-muted">·</span>
                  <span
                    className="text-[10px] text-red-400 max-w-[300px] truncate"
                    title={backendError}
                  >
                    {backendError}
                  </span>
                  <span className="text-content-muted">·</span>
                  <button
                    onClick={onReconnect}
                    className="text-[10px] text-primary hover:text-primary/80 font-bold tracking-wider transition-colors"
                  >
                    Retry
                  </button>
                </>
              )}
            </>
          )}
          <span className="w-2"></span>
        </div>
      </div>

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
              onClear={onClearOutput}
              language={language}
            />,
          ]}
        </SplitPane>
      </div>
    </section>
  );
};
