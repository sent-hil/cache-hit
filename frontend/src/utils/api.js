const API_URL = 'http://localhost:8000';

export const api = {
  async checkHealth() {
    const response = await fetch(`${API_URL}/health`);
    if (!response.ok) {
      throw new Error('Health check failed');
    }
    const data = await response.json();
    // Check if status is 'ok' (all containers running)
    if (data.status !== 'ok') {
      throw new Error('Backend containers not ready');
    }
    return data;
  },

  async executeCode(code, language = 'python') {
    console.log('API: Sending execution request', { code, language });

    const response = await fetch(`${API_URL}/execute/${language}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    console.log('API: Response status', response.status);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Execution failed');
    }

    const result = await response.json();
    console.log('API: Response data', result);

    return result;
  },
};
