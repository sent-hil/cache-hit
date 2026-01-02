import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/preact";
import { useReviewState } from "./useReviewState";

global.fetch = vi.fn();

const mockCards = [
  {
    id: "card1",
    name: "Card 1",
    sections: [
      { question: "Q1", answer: "A1" },
      { question: "Q2", answer: "A2" },
    ],
    total_sections: 2,
  },
  {
    id: "card2",
    name: "Card 2",
    sections: [{ question: "Q3", answer: "A3" }],
    total_sections: 1,
  },
  {
    id: "card3",
    name: "Card 3",
    sections: [{ question: "Q4", answer: "A4" }],
    total_sections: 1,
  },
];

describe("useReviewState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with loading state", () => {
    fetch.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useReviewState());

    expect(result.current.loading).toBe(true);
    expect(result.current.currentCard).toBe(null);
  });

  it("should load due cards on mount", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ cards: mockCards }),
    });

    const { result } = renderHook(() => useReviewState());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetch).toHaveBeenCalledWith("http://localhost:8000/api/due");
    expect(result.current.currentCard).toEqual(mockCards[0]);
    expect(result.current.totalCards).toBe(3);
    expect(result.current.remainingCards).toBe(3);
  });

  it("should navigate to next card", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ cards: mockCards }),
    });

    const { result } = renderHook(() => useReviewState());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.currentCard.id).toBe("card1");

    act(() => {
      const moved = result.current.nextCard();
      expect(moved).toBe(true);
    });

    expect(result.current.currentCard.id).toBe("card2");
  });

  it("should navigate to previous card", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ cards: mockCards }),
    });

    const { result } = renderHook(() => useReviewState());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.nextCard();
    });

    expect(result.current.currentCard.id).toBe("card2");

    act(() => {
      const moved = result.current.prevCard();
      expect(moved).toBe(true);
    });

    expect(result.current.currentCard.id).toBe("card1");
  });

  it("should return false when cannot go previous from first card", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ cards: mockCards }),
    });

    const { result } = renderHook(() => useReviewState());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.canGoPrevious).toBe(false);

    act(() => {
      const moved = result.current.prevCard();
      expect(moved).toBe(false);
    });
  });

  it("should return false when cannot go next from last card", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ cards: mockCards }),
    });

    const { result } = renderHook(() => useReviewState());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.nextCard();
      result.current.nextCard();
    });

    expect(result.current.currentCard.id).toBe("card3");
    expect(result.current.canGoNext).toBe(false);

    act(() => {
      const moved = result.current.nextCard();
      expect(moved).toBe(false);
    });
  });

  it("should navigate to next section within a card", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ cards: mockCards }),
    });

    const { result } = renderHook(() => useReviewState());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.currentSectionIndex).toBe(0);
    expect(result.current.currentSection.question).toBe("Q1");

    act(() => {
      const moved = result.current.nextSection();
      expect(moved).toBe(true);
    });

    expect(result.current.currentSectionIndex).toBe(1);
    expect(result.current.currentSection.question).toBe("Q2");
  });

  it("should return false when at last section", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ cards: mockCards }),
    });

    const { result } = renderHook(() => useReviewState());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.nextSection();
    });

    expect(result.current.currentSectionIndex).toBe(1);

    act(() => {
      const moved = result.current.nextSection();
      expect(moved).toBe(false);
    });
  });

  it("should remove current card", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ cards: mockCards }),
    });

    const { result } = renderHook(() => useReviewState());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.remainingCards).toBe(3);

    act(() => {
      result.current.removeCurrentCard();
    });

    expect(result.current.remainingCards).toBe(2);
    expect(result.current.currentCard.id).toBe("card2");
  });

  it("should handle removing last card in list", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ cards: mockCards }),
    });

    const { result } = renderHook(() => useReviewState());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.nextCard();
      result.current.nextCard();
    });

    expect(result.current.currentCard.id).toBe("card3");

    act(() => {
      result.current.removeCurrentCard();
    });

    expect(result.current.remainingCards).toBe(2);
    expect(result.current.currentCard.id).toBe("card2");
  });

  it("should set isEmpty when all cards are removed", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ cards: [mockCards[0]] }),
    });

    const { result } = renderHook(() => useReviewState());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isEmpty).toBe(false);

    act(() => {
      result.current.removeCurrentCard();
    });

    expect(result.current.isEmpty).toBe(true);
    expect(result.current.currentCard).toBe(null);
  });

  it("should handle load error", async () => {
    fetch.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useReviewState());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Network error");
    expect(result.current.currentCard).toBe(null);
  });

  it("should reload cards", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ cards: mockCards }),
    });

    const { result } = renderHook(() => useReviewState());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const newCards = [{ id: "new", sections: [{ question: "New", answer: "A" }] }];
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ cards: newCards }),
    });

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.currentCard.id).toBe("new");
  });

  it("should reset section index when navigating cards", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ cards: mockCards }),
    });

    const { result } = renderHook(() => useReviewState());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.nextSection();
    });

    expect(result.current.currentSectionIndex).toBe(1);

    act(() => {
      result.current.nextCard();
    });

    expect(result.current.currentSectionIndex).toBe(0);
  });

  it("should track cardsReviewed correctly", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ cards: mockCards }),
    });

    const { result } = renderHook(() => useReviewState());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.currentCardIndex).toBe(1);

    act(() => {
      result.current.removeCurrentCard();
    });

    expect(result.current.currentCardIndex).toBe(2);

    act(() => {
      result.current.removeCurrentCard();
    });

    expect(result.current.currentCardIndex).toBe(3);
  });

  it("should handle empty cards response", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ cards: [] }),
    });

    const { result } = renderHook(() => useReviewState());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isEmpty).toBe(true);
    expect(result.current.currentCard).toBe(null);
  });
});
