import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/preact";
import { OutputPanel } from "./OutputPanel";

describe("OutputPanel", () => {
  const defaultProps = {
    output: null,
    isRunning: false,
    elapsedMs: 0,
    onClear: vi.fn(),
    language: "python",
  };

  it("should show waiting message when no output", () => {
    render(<OutputPanel {...defaultProps} />);

    expect(screen.getByText("Waiting for input...")).toBeInTheDocument();
  });

  it("should show python command by default", () => {
    render(<OutputPanel {...defaultProps} />);

    expect(screen.getByText("python3 solution.py")).toBeInTheDocument();
  });

  it("should show ruby command when language is ruby", () => {
    render(<OutputPanel {...defaultProps} language="ruby" />);

    expect(screen.getByText("ruby solution.rb")).toBeInTheDocument();
  });

  it("should show running state with elapsed time", () => {
    render(<OutputPanel {...defaultProps} isRunning={true} elapsedMs={500} />);

    expect(screen.getByText(/Running.../)).toBeInTheDocument();
    expect(screen.getByText(/500ms/)).toBeInTheDocument();
  });

  it("should format elapsed time in seconds when over 1000ms", () => {
    render(<OutputPanel {...defaultProps} isRunning={true} elapsedMs={1500} />);

    expect(screen.getByText(/1.5s/)).toBeInTheDocument();
  });

  it("should render stdout from output", () => {
    const output = {
      stdout: "Hello, World!",
      stderr: "",
      exit_code: 0,
      execution_time_ms: 50,
    };

    render(<OutputPanel {...defaultProps} output={output} />);

    expect(screen.getByText("Hello, World!")).toBeInTheDocument();
  });

  it("should render stderr from output", () => {
    const output = {
      stdout: "",
      stderr: "Error: something went wrong",
      exit_code: 1,
      execution_time_ms: 50,
    };

    render(<OutputPanel {...defaultProps} output={output} />);

    expect(screen.getByText("Error: something went wrong")).toBeInTheDocument();
  });

  it("should show exit code when non-zero", () => {
    const output = {
      stdout: "",
      stderr: "Error",
      exit_code: 1,
      execution_time_ms: 50,
    };

    render(<OutputPanel {...defaultProps} output={output} />);

    expect(screen.getByText(/Exit code: 1/)).toBeInTheDocument();
  });

  it("should not show exit code when zero", () => {
    const output = {
      stdout: "Success",
      stderr: "",
      exit_code: 0,
      execution_time_ms: 50,
    };

    render(<OutputPanel {...defaultProps} output={output} />);

    expect(screen.queryByText(/Exit code/)).not.toBeInTheDocument();
  });

  it("should show completion time", () => {
    const output = {
      stdout: "output",
      stderr: "",
      exit_code: 0,
      execution_time_ms: 123.456,
    };

    render(<OutputPanel {...defaultProps} output={output} />);

    expect(screen.getByText(/Completed in 123.5ms/)).toBeInTheDocument();
  });

  it("should call onClear when clear button is clicked", () => {
    const onClear = vi.fn();
    render(<OutputPanel {...defaultProps} onClear={onClear} />);

    const clearButton = screen.getByText("Clear");
    fireEvent.click(clearButton);

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("should show (no output) when stdout and stderr are empty", () => {
    const output = {
      stdout: "",
      stderr: "",
      exit_code: 0,
      execution_time_ms: 10,
    };

    render(<OutputPanel {...defaultProps} output={output} />);

    expect(screen.getByText("(no output)")).toBeInTheDocument();
  });

  it("should display Console Output header", () => {
    render(<OutputPanel {...defaultProps} />);

    expect(screen.getByText("Console Output")).toBeInTheDocument();
  });

  it("should use output.language over prop language", () => {
    const output = {
      stdout: "Ruby output",
      stderr: "",
      exit_code: 0,
      execution_time_ms: 50,
      language: "ruby",
    };

    render(<OutputPanel {...defaultProps} output={output} language="python" />);

    expect(screen.getByText("ruby solution.rb")).toBeInTheDocument();
  });

  it("should combine stdout and stderr in output", () => {
    const output = {
      stdout: "Standard output\n",
      stderr: "Standard error",
      exit_code: 1,
      execution_time_ms: 50,
    };

    render(<OutputPanel {...defaultProps} output={output} />);

    expect(screen.getByText(/Standard output/)).toBeInTheDocument();
    expect(screen.getByText(/Standard error/)).toBeInTheDocument();
  });

  it("should show terminal icon", () => {
    render(<OutputPanel {...defaultProps} />);

    expect(screen.getByText("terminal")).toBeInTheDocument();
  });

  it("should show pulsing cursor when waiting", () => {
    const { container } = render(<OutputPanel {...defaultProps} />);

    const cursor = container.querySelector(".animate-pulse");
    expect(cursor).toBeInTheDocument();
  });

  it("should show pulsing cursor when running", () => {
    const { container } = render(<OutputPanel {...defaultProps} isRunning={true} />);

    const cursor = container.querySelector(".animate-pulse");
    expect(cursor).toBeInTheDocument();
  });
});
