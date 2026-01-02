import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/preact";
import { userEvent } from "@testing-library/user-event";
import { RatingButtonsEnhanced } from "./RatingButtonsEnhanced";

describe("RatingButtonsEnhanced", () => {
  it("should render Forgot and Remembered buttons", () => {
    render(<RatingButtonsEnhanced onRate={vi.fn()} />);

    expect(screen.getByText("Forgot")).toBeInTheDocument();
    expect(screen.getByText("Remembered")).toBeInTheDocument();
  });

  it("should show MOCHI SYNC badge", () => {
    render(<RatingButtonsEnhanced onRate={vi.fn()} />);

    expect(screen.getByText("MOCHI SYNC")).toBeInTheDocument();
  });

  it("should show review summary header", () => {
    render(<RatingButtonsEnhanced onRate={vi.fn()} />);

    expect(screen.getByText("Review Summary")).toBeInTheDocument();
    expect(
      screen.getByText("Did you remember this card?")
    ).toBeInTheDocument();
  });

  it("should call onRate with false when Forgot is clicked", async () => {
    const user = userEvent.setup();
    const handleRate = vi.fn();

    render(<RatingButtonsEnhanced onRate={handleRate} />);

    await user.click(screen.getByText("Forgot"));
    expect(handleRate).toHaveBeenCalledWith(false);
  });

  it("should call onRate with true when Remembered is clicked", async () => {
    const user = userEvent.setup();
    const handleRate = vi.fn();

    render(<RatingButtonsEnhanced onRate={handleRate} />);

    await user.click(screen.getByText("Remembered"));
    expect(handleRate).toHaveBeenCalledWith(true);
  });

  it("should disable all buttons when disabled prop is true", () => {
    render(<RatingButtonsEnhanced onRate={vi.fn()} disabled={true} />);

    const buttons = screen
      .getAllByRole("button")
      .filter((btn) =>
        ["Forgot", "Remembered"].some((label) =>
          btn.textContent.includes(label)
        )
      );

    buttons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it("should not call onRate when buttons are disabled", async () => {
    const user = userEvent.setup();
    const handleRate = vi.fn();

    render(<RatingButtonsEnhanced onRate={handleRate} disabled={true} />);

    await user.click(screen.getByText("Forgot"));
    await user.click(screen.getByText("Remembered"));

    expect(handleRate).not.toHaveBeenCalled();
  });
});
