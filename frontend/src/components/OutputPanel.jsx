import { useEffect, useRef } from 'react';
import { parseAnsi } from '../utils/ansiParser';

export const OutputPanel = ({ output, isRunning, elapsedMs }) => {
  const outputRef = useRef(null);

  // Auto-scroll to bottom when output changes
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const formatTime = (ms) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const renderOutput = () => {
    if (isRunning && !output) {
      return (
        <>
          <div className="flex gap-2">
            <span className="text-secondary">➜</span>
            <span className="text-primary">~</span>
            <span>python3 solution.py</span>
          </div>
          <div className="mt-2 text-content pl-4 border-l border-border">
            Running... {formatTime(elapsedMs)}
          </div>
          <span className="animate-pulse inline-block w-2 h-4 bg-content-muted align-middle mt-2"></span>
        </>
      );
    }

    if (!output) {
      return (
        <>
          <div className="flex gap-2">
            <span className="text-secondary">➜</span>
            <span className="text-primary">~</span>
            <span>python3 solution.py</span>
          </div>
          <div className="mt-2 text-content pl-4 border-l border-border">
            Waiting for input...
          </div>
          <span className="animate-pulse inline-block w-2 h-4 bg-content-muted align-middle mt-2"></span>
        </>
      );
    }

    const combined = (output.stdout || '') + (output.stderr || '');

    return (
      <>
        <div className="flex gap-2">
          <span className="text-secondary">➜</span>
          <span className="text-primary">~</span>
          <span>python3 solution.py</span>
        </div>
        <div className="mt-2 text-content pl-4 border-l border-border whitespace-pre-wrap">
          {combined.trim() || '(no output)'}
          {output.exit_code !== 0 && (
            <div className="mt-2 text-red-400">Exit code: {output.exit_code}</div>
          )}
          <div className="mt-2 text-content-muted text-[10px]">
            Completed in {output.execution_time_ms?.toFixed(1)}ms
          </div>
        </div>
      </>
    );
  };


  return (
    <div className="h-full border-t border-border bg-surface-panel flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-surface-subtle border-b border-border">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[14px] text-content-muted">terminal</span>
          <span className="text-[10px] font-bold text-content-muted uppercase tracking-wider">
            Console Output
          </span>
        </div>
        <button className="text-[10px] text-content-muted hover:text-white uppercase">Clear</button>
      </div>

      {/* Output Content */}
      <div
        ref={outputRef}
        className="p-4 font-mono text-xs text-content-muted overflow-y-auto flex-1 font-medium"
      >
        {renderOutput()}
      </div>
    </div>
  );
};
