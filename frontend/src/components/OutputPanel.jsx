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
        <div className="text-text-muted flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Running... {formatTime(elapsedMs)}
        </div>
      );
    }

    if (!output) {
      return <div className="text-text-muted">Output will appear here...</div>;
    }

    const combined = (output.stdout || '') + (output.stderr || '');

    console.log('OutputPanel render:', {
      stdout: output.stdout,
      stderr: output.stderr,
      combined,
      combinedLength: combined.length
    });

    if (!combined.trim()) {
      return <div className="text-text-muted italic">(no output)</div>;
    }

    const html = parseAnsi(combined);
    console.log('Parsed HTML:', html);

    return (
      <div
        className="text-[#e6edf3]"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  };

  const renderMetrics = () => {
    if (!output) return null;

    return (
      <div className="flex items-center gap-6 px-4 py-3 bg-surface-darker border-t border-border text-sm font-mono">
        <div className="flex items-center gap-2">
          <span className="text-text-muted">⏱️</span>
          <span className="text-white">{output.execution_time_ms?.toFixed(1) || '--'}ms</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-text-muted">💾</span>
          <span className="text-white">{output.memory_used_mb?.toFixed(1) || '--'}MB</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-text-muted">⚡</span>
          <span className="text-white">{output.cpu_percent?.toFixed(1) || '--'}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-text-muted">Exit:</span>
          <span className="text-white">{output.exit_code ?? '--'}</span>
        </div>
        <div className="flex items-center gap-2 ml-auto text-xs" title={output.file_path}>
          <span className="text-text-muted">📄</span>
          <span className="text-text-muted truncate max-w-xs">
            {output.file_path || 'N/A'}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-terminal-bg">
      <div
        ref={outputRef}
        className="flex-1 overflow-auto custom-scrollbar output-content"
      >
        {renderOutput()}
      </div>
      {renderMetrics()}
    </div>
  );
};
