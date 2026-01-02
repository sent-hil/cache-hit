import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/preact";
import { userEvent } from "@testing-library/user-event";
import { Footer } from "./Footer";

describe("Footer", () => {
  const defaultProps = {
    onSkipCard: vi.fn(),
    onPreviousCard: vi.fn(),
    canGoNext: true,
    canGoPrevious: true,
  };

  it("should render Prev and Next buttons", () => {
    render(<Footer {...defaultProps} />);

    expect(screen.getByText(/← Prev/)).toBeInTheDocument();
    expect(screen.getByText(/Next →/)).toBeInTheDocument();
  });

  it("should disable Prev button when canGoPrevious is false", () => {
    render(<Footer {...defaultProps} canGoPrevious={false} />);

    const prevButton = screen.getByText(/← Prev/).closest("button");
    expect(prevButton).toBeDisabled();
  });

  it("should disable Next button when canGoNext is false", () => {
    render(<Footer {...defaultProps} canGoNext={false} />);

    const nextButton = screen.getByText(/Next →/).closest("button");
    expect(nextButton).toBeDisabled();
  });

  it("should enable Prev button when canGoPrevious is true", () => {
    render(<Footer {...defaultProps} canGoPrevious={true} />);

    const prevButton = screen.getByText(/← Prev/).closest("button");
    expect(prevButton).not.toBeDisabled();
  });

  it("should enable Next button when canGoNext is true", () => {
    render(<Footer {...defaultProps} canGoNext={true} />);

    const nextButton = screen.getByText(/Next →/).closest("button");
    expect(nextButton).not.toBeDisabled();
  });

  it("should call onPreviousCard when Prev button is clicked", () => {
    const onPreviousCard = vi.fn();
    render(<Footer {...defaultProps} onPreviousCard={onPreviousCard} />);

    const prevButton = screen.getByText(/← Prev/).closest("button");
    fireEvent.click(prevButton);

    expect(onPreviousCard).toHaveBeenCalledTimes(1);
  });

  it("should call onSkipCard when Next button is clicked", () => {
    const onSkipCard = vi.fn();
    render(<Footer {...defaultProps} onSkipCard={onSkipCard} />);

    const nextButton = screen.getByText(/Next →/).closest("button");
    fireEvent.click(nextButton);

    expect(onSkipCard).toHaveBeenCalledTimes(1);
  });

  it("should display keyboard shortcuts help", () => {
    render(<Footer {...defaultProps} />);

    expect(screen.getByText("Run")).toBeInTheDocument();
    expect(screen.getByText("Prev/Next")).toBeInTheDocument();
  });

  it("should display Cmd+Enter keyboard shortcut", () => {
    render(<Footer {...defaultProps} />);

    expect(screen.getByText("⌘ ↵")).toBeInTheDocument();
  });

  it("should display arrow keys keyboard shortcut", () => {
    render(<Footer {...defaultProps} />);

    expect(screen.getByText("← →")).toBeInTheDocument();
  });

  it("should have cursor-not-allowed class when buttons are disabled", () => {
    render(<Footer {...defaultProps} canGoPrevious={false} canGoNext={false} />);

    const prevButton = screen.getByText(/← Prev/).closest("button");
    const nextButton = screen.getByText(/Next →/).closest("button");

    expect(prevButton.className).toContain("cursor-not-allowed");
    expect(nextButton.className).toContain("cursor-not-allowed");
  });

  it("should not call onPreviousCard when Prev button is disabled", async () => {
    const user = userEvent.setup();
    const onPreviousCard = vi.fn();
    render(<Footer {...defaultProps} onPreviousCard={onPreviousCard} canGoPrevious={false} />);

    const prevButton = screen.getByText(/← Prev/).closest("button");
    await user.click(prevButton);

    expect(onPreviousCard).not.toHaveBeenCalled();
  });

  it("should not call onSkipCard when Next button is disabled", async () => {
    const user = userEvent.setup();
    const onSkipCard = vi.fn();
    render(<Footer {...defaultProps} onSkipCard={onSkipCard} canGoNext={false} />);

    const nextButton = screen.getByText(/Next →/).closest("button");
    await user.click(nextButton);

    expect(onSkipCard).not.toHaveBeenCalled();
  });
});
