import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/preact";
import { SplitPane } from "./SplitPane";

describe("SplitPane", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.classList.remove("dragging");
  });

  it("should render both children", () => {
    render(
      <SplitPane>
        <div data-testid="first">First Pane</div>
        <div data-testid="second">Second Pane</div>
      </SplitPane>
    );

    expect(screen.getByTestId("first")).toBeInTheDocument();
    expect(screen.getByTestId("second")).toBeInTheDocument();
  });

  it("should render with topChildren and bottomChildren props", () => {
    render(
      <SplitPane
        topChildren={<div data-testid="top">Top</div>}
        bottomChildren={<div data-testid="bottom">Bottom</div>}
      />
    );

    expect(screen.getByTestId("top")).toBeInTheDocument();
    expect(screen.getByTestId("bottom")).toBeInTheDocument();
  });

  it("should apply initial position styles", () => {
    const { container } = render(
      <SplitPane initialPosition={60}>
        <div>First</div>
        <div>Second</div>
      </SplitPane>
    );

    const panes = container.querySelectorAll(".overflow-hidden");
    expect(panes[0].style.height).toBe("60%");
    expect(panes[1].style.height).toBe("40%");
  });

  it("should render horizontal split with width styles", () => {
    const { container } = render(
      <SplitPane direction="horizontal" initialPosition={70}>
        <div>Left</div>
        <div>Right</div>
      </SplitPane>
    );

    const panes = container.querySelectorAll(".overflow-hidden");
    expect(panes[0].style.width).toBe("70%");
    expect(panes[1].style.width).toBe("30%");
  });

  it("should have vertical divider by default", () => {
    const { container } = render(
      <SplitPane>
        <div>First</div>
        <div>Second</div>
      </SplitPane>
    );

    expect(container.querySelector(".split-divider")).toBeInTheDocument();
    expect(container.querySelector(".split-divider-horizontal")).not.toBeInTheDocument();
  });

  it("should have horizontal divider when direction is horizontal", () => {
    const { container } = render(
      <SplitPane direction="horizontal">
        <div>Left</div>
        <div>Right</div>
      </SplitPane>
    );

    expect(container.querySelector(".split-divider-horizontal")).toBeInTheDocument();
  });

  it("should reset to 50% on double click", async () => {
    const { container } = render(
      <SplitPane initialPosition={70}>
        <div>First</div>
        <div>Second</div>
      </SplitPane>
    );

    const divider = container.querySelector(".split-divider");
    const panes = container.querySelectorAll(".overflow-hidden");

    expect(panes[0].style.height).toBe("70%");

    fireEvent.dblClick(divider);

    await waitFor(() => {
      expect(panes[0].style.height).toBe("50%");
    });
    expect(panes[1].style.height).toBe("50%");
  });

  it("should add dragging class on mousedown", () => {
    const { container } = render(
      <SplitPane>
        <div>First</div>
        <div>Second</div>
      </SplitPane>
    );

    const divider = container.querySelector(".split-divider");
    fireEvent.mouseDown(divider);

    expect(document.body.classList.contains("dragging")).toBe(true);
  });

  it("should remove dragging class on mouseup", () => {
    const { container } = render(
      <SplitPane>
        <div>First</div>
        <div>Second</div>
      </SplitPane>
    );

    const divider = container.querySelector(".split-divider");
    fireEvent.mouseDown(divider);
    expect(document.body.classList.contains("dragging")).toBe(true);

    fireEvent.mouseUp(document);
    expect(document.body.classList.contains("dragging")).toBe(false);
  });

  it("should use default position of 50 when not specified", () => {
    const { container } = render(
      <SplitPane>
        <div>First</div>
        <div>Second</div>
      </SplitPane>
    );

    const panes = container.querySelectorAll(".overflow-hidden");
    expect(panes[0].style.height).toBe("50%");
    expect(panes[1].style.height).toBe("50%");
  });

  it("should apply correct flex direction for vertical split", () => {
    const { container } = render(
      <SplitPane direction="vertical">
        <div>Top</div>
        <div>Bottom</div>
      </SplitPane>
    );

    const splitPane = container.firstChild;
    expect(splitPane.className).toContain("flex-col");
  });

  it("should apply correct flex direction for horizontal split", () => {
    const { container } = render(
      <SplitPane direction="horizontal">
        <div>Left</div>
        <div>Right</div>
      </SplitPane>
    );

    const splitPane = container.firstChild;
    expect(splitPane.className).toContain("flex-row");
  });
});
