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
}) => {
  return (
    <SplitPane direction="vertical">
      {[
        <CodeEditor
          key="editor"
          value={code}
          onChange={onCodeChange}
          onRun={onRun}
        />,
        <OutputPanel
          key="output"
          output={output}
          isRunning={isRunning}
          elapsedMs={elapsedMs}
        />,
      ]}
    </SplitPane>
  );
};
