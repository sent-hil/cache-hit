import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useDeckState } from "./useDeckState";

global.fetch = vi.fn();

describe("useDeckState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockDeck = {
    id: "QhL3SFpO",
    name: "Python",
    total_cards: 2,
  };

  const mockDueCards = {
    cards: [
      {
        card: {
          id: "card1",
          title: "Card 1",
          sections: [{ question: "Q1", answer_code: "A1" }],
        },
      },
      {
        card: {
          id: "card2",
          title: "Card 2",
          sections: [{ question: "Q2", answer_code: "A2" }],
        },
      },
    ],
    total_due: 2,
  };

  it("should initialize with loading state", () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => mockDeck,
    });

    const { result } = renderHook(() => useDeckState("QhL3SFpO"));

    expect(result.current.loading).toBe(true);
    expect(result.current.currentCard).toBe(null);
    expect(result.current.totalCards).toBe(0);
  });

  it("should load deck and due cards successfully", async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockDeck,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockDueCards,
      });

    const { result } = renderHook(() => useDeckState("QhL3SFpO"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.currentCard).toEqual(mockDueCards.cards[0].card);
    expect(result.current.totalCards).toBe(2);
    expect(result.current.deckName).toBe("Python");
    expect(result.current.currentCardIndex).toBe(0);
  });

  it("should handle error when loading deck fails", async () => {
    fetch.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useDeckState("QhL3SFpO"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Network error");
    expect(result.current.currentCard).toBe(null);
  });

  it("should handle error when no deck ID provided", () => {
    const { result } = renderHook(() => useDeckState(null));

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe("No deck ID provided");
  });

  it("should track cards reviewed progress", async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockDeck,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockDueCards,
      });

    const { result } = renderHook(() => useDeckState("QhL3SFpO"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.currentCardIndex).toBe(0);
    expect(result.current.totalCards).toBe(2);
    expect(result.current.canGoNext).toBe(true);
  });

  it("should allow navigation between cards", async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockDeck,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockDueCards,
      });

    const { result } = renderHook(() => useDeckState("QhL3SFpO"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.canGoNext).toBe(true);
    expect(result.current.canGoPrevious).toBe(false);

    act(() => {
      result.current.nextCard();
    });

    expect(result.current.currentCard).toEqual(mockDueCards.cards[1].card);
    expect(result.current.canGoPrevious).toBe(true);
    expect(result.current.canGoNext).toBe(false);

    act(() => {
      result.current.previousCard();
    });

    expect(result.current.currentCard).toEqual(mockDueCards.cards[0].card);
    expect(result.current.canGoPrevious).toBe(false);
  });

  it("should not go before first card", async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockDeck,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockDueCards,
      });

    const { result } = renderHook(() => useDeckState("QhL3SFpO"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.currentCardIndex).toBe(0);

    act(() => {
      result.current.previousCard();
    });
    expect(result.current.currentCardIndex).toBe(0);
  });

  it("should reload deck and track progress", async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockDeck,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockDueCards,
      });

    const { result } = renderHook(() => useDeckState("QhL3SFpO"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.currentCardIndex).toBe(0);
    expect(result.current.totalCards).toBe(2);

    const updatedDueCards = {
      cards: [mockDueCards.cards[1]],
      total_due: 1,
    };

    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockDeck,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => updatedDueCards,
      });

    await act(async () => {
      await result.current.reloadDeck();
    });

    expect(result.current.totalCards).toBe(2);
    expect(result.current.currentCardIndex).toBe(1);
  });
});
