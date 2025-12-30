import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from './api';

global.fetch = vi.fn();

describe('api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.log = vi.fn();
  });

  describe('checkHealth', () => {
    it('should return health data when status is ok', async () => {
      const mockData = { status: 'ok', containers: { python: 'running' }, uptime_seconds: 123 };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await api.checkHealth();

      expect(fetch).toHaveBeenCalledWith('http://localhost:8000/health');
      expect(result).toEqual(mockData);
    });

    it('should throw error when response is not ok', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
      });

      await expect(api.checkHealth()).rejects.toThrow('Health check failed');
    });

    it('should throw error when status is not ok', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'degraded', containers: {} }),
      });

      await expect(api.checkHealth()).rejects.toThrow('Backend containers not ready');
    });
  });

  describe('executeCode', () => {
    it('should execute python code successfully', async () => {
      const mockResult = {
        stdout: 'hello world\n',
        stderr: '',
        exit_code: 0,
        execution_time_ms: 123,
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResult,
      });

      const result = await api.executeCode('print("hello world")');

      expect(fetch).toHaveBeenCalledWith('http://localhost:8000/execute/python', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'print("hello world")' }),
      });
      expect(result).toEqual(mockResult);
    });

    it('should execute ruby code when language is specified', async () => {
      const mockResult = { stdout: 'Hello\n', stderr: '', exit_code: 0 };

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResult,
      });

      await api.executeCode('puts "Hello"', 'ruby');

      expect(fetch).toHaveBeenCalledWith('http://localhost:8000/execute/ruby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'puts "Hello"' }),
      });
    });

    it('should throw error when execution fails', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ detail: 'Syntax error' }),
      });

      await expect(api.executeCode('invalid code')).rejects.toThrow('Syntax error');
    });

    it('should handle json parse error in error response', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('JSON parse error');
        },
      });

      await expect(api.executeCode('code')).rejects.toThrow('Unknown error');
    });
  });

  describe('getDeck', () => {
    it('should fetch deck successfully', async () => {
      const mockDeck = {
        id: 'QhL3SFpO',
        name: 'Python',
        total_cards: 2,
        cards: [],
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockDeck,
      });

      const result = await api.getDeck('QhL3SFpO');

      expect(fetch).toHaveBeenCalledWith('http://localhost:8000/api/decks/QhL3SFpO');
      expect(result).toEqual(mockDeck);
    });

    it('should throw error when deck not found', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ detail: 'Deck not found' }),
      });

      await expect(api.getDeck('INVALID')).rejects.toThrow('Deck not found');
    });

    it('should handle json parse error', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => {
          throw new Error('Parse error');
        },
      });

      await expect(api.getDeck('test')).rejects.toThrow('Unknown error');
    });
  });

  describe('getCard', () => {
    it('should fetch card successfully', async () => {
      const mockCard = {
        id: 'card1',
        sections: [{ question: 'Q1', answer_code: 'A1' }],
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCard,
      });

      const result = await api.getCard('QhL3SFpO', 0);

      expect(fetch).toHaveBeenCalledWith('http://localhost:8000/api/decks/QhL3SFpO/cards/0');
      expect(result).toEqual(mockCard);
    });

    it('should throw error when card not found', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ detail: 'Card index out of range' }),
      });

      await expect(api.getCard('QhL3SFpO', 999)).rejects.toThrow('Card index out of range');
    });
  });
});
