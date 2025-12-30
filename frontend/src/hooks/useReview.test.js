import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useReview } from './useReview';

global.fetch = vi.fn();

describe('useReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useReview());

    expect(result.current.submitting).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should submit review successfully', async () => {
    const mockResponse = {
      success: true,
      next_review_date: '2025-01-02T10:00:00',
      difficulty: 5.2,
      stability: 2.5,
      state: 'review',
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useReview());

    let reviewResult;
    await act(async () => {
      reviewResult = await result.current.submitReview('user1', 'deck1', 'card1', 0, 3);
    });

    expect(fetch).toHaveBeenCalledWith('http://localhost:8000/api/review', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: 'user1',
        deck_id: 'deck1',
        card_id: 'card1',
        section_index: 0,
        rating: 3,
      }),
    });

    expect(reviewResult).toEqual(mockResponse);
    expect(result.current.submitting).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should set submitting state during submission', async () => {
    const mockResponse = { success: true };

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
      result.current.submitReview('user1', 'deck1', 'card1', 0, 3);
    });

    expect(result.current.submitting).toBe(true);

    await waitFor(() => {
      expect(result.current.submitting).toBe(false);
    });
  });

  it('should handle submission error with detail message', async () => {
    const errorDetail = 'Rating must be 1-4';

    fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ detail: errorDetail }),
    });

    const { result } = renderHook(() => useReview());

    let error;
    await act(async () => {
      try {
        await result.current.submitReview('user1', 'deck1', 'card1', 0, 5);
      } catch (err) {
        error = err;
      }
    });

    expect(error.message).toBe(errorDetail);
    expect(result.current.error).toBe(errorDetail);
    expect(result.current.submitting).toBe(false);
  });

  it('should handle submission error without detail message', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('JSON parse error');
      },
    });

    const { result } = renderHook(() => useReview());

    let error;
    await act(async () => {
      try {
        await result.current.submitReview('user1', 'deck1', 'card1', 0, 3);
      } catch (err) {
        error = err;
      }
    });

    expect(error.message).toBe('Failed to submit review');
    expect(result.current.error).toBe('Failed to submit review');
    expect(result.current.submitting).toBe(false);
  });

  it('should handle network error', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useReview());

    let error;
    await act(async () => {
      try {
        await result.current.submitReview('user1', 'deck1', 'card1', 0, 3);
      } catch (err) {
        error = err;
      }
    });

    expect(error.message).toBe('Network error');
    expect(result.current.error).toBe('Network error');
    expect(result.current.submitting).toBe(false);
  });

  it('should clear error on new submission', async () => {
    fetch.mockRejectedValueOnce(new Error('First error'));

    const { result } = renderHook(() => useReview());

    await act(async () => {
      try {
        await result.current.submitReview('user1', 'deck1', 'card1', 0, 3);
      } catch (err) {}
    });

    expect(result.current.error).toBe('First error');

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    await act(async () => {
      await result.current.submitReview('user1', 'deck1', 'card1', 0, 3);
    });

    expect(result.current.error).toBe(null);
  });

  it('should submit reviews with different ratings', async () => {
    const { result } = renderHook(() => useReview());

    for (const rating of [1, 2, 3, 4]) {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await act(async () => {
        await result.current.submitReview('user1', 'deck1', 'card1', 0, rating);
      });

      expect(fetch).toHaveBeenLastCalledWith(
        'http://localhost:8000/api/review',
        expect.objectContaining({
          body: expect.stringContaining(`"rating":${rating}`),
        })
      );
    }
  });
});
