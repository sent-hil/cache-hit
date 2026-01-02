import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/preact";
import { CodeEditor } from "./Editor";

let mockEditorRef = { current: null };

vi.mock("@monaco-editor/react", () => ({
  default: ({ value, onChange, onMount }) => {
    const mockEditor = {
      getValue: () => mockEditorRef.current || value || "",
      addCommand: vi.fn(),
    };
    const mockMonaco = {
      editor: {
        defineTheme: vi.fn(),
        setTheme: vi.fn(),
      },
      languages: {
        typescript: {
          javascriptDefaults: {
            setDiagnosticsOptions: vi.fn(),
          },
        },
      },
      KeyMod: { CtrlCmd: 2048 },
      KeyCode: { Enter: 13 },
    };

    if (onMount) {
      Promise.resolve().then(() => onMount(mockEditor, mockMonaco));
    }

    return (
      <div data-testid="monaco-editor">
        <textarea
          data-testid="editor-textarea"
          value={value || ""}
          onChange={(e) => {
            mockEditorRef.current = e.target.value;
            onChange?.(e.target.value);
          }}
        />
      </div>
    );
  },
}));

describe("CodeEditor", () => {
  const defaultProps = {
    value: "",
    onChange: vi.fn(),
    onRun: vi.fn(),
    backendAvailable: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockEditorRef.current = null;
  });

  it("should render Monaco editor container", () => {
    render(<CodeEditor {...defaultProps} />);

    expect(screen.getByTestId("monaco-editor")).toBeInTheDocument();
  });

  it("should render run button", () => {
    render(<CodeEditor {...defaultProps} />);

    expect(screen.getByRole("button", { name: /run/i })).toBeInTheDocument();
  });

  it("should disable run button when backend is unavailable", () => {
    render(<CodeEditor {...defaultProps} backendAvailable={false} />);

    const runButton = screen.getByRole("button", { name: /run/i });
    expect(runButton).toBeDisabled();
  });

  it("should enable run button when backend is available", () => {
    render(<CodeEditor {...defaultProps} backendAvailable={true} />);

    const runButton = screen.getByRole("button", { name: /run/i });
    expect(runButton).not.toBeDisabled();
  });

  it("should call onRun when run button is clicked", async () => {
    const onRun = vi.fn();
    render(<CodeEditor {...defaultProps} value="print('test')" onRun={onRun} />);

    // Wait for editor to mount
    await new Promise((resolve) => setTimeout(resolve, 10));

    const runButton = screen.getByRole("button", { name: /run/i });
    fireEvent.click(runButton);

    expect(onRun).toHaveBeenCalledWith("print('test')");
  });

  it("should pass value to editor", () => {
    const testCode = "def hello():\n    print('hello')";
    render(<CodeEditor {...defaultProps} value={testCode} />);

    const textarea = screen.getByTestId("editor-textarea");
    expect(textarea.value).toBe(testCode);
  });

  it("should call onChange when editor content changes", () => {
    const onChange = vi.fn();
    render(<CodeEditor {...defaultProps} onChange={onChange} />);

    const textarea = screen.getByTestId("editor-textarea");
    fireEvent.change(textarea, { target: { value: "new code" } });

    expect(onChange).toHaveBeenCalledWith("new code");
  });

  it("should display play_arrow icon in run button", () => {
    render(<CodeEditor {...defaultProps} />);

    const icon = screen.getByText("play_arrow");
    expect(icon).toBeInTheDocument();
  });

  it("should render with initial code when value is empty", () => {
    render(<CodeEditor {...defaultProps} value="" />);

    expect(screen.getByTestId("monaco-editor")).toBeInTheDocument();
  });
});
