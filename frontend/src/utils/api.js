const API_URL = 'http://localhost:8000';

export const api = {
  async checkHealth() {
    const response = await fetch(`${API_URL}/health`);
    if (!response.ok) {
      throw new Error('Health check failed');
    }
    return response.json();
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
