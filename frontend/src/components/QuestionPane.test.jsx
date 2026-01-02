import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/preact";
import {
  renderCloze,
  renderContent,
  highlightPython,
  QuestionPane,
} from "./QuestionPane";

// Mock useReview hook
vi.mock("../hooks/useReview", () => ({
  useReview: () => ({
    submitReview: vi.fn(),
    submitting: false,
    syncError: null,
    clearSyncError: vi.fn(),
  }),
}));

describe("renderCloze", () => {
  it("should convert {{text}} to hidden span", () => {
    const result = renderCloze("The answer is {{hidden}}");
    expect(result).toContain('class="cloze-hidden"');
    expect(result).toContain('data-revealed="false"');
    expect(result).toContain(">hidden</span>");
  });

  it("should handle multiple cloze deletions", () => {
    const result = renderCloze("{{first}} and {{second}}");
    const matches = result.match(/cloze-hidden/g);
    expect(matches).toHaveLength(2);
  });

  it("should preserve surrounding text", () => {
    const result = renderCloze("before {{middle}} after");
    expect(result).toContain("before ");
    expect(result).toContain(" after");
  });

  it("should return text unchanged if no cloze markers", () => {
    const result = renderCloze("plain text");
    expect(result).toBe("plain text");
  });

  it("should not match empty cloze braces", () => {
    const result = renderCloze("{{}}");
    // Empty braces don't match the pattern (requires at least one char)
    expect(result).toBe("{{}}");
  });
});

describe("highlightPython", () => {
  it("should highlight keywords", () => {
    const result = highlightPython("def foo():");
    expect(result).toContain('class="syntax-k"');
    expect(result).toContain("def");
  });

  it("should highlight strings", () => {
    const result = highlightPython('print("hello")');
    expect(result).toContain('class="syntax-s"');
    expect(result).toContain("hello");
  });

  it("should highlight comments", () => {
    const result = highlightPython("# comment");
    expect(result).toContain('class="syntax-c"');
  });

  it("should highlight class names", () => {
    const result = highlightPython("MyClass");
    expect(result).toContain('class="syntax-f"');
  });

  it("should highlight numbers", () => {
    const result = highlightPython("x = 42");
    expect(result).toContain('class="syntax-n"');
    expect(result).toContain("42");
  });

  it("should escape HTML entities", () => {
    const result = highlightPython("x < y && y > z");
    expect(result).toContain("&lt;");
    expect(result).toContain("&gt;");
    expect(result).toContain("&amp;");
  });
});

describe("renderContent", () => {
  it("should return empty string for null/undefined", () => {
    expect(renderContent(null)).toBe("");
    expect(renderContent(undefined)).toBe("");
    expect(renderContent("")).toBe("");
  });

  it("should render code blocks with syntax highlighting", () => {
    const result = renderContent("```python\ndef foo():\n    pass\n```");
    expect(result).toContain('class="syntax-k"');
    expect(result).toContain("def");
    expect(result).toContain("<pre");
  });

  it("should handle code blocks without language identifier", () => {
    const result = renderContent("```\ncode here\n```");
    expect(result).toContain("<pre");
    expect(result).toContain("code here");
  });

  it("should render text outside code blocks with LaTeX support", () => {
    const result = renderContent("$x^2$");
    expect(result).toContain("katex");
  });

  it("should handle mixed content with code and text", () => {
    const input = "Text before\n```python\nprint('hi')\n```\nText after";
    const result = renderContent(input);
    expect(result).toContain("Text before");
    expect(result).toContain("Text after");
    expect(result).toContain("<pre");
  });

  it("should render cloze deletions in text", () => {
    const result = renderContent("The {{answer}} is here");
    expect(result).toContain('class="cloze-hidden"');
  });

  it("should trim whitespace from non-code parts", () => {
    const result = renderContent("   text   ");
    expect(result).not.toMatch(/^\s+/);
    expect(result).not.toMatch(/\s+$/);
  });
});

describe("QuestionPane", () => {
  const defaultProps = {
    card: {
      id: "test-card",
      name: "Test Card",
      sections: [
        {
          question: "What is 2+2?\nHint: It's easy",
          answer: "4",
        },
      ],
    },
    deckName: "Test Deck",
    isProgrammingCard: false,
    loading: false,
    error: null,
    currentSectionIndex: 0,
    totalSections: 1,
    onNextSection: vi.fn(),
    onGoToSection: vi.fn(),
    canGoNextSection: false,
    onShowAnswer: vi.fn(),
    onHideAnswer: vi.fn(),
    showAnswer: false,
    onCardComplete: vi.fn(),
    onSyncError: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show loading state", () => {
    render(<QuestionPane {...defaultProps} loading={true} card={null} />);
    expect(screen.getByText("Loading cards...")).toBeInTheDocument();
  });

  it("should show error state", () => {
    render(
      <QuestionPane {...defaultProps} error="Something went wrong" card={null} />
    );
    expect(screen.getByText("Error: Something went wrong")).toBeInTheDocument();
  });

  it("should show no cards message when card is null", () => {
    render(<QuestionPane {...defaultProps} card={null} />);
    expect(screen.getByText("No cards due")).toBeInTheDocument();
  });

  it("should render card name as title", () => {
    render(<QuestionPane {...defaultProps} />);
    expect(screen.getByText("Test Card")).toBeInTheDocument();
  });

  it("should render deck name", () => {
    render(<QuestionPane {...defaultProps} />);
    expect(screen.getByText("Test Deck")).toBeInTheDocument();
  });

  it("should render question content after first line", () => {
    render(<QuestionPane {...defaultProps} />);
    expect(screen.getByText("Hint: It's easy")).toBeInTheDocument();
  });

  it("should show answer when showAnswer is true", () => {
    render(<QuestionPane {...defaultProps} showAnswer={true} />);
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("should hide answer when showAnswer is false", () => {
    render(<QuestionPane {...defaultProps} showAnswer={false} />);
    expect(screen.queryByText("// ANSWER")).not.toBeInTheDocument();
  });

  it("should call onShowAnswer when Show Answer button clicked", () => {
    render(<QuestionPane {...defaultProps} />);
    fireEvent.click(screen.getByText("Show Answer"));
    expect(defaultProps.onShowAnswer).toHaveBeenCalled();
  });

  it("should render code blocks in question", () => {
    const cardWithCode = {
      ...defaultProps.card,
      sections: [
        {
          question: "What does this print?\n```python\nprint('hello')\n```",
          answer: "hello",
        },
      ],
    };
    const { container } = render(
      <QuestionPane {...defaultProps} card={cardWithCode} />
    );
    expect(container.querySelector("pre")).toBeInTheDocument();
  });

  it("should render code blocks in answer", () => {
    const cardWithCode = {
      ...defaultProps.card,
      sections: [
        {
          question: "How to print hello?",
          answer: "```python\nprint('hello')\n```",
        },
      ],
    };
    const { container } = render(
      <QuestionPane {...defaultProps} card={cardWithCode} showAnswer={true} />
    );
    expect(container.querySelector("pre")).toBeInTheDocument();
  });

  it("should render cloze deletions in question body", () => {
    const cardWithCloze = {
      ...defaultProps.card,
      sections: [
        {
          question: "Fill in the blank:\nThe {{hidden}} word",
          answer: "answer",
        },
      ],
    };
    const { container } = render(
      <QuestionPane {...defaultProps} card={cardWithCloze} />
    );
    expect(container.querySelector(".cloze-hidden")).toBeInTheDocument();
  });

  it("should render LaTeX in question body", () => {
    const cardWithLatex = {
      ...defaultProps.card,
      sections: [
        {
          question: "Solve:\n$x^2 + 1 = 0$",
          answer: "x squared",
        },
      ],
    };
    const { container } = render(
      <QuestionPane {...defaultProps} card={cardWithLatex} />
    );
    expect(container.querySelector(".katex")).toBeInTheDocument();
  });

  it("should show section number", () => {
    render(<QuestionPane {...defaultProps} />);
    expect(screen.getByText(/SECTION 1/)).toBeInTheDocument();
  });

  it("should show Previous Section button when not on first section", () => {
    const cardWithMultipleSections = {
      ...defaultProps.card,
      sections: [
        { question: "Question 1", answer: "Answer 1" },
        { question: "Question 2", answer: "Answer 2" },
        { question: "Question 3", answer: "Answer 3" },
      ],
    };
    render(
      <QuestionPane
        {...defaultProps}
        card={cardWithMultipleSections}
        currentSectionIndex={1}
        totalSections={3}
      />
    );
    expect(screen.getByText("Prev Section")).toBeInTheDocument();
  });

  it("should show Next Section button when canGoNextSection is true", () => {
    render(<QuestionPane {...defaultProps} canGoNextSection={true} />);
    expect(screen.getByText("Next Section")).toBeInTheDocument();
  });
});
