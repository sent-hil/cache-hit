import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/preact";
import { userEvent } from "@testing-library/user-event";
import { RatingButtons } from "./RatingButtons";

describe("RatingButtons", () => {
  it("should render Forgot and Remembered buttons", () => {
    render(<RatingButtons onRate={vi.fn()} />);

    expect(screen.getByText("Forgot")).toBeInTheDocument();
    expect(screen.getByText("Remembered")).toBeInTheDocument();
  });

  it("should show keyboard shortcuts", () => {
    render(<RatingButtons onRate={vi.fn()} />);

    expect(screen.getByText("(F)")).toBeInTheDocument();
    expect(screen.getByText("(R)")).toBeInTheDocument();
  });

  it("should call onRate with false when Forgot is clicked", async () => {
    const user = userEvent.setup();
    const handleRate = vi.fn();

    render(<RatingButtons onRate={handleRate} />);

    await user.click(screen.getByText("Forgot"));

    expect(handleRate).toHaveBeenCalledWith(false);
  });

  it("should call onRate with true when Remembered is clicked", async () => {
    const user = userEvent.setup();
    const handleRate = vi.fn();

    render(<RatingButtons onRate={handleRate} />);

    await user.click(screen.getByText("Remembered"));

    expect(handleRate).toHaveBeenCalledWith(true);
  });

  it("should disable all buttons when disabled prop is true", () => {
    render(<RatingButtons onRate={vi.fn()} disabled={true} />);

    const buttons = screen.getAllByRole("button");
    buttons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it("should not call onRate when buttons are disabled", async () => {
    const user = userEvent.setup();
    const handleRate = vi.fn();

    render(<RatingButtons onRate={handleRate} disabled={true} />);

    await user.click(screen.getByText("Forgot"));
    await user.click(screen.getByText("Remembered"));

    expect(handleRate).not.toHaveBeenCalled();
  });

  it("should enable all buttons when disabled prop is false", () => {
    render(<RatingButtons onRate={vi.fn()} disabled={false} />);

    const buttons = screen.getAllByRole("button");
    buttons.forEach((button) => {
      expect(button).not.toBeDisabled();
    });
  });
});
