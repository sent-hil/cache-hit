import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useReview } from "./useReview";

global.fetch = vi.fn();

describe("useReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with correct default state", () => {
    const { result } = renderHook(() => useReview());

    expect(result.current.submitting).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.syncError).toBe(null);
  });

  it("should submit review successfully", async () => {
    const mockResponse = {
      success: true,
      card_complete: true,
      synced_to_mochi: true,
      sections_reviewed: 1,
      total_sections: 1,
      aggregate_remembered: true,
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useReview());

    let reviewResult;
    await act(async () => {
      reviewResult = await result.current.submitReview("card1", 0, true, 1);
    });

    expect(fetch).toHaveBeenCalledWith("http://localhost:8000/api/review", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        card_id: "card1",
        section_index: 0,
        remembered: true,
        total_sections: 1,
      }),
    });

    expect(reviewResult).toEqual(mockResponse);
    expect(result.current.submitting).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it("should set submitting state during submission", async () => {
    const mockResponse = { success: true, card_complete: false };

    fetch.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => mockResponse,
              }),
            100
          )
        )
    );

    const { result } = renderHook(() => useReview());

    act(() => {
      result.current.submitReview("card1", 0, true, 2);
    });

    expect(result.current.submitting).toBe(true);

    await waitFor(() => {
      expect(result.current.submitting).toBe(false);
    });
  });

  it("should handle Mochi sync error", async () => {
    const errorDetail = "Failed to sync review to Mochi: Connection error";

    fetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({ detail: errorDetail }),
    });

    const { result } = renderHook(() => useReview());

    let error;
    await act(async () => {
      try {
        await result.current.submitReview("card1", 0, true, 1);
      } catch (err) {
        error = err;
      }
    });

    expect(error.message).toBe(errorDetail);
    expect(result.current.syncError).toBe(errorDetail);
    expect(result.current.submitting).toBe(false);
  });

  it("should handle submission error without detail message", async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("JSON parse error");
      },
    });

    const { result } = renderHook(() => useReview());

    let error;
    await act(async () => {
      try {
        await result.current.submitReview("card1", 0, true, 1);
      } catch (err) {
        error = err;
      }
    });

    expect(error.message).toBe("Unknown error");
    expect(result.current.error).toBe("Unknown error");
    expect(result.current.submitting).toBe(false);
  });

  it("should handle network error", async () => {
    fetch.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useReview());

    let error;
    await act(async () => {
      try {
        await result.current.submitReview("card1", 0, true, 1);
      } catch (err) {
        error = err;
      }
    });

    expect(error.message).toBe("Network error");
    expect(result.current.error).toBe("Network error");
    expect(result.current.submitting).toBe(false);
  });

  it("should clear error on new submission", async () => {
    fetch.mockRejectedValueOnce(new Error("First error"));

    const { result } = renderHook(() => useReview());

    await act(async () => {
      try {
        await result.current.submitReview("card1", 0, true, 1);
      } catch (err) {}
    });

    expect(result.current.error).toBe("First error");

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, card_complete: true }),
    });

    await act(async () => {
      await result.current.submitReview("card1", 0, true, 1);
    });

    expect(result.current.error).toBe(null);
  });

  it("should submit reviews with remembered true and false", async () => {
    const { result } = renderHook(() => useReview());

    for (const remembered of [true, false]) {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, card_complete: true }),
      });

      await act(async () => {
        await result.current.submitReview("card1", 0, remembered, 1);
      });

      expect(fetch).toHaveBeenLastCalledWith(
        "http://localhost:8000/api/review",
        expect.objectContaining({
          body: expect.stringContaining(`"remembered":${remembered}`),
        })
      );
    }
  });

  it("should clear sync error when clearSyncError is called", async () => {
    const errorDetail = "Failed to sync review to Mochi";

    fetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({ detail: errorDetail }),
    });

    const { result } = renderHook(() => useReview());

    await act(async () => {
      try {
        await result.current.submitReview("card1", 0, true, 1);
      } catch (err) {}
    });

    expect(result.current.syncError).toBe(errorDetail);

    act(() => {
      result.current.clearSyncError();
    });

    expect(result.current.syncError).toBe(null);
  });
});
