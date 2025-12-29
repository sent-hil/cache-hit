import { useState, useRef } from 'react';
import { api } from '../utils/api';
import { useTimer } from './useTimer';

export const useCodeExecution = (backendAvailable) => {
  const [output, setOutput] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [queuedCode, setQueuedCode] = useState(null);
  const timer = useTimer();
  const executingRef = useRef(false);

  const executeCode = async (code) => {
    // Ignore if already running
    if (executingRef.current || isRunning) {
      console.log('Execution already in progress, ignoring request');
      return;
    }

    // If backend unavailable, queue the code
    if (!backendAvailable) {
      console.log('Backend unavailable, queuing code for later execution');
      setQueuedCode(code);
      return;
    }

    executingRef.current = true;
    setIsRunning(true);
    timer.start();

    try {
      const result = await api.executeCode(code);
      console.log('useCodeExecution: Got result', result);
      console.log('useCodeExecution: stdout length', result.stdout?.length, 'stdout value', result.stdout);
      setOutput(result);
      setQueuedCode(null); // Clear any queued code on successful execution
    } catch (error) {
      console.error('Code execution error:', error);
      setOutput({
        stdout: '',
        stderr: error.message.includes('fetch')
          ? 'Backend unavailable. Check if server is running on port 8000.'
          : error.message,
        exit_code: -1,
        execution_time_ms: 0,
        memory_used_mb: 0,
        cpu_percent: 0,
        container_id: 'N/A',
        language: 'python',
        image_name: 'N/A',
        file_path: 'N/A',
      });
    } finally {
      timer.stop();
      setIsRunning(false);
      executingRef.current = false;
    }
  };

  // Execute queued code when backend becomes available
  const executeQueuedCode = () => {
    if (queuedCode && backendAvailable && !isRunning) {
      console.log('Backend available, executing queued code');
      const code = queuedCode;
      setQueuedCode(null);
      executeCode(code);
    }
  };

  return {
    output,
    isRunning,
    queuedCode,
    elapsedMs: timer.elapsedMs,
    executeCode,
    executeQueuedCode,
  };
};
