import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/preact";
import { useCodeExecution } from "./useCodeExecution";

global.fetch = vi.fn();

describe("useCodeExecution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with correct default state", () => {
    const { result } = renderHook(() => useCodeExecution(true));

    expect(result.current.output).toBe(null);
    expect(result.current.isRunning).toBe(false);
    expect(result.current.queuedCode).toBe(null);
    expect(result.current.elapsedMs).toBe(0);
  });

  it("should execute code when backend is available", async () => {
    const mockResponse = {
      stdout: "Hello, World!",
      stderr: "",
      exit_code: 0,
      execution_time_ms: 50,
      memory_used_mb: 10,
      cpu_percent: 5,
      container_id: "abc123",
      language: "python",
      image_name: "python:3.11",
      file_path: "/tmp/solution.py",
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useCodeExecution(true));

    await act(async () => {
      await result.current.executeCode("print('Hello, World!')");
    });

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/execute/python",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ code: "print('Hello, World!')" }),
      })
    );
    expect(result.current.output).toEqual(mockResponse);
    expect(result.current.isRunning).toBe(false);
  });

  it("should set isRunning to true during execution", async () => {
    const mockResponse = {
      stdout: "output",
      stderr: "",
      exit_code: 0,
      execution_time_ms: 100,
    };

    let resolvePromise;
    fetch.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePromise = () =>
            resolve({
              ok: true,
              json: async () => mockResponse,
            });
        })
    );

    const { result } = renderHook(() => useCodeExecution(true));

    act(() => {
      result.current.executeCode("print('test')");
    });

    expect(result.current.isRunning).toBe(true);

    await act(async () => {
      resolvePromise();
    });

    await waitFor(() => {
      expect(result.current.isRunning).toBe(false);
    });
  });

  it("should queue code when backend is unavailable", async () => {
    const { result } = renderHook(() => useCodeExecution(false));

    await act(async () => {
      await result.current.executeCode("print('queued')");
    });

    expect(fetch).not.toHaveBeenCalled();
    expect(result.current.queuedCode).toBe("print('queued')");
    expect(result.current.isRunning).toBe(false);
  });

  it("should ignore duplicate execution requests while running", async () => {
    let resolvePromise;
    fetch.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePromise = () =>
            resolve({
              ok: true,
              json: async () => ({ stdout: "first", exit_code: 0 }),
            });
        })
    );

    const { result } = renderHook(() => useCodeExecution(true));

    act(() => {
      result.current.executeCode("first");
    });

    expect(result.current.isRunning).toBe(true);

    await act(async () => {
      await result.current.executeCode("second");
    });

    expect(fetch).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolvePromise();
    });

    await waitFor(() => {
      expect(result.current.isRunning).toBe(false);
    });
  });

  it("should handle execution error", async () => {
    fetch.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useCodeExecution(true));

    await act(async () => {
      await result.current.executeCode("print('fail')");
    });

    expect(result.current.output.stderr).toContain("Network error");
    expect(result.current.output.exit_code).toBe(-1);
    expect(result.current.isRunning).toBe(false);
  });

  it("should handle fetch failure with backend unavailable message", async () => {
    fetch.mockRejectedValueOnce(new Error("Failed to fetch"));

    const { result } = renderHook(() => useCodeExecution(true));

    await act(async () => {
      await result.current.executeCode("print('fail')");
    });

    expect(result.current.output.stderr).toContain("Backend unavailable");
    expect(result.current.output.exit_code).toBe(-1);
  });

  it("should execute code with different languages", async () => {
    const mockResponse = {
      stdout: "Ruby output",
      stderr: "",
      exit_code: 0,
      execution_time_ms: 30,
      language: "ruby",
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useCodeExecution(true));

    await act(async () => {
      await result.current.executeCode("puts 'Hello'", "ruby");
    });

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/execute/ruby",
      expect.any(Object)
    );
    expect(result.current.output.language).toBe("ruby");
  });

  it("should clear output when clearOutput is called", async () => {
    const mockResponse = { stdout: "output", exit_code: 0 };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useCodeExecution(true));

    await act(async () => {
      await result.current.executeCode("print('test')");
    });

    expect(result.current.output).not.toBe(null);

    act(() => {
      result.current.clearOutput();
    });

    expect(result.current.output).toBe(null);
  });

  it("should clear queued code after successful execution", async () => {
    const mockResponse = { stdout: "output", exit_code: 0 };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result, rerender } = renderHook(
      ({ available }) => useCodeExecution(available),
      { initialProps: { available: false } }
    );

    await act(async () => {
      await result.current.executeCode("print('queued')");
    });

    expect(result.current.queuedCode).toBe("print('queued')");

    rerender({ available: true });

    await act(async () => {
      await result.current.executeCode("print('new')");
    });

    expect(result.current.queuedCode).toBe(null);
  });
});
