import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/preact";
import { useTimer } from "./useTimer";

describe("useTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should initialize with zero elapsed time and not running", () => {
    const { result } = renderHook(() => useTimer());

    expect(result.current.elapsedMs).toBe(0);
    expect(result.current.isRunning).toBe(false);
  });

  it("should start the timer", () => {
    const { result } = renderHook(() => useTimer());

    act(() => {
      result.current.start();
    });

    expect(result.current.isRunning).toBe(true);
    expect(result.current.elapsedMs).toBe(0);
  });

  it("should increment elapsed time when running", () => {
    const { result } = renderHook(() => useTimer());

    act(() => {
      result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.elapsedMs).toBeGreaterThanOrEqual(400);
  });

  it("should stop the timer", () => {
    const { result } = renderHook(() => useTimer());

    act(() => {
      result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    const elapsedBeforeStop = result.current.elapsedMs;

    act(() => {
      result.current.stop();
    });

    expect(result.current.isRunning).toBe(false);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.elapsedMs).toBe(elapsedBeforeStop);
  });

  it("should reset the timer", () => {
    const { result } = renderHook(() => useTimer());

    act(() => {
      result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.elapsedMs).toBeGreaterThan(0);

    act(() => {
      result.current.reset();
    });

    expect(result.current.elapsedMs).toBe(0);
    expect(result.current.isRunning).toBe(false);
  });

  it("should clean up interval on unmount", () => {
    const { result, unmount } = renderHook(() => useTimer());

    act(() => {
      result.current.start();
    });

    const clearIntervalSpy = vi.spyOn(global, "clearInterval");

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
