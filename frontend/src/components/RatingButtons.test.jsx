import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { RatingButtons } from "./RatingButtons";

describe("RatingButtons", () => {
  it("should render all four rating buttons", () => {
    render(<RatingButtons onRate={vi.fn()} />);

    expect(screen.getByText("Again")).toBeInTheDocument();
    expect(screen.getByText("Hard")).toBeInTheDocument();
    expect(screen.getByText("Good")).toBeInTheDocument();
    expect(screen.getByText("Easy")).toBeInTheDocument();
  });

  it("should show keyboard shortcuts", () => {
    render(<RatingButtons onRate={vi.fn()} />);

    expect(screen.getByText("(1)")).toBeInTheDocument();
    expect(screen.getByText("(2)")).toBeInTheDocument();
    expect(screen.getByText("(3)")).toBeInTheDocument();
    expect(screen.getByText("(4)")).toBeInTheDocument();
  });

  it("should call onRate with rating 1 when Again is clicked", async () => {
    const user = userEvent.setup();
    const handleRate = vi.fn();

    render(<RatingButtons onRate={handleRate} />);

    await user.click(screen.getByText("Again"));

    expect(handleRate).toHaveBeenCalledWith(1);
  });

  it("should call onRate with rating 2 when Hard is clicked", async () => {
    const user = userEvent.setup();
    const handleRate = vi.fn();

    render(<RatingButtons onRate={handleRate} />);

    await user.click(screen.getByText("Hard"));

    expect(handleRate).toHaveBeenCalledWith(2);
  });

  it("should call onRate with rating 3 when Good is clicked", async () => {
    const user = userEvent.setup();
    const handleRate = vi.fn();

    render(<RatingButtons onRate={handleRate} />);

    await user.click(screen.getByText("Good"));

    expect(handleRate).toHaveBeenCalledWith(3);
  });

  it("should call onRate with rating 4 when Easy is clicked", async () => {
    const user = userEvent.setup();
    const handleRate = vi.fn();

    render(<RatingButtons onRate={handleRate} />);

    await user.click(screen.getByText("Easy"));

    expect(handleRate).toHaveBeenCalledWith(4);
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

    await user.click(screen.getByText("Again"));
    await user.click(screen.getByText("Hard"));

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
