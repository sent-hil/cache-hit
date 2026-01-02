import { describe, it, expect, vi, beforeEach } from "vitest";
import { api } from "./api";

global.fetch = vi.fn();

describe("api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.log = vi.fn();
  });

  describe("checkHealth", () => {
    it("should return health data when status is ok", async () => {
      const mockData = {
        status: "ok",
        containers: { python: "running" },
        uptime_seconds: 123,
      };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await api.checkHealth();

      expect(fetch).toHaveBeenCalledWith("http://localhost:8000/health");
      expect(result).toEqual(mockData);
    });

    it("should throw error when response is not ok", async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
      });

      await expect(api.checkHealth()).rejects.toThrow("Health check failed");
    });

    it("should throw error when status is not ok", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "degraded", containers: {} }),
      });

      await expect(api.checkHealth()).rejects.toThrow(
        "Backend containers not ready"
      );
    });
  });

  describe("executeCode", () => {
    it("should execute python code successfully", async () => {
      const mockResult = {
        stdout: "hello world\n",
        stderr: "",
        exit_code: 0,
        execution_time_ms: 123,
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResult,
      });

      const result = await api.executeCode('print("hello world")');

      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8000/execute/python",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: 'print("hello world")' }),
        }
      );
      expect(result).toEqual(mockResult);
    });

    it("should execute ruby code when language is specified", async () => {
      const mockResult = { stdout: "Hello\n", stderr: "", exit_code: 0 };

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResult,
      });

      await api.executeCode('puts "Hello"', "ruby");

      expect(fetch).toHaveBeenCalledWith("http://localhost:8000/execute/ruby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: 'puts "Hello"' }),
      });
    });

    it("should throw error when execution fails", async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ detail: "Syntax error" }),
      });

      await expect(api.executeCode("invalid code")).rejects.toThrow(
        "Syntax error"
      );
    });

    it("should handle json parse error in error response", async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error("JSON parse error");
        },
      });

      await expect(api.executeCode("code")).rejects.toThrow("Unknown error");
    });
  });

  describe("getDueCards", () => {
    it("should fetch due cards successfully", async () => {
      const mockResponse = {
        cards: [
          {
            id: "card1",
            name: "Test Card",
            sections: [{ question: "Q1", answer: "A1" }],
            total_sections: 1,
          },
        ],
        total_due: 1,
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.getDueCards();

      expect(fetch).toHaveBeenCalledWith("http://localhost:8000/api/due");
      expect(result).toEqual(mockResponse);
    });

    it("should throw error when fetch fails", async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ detail: "Mochi unavailable" }),
      });

      await expect(api.getDueCards()).rejects.toThrow("Mochi unavailable");
    });

    it("should handle json parse error", async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => {
          throw new Error("Parse error");
        },
      });

      await expect(api.getDueCards()).rejects.toThrow("Unknown error");
    });
  });

  describe("submitReview", () => {
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

      const result = await api.submitReview("card1", 0, true, 1);

      expect(fetch).toHaveBeenCalledWith("http://localhost:8000/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_id: "card1",
          section_index: 0,
          remembered: true,
          total_sections: 1,
        }),
      });
      expect(result).toEqual(mockResponse);
    });

    it("should submit review with remembered false", async () => {
      const mockResponse = {
        success: true,
        card_complete: true,
        synced_to_mochi: true,
        aggregate_remembered: false,
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await api.submitReview("card1", 0, false, 1);

      expect(fetch).toHaveBeenCalledWith("http://localhost:8000/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_id: "card1",
          section_index: 0,
          remembered: false,
          total_sections: 1,
        }),
      });
    });

    it("should throw error when submit fails", async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ detail: "Failed to sync review to Mochi" }),
      });

      await expect(api.submitReview("card1", 0, true, 1)).rejects.toThrow(
        "Failed to sync review to Mochi"
      );
    });

    it("should handle json parse error", async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => {
          throw new Error("Parse error");
        },
      });

      await expect(api.submitReview("card1", 0, true, 1)).rejects.toThrow(
        "Unknown error"
      );
    });
  });
});
