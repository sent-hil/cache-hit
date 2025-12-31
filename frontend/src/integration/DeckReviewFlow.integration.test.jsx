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

describe("Deck Review Flow Integration Tests", () => {
  const mockDecks = {
    decks: [
      { id: "all", name: "All", total_cards: 5 },
      { id: "programming", name: "Programming", total_cards: 4 },
      { id: "math", name: "Math", total_cards: 0 },
    ],
  };

  const mockProgrammingDeck = {
    id: "programming",
    name: "Programming",
    total_cards: 4,
    cards: [
      {
        id: "card1",
        title: "Card 1",
        sections: [{ question: "Question 1", answer_code: "print('1')" }],
      },
      {
        id: "card2",
        title: "Card 2",
        sections: [{ question: "Question 2", answer_code: "print('2')" }],
      },
      {
        id: "card3",
        title: "Card 3",
        sections: [{ question: "Question 3", answer_code: "print('3')" }],
      },
      {
        id: "card4",
        title: "Card 4",
        sections: [{ question: "Question 4", answer_code: "print('4')" }],
      },
    ],
  };

  const mockMathDeck = {
    id: "math",
    name: "Math",
    total_cards: 0,
    cards: [],
  };

  const mockAllDeck = {
    id: "all",
    name: "All",
    total_cards: 5,
    cards: [...mockProgrammingDeck.cards],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    api.api.checkHealth.mockResolvedValue({ status: "ok" });
    api.api.executeCode.mockResolvedValue({ output: "", error: null });
    api.api.listDecks.mockResolvedValue(mockDecks);
    api.api.getDeck.mockImplementation((deckId) => {
      if (deckId === "programming")
        return Promise.resolve(mockProgrammingDeck);
      if (deckId === "math") return Promise.resolve(mockMathDeck);
      if (deckId === "all") return Promise.resolve(mockAllDeck);
      return Promise.reject(new Error("Deck not found"));
    });
    api.api.resetReviews.mockResolvedValue({ success: true, cards_reset: 4 });

    // Default: Mock fetch to return all 4 cards as due
    global.fetch = vi.fn((url) => {
      if (url.includes("/api/review/due")) {
        const deckId = new URL(url, "http://localhost").searchParams.get(
          "deck_id"
        );

        if (deckId === "programming") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                cards: mockProgrammingDeck.cards.map((card) => ({
                  card,
                  due_sections: [
                    {
                      section_index: 0,
                      due_date: "2024-01-01",
                      difficulty: 0,
                      reps: 0,
                      state: "new",
                    },
                  ],
                })),
                total_due: 4,
              }),
          });
        }

        if (deckId === "all") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                cards: mockAllDeck.cards.map((card) => ({
                  card,
                  due_sections: [
                    {
                      section_index: 0,
                      due_date: "2024-01-01",
                      difficulty: 0,
                      reps: 0,
                      state: "new",
                    },
                  ],
                })),
                total_due: 4,
              }),
          });
        }

        if (deckId === "math") {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                cards: [],
                total_due: 0,
              }),
          });
        }
      }
      return Promise.reject(new Error("Unknown endpoint"));
    });
  });

  describe("Progress Bar", () => {
    it("should show correct progress 1/4 when starting with 4 cards", async () => {
      render(<App />);

      // Switch to programming deck
      await waitFor(() => {
        expect(screen.getByText("All")).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.click(screen.getByText("All"));
      await waitFor(() => {
        expect(screen.getByText("Programming")).toBeInTheDocument();
      });

      const programmingButton = screen.getByRole("button", {
        name: /Programming/i,
      });
      await user.click(programmingButton);

      // Check progress shows 1/4
      await waitFor(() => {
        const header = screen.getByRole("banner");
        const progressSection =
          within(header).getByText("PROGRESS").parentElement;
        expect(
          within(progressSection).getByText("1", { selector: ".text-primary" })
        ).toBeInTheDocument();
        expect(within(progressSection).getByText("/")).toBeInTheDocument();
        expect(within(progressSection).getByText("4")).toBeInTheDocument();
      });
    });

    it("should not decrease denominator when reviewing cards (regression test)", async () => {
      render(<App />);

      const user = userEvent.setup();

      // Navigate to programming deck
      await waitFor(() => {
        expect(screen.getByText("All")).toBeInTheDocument();
      });
      await user.click(screen.getByText("All"));
      await waitFor(() => {
        expect(screen.getByText("Programming")).toBeInTheDocument();
      });
      const programmingButton = screen.getByRole("button", {
        name: /Programming/i,
      });
      await user.click(programmingButton);

      // Wait for first card and check initial progress
      await waitFor(() => {
        expect(screen.getByText("Card 1")).toBeInTheDocument();
      });

      const header = screen.getByRole("banner");
      const progressSection = within(header).getByText("PROGRESS").parentElement;

      // Get initial denominator (should be 4)
      const initialTotalElement = within(progressSection).getAllByText("4");
      expect(initialTotalElement.length).toBeGreaterThan(0);

      // Show answer and rate
      await user.click(screen.getByText(/Show Answer/i));
      await waitFor(() => {
        expect(screen.getByText(/Easy/i)).toBeInTheDocument();
      });

      // Mock fetch to return 3 remaining cards after review
      global.fetch = vi.fn((url) => {
        if (url.includes("/api/review/due")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                cards: mockProgrammingDeck.cards.slice(1).map((card) => ({
                  card,
                  due_sections: [
                    {
                      section_index: 0,
                      due_date: "2024-01-01",
                      difficulty: 0,
                      reps: 0,
                      state: "new",
                    },
                  ],
                })),
                total_due: 3,
              }),
          });
        }
        if (url.includes("/api/review")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                success: true,
                next_review_date: "2025-01-01",
                difficulty: 5,
                stability: 1,
                state: "learning",
              }),
          });
        }
        return Promise.reject(new Error("Unknown endpoint"));
      });

      await user.click(screen.getByText(/Easy/i));

      // Check that denominator is still 4 (NOT 3)
      await waitFor(
        () => {
          const header = screen.getByRole("banner");
          const progressSection =
            within(header).getByText("PROGRESS").parentElement;

          // Numerator should be 2
          expect(
            within(progressSection).getByText("2", {
              selector: ".text-primary",
            })
          ).toBeInTheDocument();

          // Denominator should still be 4 (not decreased to 3)
          const allFours = within(progressSection).getAllByText("4");
          expect(allFours.length).toBeGreaterThan(0);
        },
        { timeout: 3000 }
      );
    });

    it("should show correct progress 2/4 after reviewing one card", async () => {
      render(<App />);

      const user = userEvent.setup();

      // Navigate to programming deck
      await waitFor(() => {
        expect(screen.getByText("All")).toBeInTheDocument();
      });
      await user.click(screen.getByText("All"));
      await waitFor(() => {
        expect(screen.getByText("Programming")).toBeInTheDocument();
      });
      const programmingButton = screen.getByRole("button", {
        name: /Programming/i,
      });
      await user.click(programmingButton);

      // Wait for first card to load
      await waitFor(() => {
        expect(screen.getByText("Card 1")).toBeInTheDocument();
      });

      // Show answer and rate
      await user.click(screen.getByText(/Show Answer/i));
      await waitFor(() => {
        expect(screen.getByText(/Again/i)).toBeInTheDocument();
      });

      // Mock fetch to return 3 remaining cards after review
      global.fetch = vi.fn((url) => {
        if (url.includes("/api/review/due")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                cards: mockProgrammingDeck.cards.slice(1).map((card) => ({
                  card,
                  due_sections: [
                    {
                      section_index: 0,
                      due_date: "2024-01-01",
                      difficulty: 0,
                      reps: 0,
                      state: "new",
                    },
                  ],
                })),
                total_due: 3,
              }),
          });
        }
        if (url.includes("/api/review")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                success: true,
                next_review_date: "2025-01-01",
                difficulty: 5,
                stability: 1,
                state: "learning",
              }),
          });
        }
        return Promise.reject(new Error("Unknown endpoint"));
      });

      await user.click(screen.getByText(/Easy/i));

      // Check progress shows 2/4
      await waitFor(
        () => {
          const header = screen.getByRole("banner");
          const progressSection =
            within(header).getByText("PROGRESS").parentElement;
          expect(
            within(progressSection).getByText("2", {
              selector: ".text-primary",
            })
          ).toBeInTheDocument();
          expect(within(progressSection).getByText("4")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it("should show 4/4 (not 5/4) when all cards completed", async () => {
      render(<App />);

      const user = userEvent.setup();

      // Navigate to programming deck
      await waitFor(() => {
        expect(screen.getByText("All")).toBeInTheDocument();
      });
      await user.click(screen.getByText("All"));
      await waitFor(() => {
        expect(screen.getByText("Programming")).toBeInTheDocument();
      });
      const programmingButton = screen.getByRole("button", {
        name: /Programming/i,
      });
      await user.click(programmingButton);

      // Wait for card to load
      await waitFor(() => {
        expect(screen.getByText("Card 1")).toBeInTheDocument();
      });

      // Mock fetch to return no cards (all completed)
      global.fetch = vi.fn((url) => {
        if (url.includes("/api/review/due")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                cards: [],
                total_due: 0,
              }),
          });
        }
        if (url.includes("/api/review")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                success: true,
                next_review_date: "2025-01-01",
                difficulty: 5,
                stability: 1,
                state: "learning",
              }),
          });
        }
        return Promise.reject(new Error("Unknown endpoint"));
      });

      // Review the "last" card
      await user.click(screen.getByText(/Show Answer/i));
      await waitFor(() => {
        expect(screen.getByText(/Easy/i)).toBeInTheDocument();
      });
      await user.click(screen.getByText(/Easy/i));

      // Check progress shows 4/4 (NOT 5/4)
      await waitFor(
        () => {
          const header = screen.getByRole("banner");
          const progressSection =
            within(header).getByText("PROGRESS").parentElement;
          expect(
            within(progressSection).getByText("4", { selector: ".text-primary" })
          ).toBeInTheDocument();
          expect(within(progressSection).getByText("/")).toBeInTheDocument();
          // Check the total is 4 (there may be multiple "4"s, so just check it exists)
          expect(within(progressSection).getAllByText("4").length).toBeGreaterThanOrEqual(2);
        },
        { timeout: 3000 }
      );
    });
  });

  describe("Review Complete Modal", () => {
    it("should show modal when all cards are completed", async () => {
      render(<App />);

      const user = userEvent.setup();

      // Navigate to programming deck
      await waitFor(() => {
        expect(screen.getByText("All")).toBeInTheDocument();
      });
      await user.click(screen.getByText("All"));
      await waitFor(() => {
        expect(screen.getByText("Programming")).toBeInTheDocument();
      });
      const programmingButton = screen.getByRole("button", {
        name: /Programming/i,
      });
      await user.click(programmingButton);

      // Wait for card to load
      await waitFor(() => {
        expect(screen.getByText("Card 1")).toBeInTheDocument();
      });

      // Mock fetch to return no cards after review
      global.fetch = vi.fn((url) => {
        if (url.includes("/api/review/due")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                cards: [],
                total_due: 0,
              }),
          });
        }
        if (url.includes("/api/review")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                success: true,
                next_review_date: "2025-01-01",
                difficulty: 5,
                stability: 1,
                state: "learning",
              }),
          });
        }
        return Promise.reject(new Error("Unknown endpoint"));
      });

      // Complete the last card
      await user.click(screen.getByText(/Show Answer/i));
      await waitFor(() => {
        expect(screen.getByText(/Easy/i)).toBeInTheDocument();
      });
      await user.click(screen.getByText(/Easy/i));

      // Modal should appear
      await waitFor(
        () => {
          expect(
            screen.getByText(/All reviews complete!/i)
          ).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it("should show modal when navigating to a deck with no due cards", async () => {
      render(<App />);

      const user = userEvent.setup();

      // Navigate to math deck (which has 0 cards)
      await waitFor(() => {
        expect(screen.getByText("All")).toBeInTheDocument();
      });
      await user.click(screen.getByText("All"));
      await waitFor(() => {
        expect(screen.getByText("Math")).toBeInTheDocument();
      });

      const mathButton = screen.getByRole("button", { name: /Math/i });
      await user.click(mathButton);

      // Modal should appear
      await waitFor(
        () => {
          expect(
            screen.getByText(/All reviews complete!/i)
          ).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });
  });

  describe("Redo Reviews", () => {
    it("should stay on current deck after clicking Redo Reviews", async () => {
      // Start with empty programming deck to trigger modal
      global.fetch = vi.fn((url) => {
        if (url.includes("/api/review/due")) {
          const deckId = new URL(url, "http://localhost").searchParams.get(
            "deck_id"
          );
          if (deckId === "programming") {
            return Promise.resolve({
              ok: true,
              json: () =>
                Promise.resolve({
                  cards: [],
                  total_due: 0,
                }),
            });
          }
        }
        return Promise.reject(new Error("Unknown endpoint"));
      });

      render(<App />);
      const user = userEvent.setup();

      // Navigate to programming deck
      await waitFor(() => {
        expect(screen.getByText("All")).toBeInTheDocument();
      });
      await user.click(screen.getByText("All"));
      await waitFor(() => {
        expect(screen.getByText("Programming")).toBeInTheDocument();
      });
      const programmingButton = screen.getByRole("button", {
        name: /Programming/i,
      });
      await user.click(programmingButton);

      // Modal should appear
      await waitFor(() => {
        expect(screen.getByText(/All reviews complete!/i)).toBeInTheDocument();
      });

      // Mock resetReviews to succeed
      api.api.resetReviews.mockResolvedValue({
        success: true,
        cards_reset: 4,
      });

      // Mock fetch to return all cards after reset
      global.fetch = vi.fn((url) => {
        if (url.includes("/api/review/due")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                cards: mockProgrammingDeck.cards.map((card) => ({
                  card,
                  due_sections: [
                    {
                      section_index: 0,
                      due_date: "2024-01-01",
                      difficulty: 0,
                      reps: 0,
                      state: "new",
                    },
                  ],
                })),
                total_due: 4,
              }),
          });
        }
        return Promise.reject(new Error("Unknown endpoint"));
      });

      // Click Redo Reviews
      await user.click(screen.getByText(/Redo Reviews/i));

      // Should call resetReviews with programming deck ID
      await waitFor(() => {
        expect(api.api.resetReviews).toHaveBeenCalledWith(
          "user1",
          "programming"
        );
      });

      // Should still be on programming deck
      await waitFor(
        () => {
          const header = screen.getByRole("banner");
          expect(within(header).getByText("Programming")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Should show first card
      await waitFor(() => {
        expect(screen.getByText("Card 1")).toBeInTheDocument();
      });
    });
  });

  describe("Deck Selection Persistence", () => {
    it("should remember selected deck in localStorage", async () => {
      render(<App />);
      const user = userEvent.setup();

      // Navigate to programming deck
      await waitFor(() => {
        expect(screen.getByText("All")).toBeInTheDocument();
      });
      await user.click(screen.getByText("All"));
      await waitFor(() => {
        expect(screen.getByText("Programming")).toBeInTheDocument();
      });
      const programmingButton = screen.getByRole("button", {
        name: /Programming/i,
      });
      await user.click(programmingButton);

      // Check localStorage was updated
      await waitFor(() => {
        expect(localStorage.getItem("selectedDeckId")).toBe("programming");
      });
    });

    it("should load last selected deck on mount", async () => {
      // Pre-populate localStorage
      localStorage.setItem("selectedDeckId", "programming");

      render(<App />);

      // Should load programming deck automatically
      await waitFor(() => {
        expect(api.api.getDeck).toHaveBeenCalledWith("programming");
      });

      // Header should show Programming
      await waitFor(() => {
        const header = screen.getByRole("banner");
        expect(within(header).getByText("Programming")).toBeInTheDocument();
      });
    });
  });
});
