import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/preact";
import { userEvent } from "@testing-library/user-event";
import { ReviewComplete } from "./ReviewComplete";

describe("ReviewComplete", () => {
  const mockOnRedo = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render no cards due message", () => {
    render(<ReviewComplete onRedo={mockOnRedo} />);

    expect(screen.getByText("No cards due")).toBeInTheDocument();
    expect(screen.getByText("Check back later.")).toBeInTheDocument();
  });

  it("should render refresh button", () => {
    render(<ReviewComplete onRedo={mockOnRedo} />);

    expect(
      screen.getByRole("button", { name: /Refresh/i })
    ).toBeInTheDocument();
  });

  it("should render done_all icon", () => {
    render(<ReviewComplete onRedo={mockOnRedo} />);

    expect(screen.getByText("done_all")).toBeInTheDocument();
  });

  it("should call onRedo when refresh button is clicked", async () => {
    const user = userEvent.setup();

    render(<ReviewComplete onRedo={mockOnRedo} />);

    const refreshButton = screen.getByRole("button", { name: /Refresh/i });
    await user.click(refreshButton);

    expect(mockOnRedo).toHaveBeenCalled();
  });

  it("should render refresh icon in button", () => {
    render(<ReviewComplete onRedo={mockOnRedo} />);

    expect(screen.getByText("refresh")).toBeInTheDocument();
  });
});
