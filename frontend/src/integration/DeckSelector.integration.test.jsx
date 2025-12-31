import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";
import * as api from "../utils/api";

// Mock the API module
vi.mock("../utils/api", () => ({
  api: {
    checkHealth: vi.fn(),
    executeCode: vi.fn(),
    listDecks: vi.fn(),
    getDeck: vi.fn(),
    resetReviews: vi.fn(),
  },
}));

describe("DeckSelector Integration Tests", () => {
  const mockDecks = {
    decks: [
      { id: "all", name: "All", total_cards: 40 },
      { id: "QhL3SFpO", name: "Python", total_cards: 35 },
      { id: "wvsBwDcA", name: "Ruby", total_cards: 5 },
    ],
  };

  const mockPythonDeck = {
    id: "QhL3SFpO",
    name: "Python",
    total_cards: 35,
    cards: [
      {
        id: "card1",
        title: "Python Card 1",
        sections: [
          { question: "What is Python?", answer_code: 'print("Hello")' },
        ],
      },
    ],
  };

  const mockRubyDeck = {
    id: "wvsBwDcA",
    name: "Ruby",
    total_cards: 5,
    cards: [
      {
        id: "card2",
        title: "Ruby Card 1",
        sections: [{ question: "What is Ruby?", answer_code: 'puts "Hello"' }],
      },
    ],
  };

  const mockAllDeck = {
    id: "all",
    name: "All",
    total_cards: 40,
    cards: [...mockPythonDeck.cards, ...mockRubyDeck.cards],
  };

  const mockDueCards = {
    cards: [
      {
        card: mockPythonDeck.cards[0],
        due_sections: [
          {
            section_index: 0,
            due_date: "2024-01-01",
            difficulty: 0,
            reps: 0,
            state: "new",
          },
        ],
      },
    ],
    total_due: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock API responses
    api.api.checkHealth.mockResolvedValue({ status: "ok" });
    api.api.executeCode.mockResolvedValue({ output: "", error: null });
    api.api.listDecks.mockResolvedValue(mockDecks);
    api.api.getDeck.mockImplementation((deckId) => {
      if (deckId === "QhL3SFpO") return Promise.resolve(mockPythonDeck);
      if (deckId === "wvsBwDcA") return Promise.resolve(mockRubyDeck);
      if (deckId === "all") return Promise.resolve(mockAllDeck);
      return Promise.reject(new Error("Deck not found"));
    });

    // Mock fetch for due cards
    global.fetch = vi.fn((url) => {
      if (url.includes("/api/review/due")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockDueCards),
        });
      }
      return Promise.reject(new Error("Unknown endpoint"));
    });
  });

  it("should render deck selector with initial deck name", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("All")).toBeInTheDocument();
    });
  });

  it("should open dropdown when clicking on deck name", async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("All")).toBeInTheDocument();
    });

    // Click to open dropdown
    await user.click(screen.getByText("All"));

    // Wait for dropdown to open and list decks to be called
    await waitFor(() => {
      expect(api.api.listDecks).toHaveBeenCalled();
    });

    // Check all deck options are visible
    await waitFor(() => {
      expect(screen.getAllByText("All").length).toBeGreaterThan(1); // One in header, one in dropdown
      expect(screen.getByText("Python")).toBeInTheDocument();
      expect(screen.getByText("Ruby")).toBeInTheDocument();
    });
  });

  it("should display deck card counts in dropdown", async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("All")).toBeInTheDocument();
    });

    await user.click(screen.getByText("All"));

    await waitFor(() => {
      expect(screen.getByText("40")).toBeInTheDocument(); // All deck count
      expect(screen.getByText("35")).toBeInTheDocument(); // Python count
      expect(screen.getByText("5")).toBeInTheDocument(); // Ruby count
    });
  });

  it("should switch to Ruby deck when selected", async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("All")).toBeInTheDocument();
    });

    // Open dropdown
    await user.click(screen.getByText("All"));

    // Wait for dropdown to load
    await waitFor(() => {
      expect(screen.getByText("Ruby")).toBeInTheDocument();
    });

    // Click on Ruby
    const rubyButton = screen.getByRole("button", { name: /Ruby/i });
    await user.click(rubyButton);

    // Verify Ruby deck is loaded
    await waitFor(() => {
      expect(api.api.getDeck).toHaveBeenCalledWith("wvsBwDcA");
    });

    // Verify header shows Ruby
    await waitFor(() => {
      const header = screen.getByRole("banner");
      expect(within(header).getByText("Ruby")).toBeInTheDocument();
    });
  });

  it("should switch to Python deck when selected", async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("All")).toBeInTheDocument();
    });

    // Open dropdown
    await user.click(screen.getByText("All"));

    await waitFor(() => {
      expect(screen.getByText("Python")).toBeInTheDocument();
    });

    // Click on Python
    const pythonButton = screen.getByRole("button", { name: /Python/i });
    await user.click(pythonButton);

    // Verify Python deck is loaded
    await waitFor(() => {
      expect(api.api.getDeck).toHaveBeenCalledWith("QhL3SFpO");
    });

    // Verify header shows Python
    await waitFor(() => {
      const header = screen.getByRole("banner");
      expect(within(header).getByText("Python")).toBeInTheDocument();
    });
  });

  it("should reset state when switching decks", async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("All")).toBeInTheDocument();
    });

    // Switch to Ruby deck
    await user.click(screen.getByText("All"));
    await waitFor(() => {
      expect(screen.getByText("Ruby")).toBeInTheDocument();
    });

    const rubyButton = screen.getByRole("button", { name: /Ruby/i });
    await user.click(rubyButton);

    // Verify deck was loaded (this confirms state was reset and new deck loaded)
    await waitFor(() => {
      expect(api.api.getDeck).toHaveBeenCalledWith("wvsBwDcA");
    });

    // Verify header shows Ruby
    await waitFor(() => {
      const header = screen.getByRole("banner");
      expect(within(header).getByText("Ruby")).toBeInTheDocument();
    });
  });

  it("should close dropdown when clicking outside", async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("All")).toBeInTheDocument();
    });

    // Open dropdown
    await user.click(screen.getByText("All"));

    await waitFor(() => {
      expect(screen.getByText("Python")).toBeInTheDocument();
    });

    // Click outside (on the main element)
    await user.click(screen.getByRole("main"));

    // Dropdown should close - only one "All" text should remain (in header)
    await waitFor(() => {
      const allElements = screen.getAllByText("All");
      expect(allElements.length).toBe(1);
    });
  });

  it("should handle progress counter correctly when switching decks", async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("All")).toBeInTheDocument();
    });

    // Check initial progress in header
    await waitFor(() => {
      const header = screen.getByRole("banner");
      const progressSection =
        within(header).getByText("PROGRESS").parentElement;
      expect(
        within(progressSection).getByText("1", { selector: ".text-primary" })
      ).toBeInTheDocument();
    });

    // Switch to Python deck
    await user.click(screen.getByText("All"));
    await waitFor(() => {
      expect(screen.getByText("Python")).toBeInTheDocument();
    });

    const pythonButton = screen.getByRole("button", { name: /Python/i });
    await user.click(pythonButton);

    // Wait for deck to load
    await waitFor(() => {
      expect(api.api.getDeck).toHaveBeenCalledWith("QhL3SFpO");
    });

    // Progress should reset to 1 in header
    await waitFor(() => {
      const header = screen.getByRole("banner");
      const progressSection =
        within(header).getByText("PROGRESS").parentElement;
      expect(
        within(progressSection).getByText("1", { selector: ".text-primary" })
      ).toBeInTheDocument();
    });
  });

  it("should not cause .repeat() error when switching decks", async () => {
    const user = userEvent.setup();
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("All")).toBeInTheDocument();
    });

    // Switch to Ruby deck
    await user.click(screen.getByText("All"));
    await waitFor(() => {
      expect(screen.getByText("Ruby")).toBeInTheDocument();
    });

    const rubyButton = screen.getByRole("button", { name: /Ruby/i });
    await user.click(rubyButton);

    // Wait for deck to load
    await waitFor(() => {
      expect(api.api.getDeck).toHaveBeenCalledWith("wvsBwDcA");
    });

    // No RangeError about .repeat() should occur
    expect(consoleError).not.toHaveBeenCalledWith(
      expect.stringContaining("repeat count must be non-negative")
    );

    consoleError.mockRestore();
  });

  it("should highlight currently selected deck in dropdown", async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("All")).toBeInTheDocument();
    });

    // Open dropdown
    await user.click(screen.getByText("All"));

    await waitFor(() => {
      expect(screen.getByText("Python")).toBeInTheDocument();
    });

    // Find the All button in the dropdown (not the header)
    const dropdownButtons = screen.getAllByRole("button");
    const allDropdownButton = dropdownButtons.find(
      (btn) => btn.textContent.includes("All") && btn.textContent.includes("40")
    );

    // All deck should have highlighted styling
    expect(allDropdownButton).toHaveClass("bg-surface-subtle");
    expect(allDropdownButton).toHaveClass("text-primary");
  });

  it("should load decks only once when opening dropdown multiple times", async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("All")).toBeInTheDocument();
    });

    // Open dropdown first time
    await user.click(screen.getByText("All"));
    await waitFor(() => {
      expect(api.api.listDecks).toHaveBeenCalledTimes(1);
    });

    // Close dropdown
    await user.click(screen.getByRole("main"));

    // Clear the mock call count
    vi.clearAllMocks();

    // Open dropdown second time
    await user.click(screen.getByText("All"));

    // Should not call listDecks again (already cached)
    await waitFor(() => {
      expect(api.api.listDecks).not.toHaveBeenCalled();
    });
  });
});
