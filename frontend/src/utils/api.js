// Use VITE_API_URL if set, otherwise use relative URLs (same origin)
const API_URL = import.meta.env.VITE_API_URL || "";

export const api = {
  async checkHealth() {
    const response = await fetch(`${API_URL}/health`);
    if (!response.ok) {
      throw new Error("Health check failed");
    }
    const data = await response.json();
    if (data.status !== "ok") {
      throw new Error("Backend containers not ready");
    }
    return data;
  },

  async executeCode(code, language = "python") {
    console.log("API: Sending execution request", { code, language });

    const response = await fetch(`${API_URL}/execute/${language}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code }),
    });

    console.log("API: Response status", response.status);

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: "Unknown error" }));
      throw new Error(error.detail || "Execution failed");
    }

    const result = await response.json();
    console.log("API: Response data", result);

    return result;
  },

  async getDueCards() {
    const response = await fetch(`${API_URL}/api/due`);
    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: "Unknown error" }));
      throw new Error(error.detail || "Failed to load due cards");
    }
    return response.json();
  },

  async submitReview(cardId, sectionIndex, remembered, totalSections) {
    const response = await fetch(`${API_URL}/api/review`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        card_id: cardId,
        section_index: sectionIndex,
        remembered: remembered,
        total_sections: totalSections,
      }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: "Unknown error" }));
      throw new Error(error.detail || "Failed to submit review");
    }

    return response.json();
  },
};
