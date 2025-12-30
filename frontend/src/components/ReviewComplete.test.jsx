import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ReviewComplete } from './ReviewComplete';
import { api } from '../utils/api';

vi.mock('../utils/api', () => ({
  api: {
    resetReviews: vi.fn(),
  },
}));

describe('ReviewComplete', () => {
  const mockOnRedo = vi.fn();
  const defaultProps = {
    userId: 'user1',
    deckId: 'QhL3SFpO',
    onRedo: mockOnRedo,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render completion message', () => {
    render(<ReviewComplete {...defaultProps} />);

    expect(screen.getByText('All reviews complete!')).toBeInTheDocument();
    expect(screen.getByText(/Excellent work/)).toBeInTheDocument();
  });

  it('should render redo button', () => {
    render(<ReviewComplete {...defaultProps} />);

    expect(screen.getByRole('button', { name: /Redo Reviews/i })).toBeInTheDocument();
  });

  it('should call resetReviews API when redo button is clicked', async () => {
    const user = userEvent.setup();
    api.resetReviews.mockResolvedValue({ success: true, cards_reset: 5 });

    render(<ReviewComplete {...defaultProps} />);

    const redoButton = screen.getByRole('button', { name: /Redo Reviews/i });
    await user.click(redoButton);

    expect(api.resetReviews).toHaveBeenCalledWith('user1', 'QhL3SFpO');
  });

  it('should call onRedo callback after successful reset', async () => {
    const user = userEvent.setup();
    api.resetReviews.mockResolvedValue({ success: true, cards_reset: 5 });

    render(<ReviewComplete {...defaultProps} />);

    const redoButton = screen.getByRole('button', { name: /Redo Reviews/i });
    await user.click(redoButton);

    await waitFor(() => {
      expect(mockOnRedo).toHaveBeenCalled();
    });
  });

  it('should show loading state while resetting', async () => {
    const user = userEvent.setup();
    api.resetReviews.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100)));

    render(<ReviewComplete {...defaultProps} />);

    const redoButton = screen.getByRole('button', { name: /Redo Reviews/i });
    await user.click(redoButton);

    expect(screen.getByText('Resetting...')).toBeInTheDocument();
    expect(redoButton).toBeDisabled();

    await waitFor(() => {
      expect(screen.queryByText('Resetting...')).not.toBeInTheDocument();
    });
  });

  it('should show error alert when reset fails', async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    api.resetReviews.mockRejectedValue(new Error('Network error'));

    render(<ReviewComplete {...defaultProps} />);

    const redoButton = screen.getByRole('button', { name: /Redo Reviews/i });
    await user.click(redoButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Failed to reset reviews: Network error');
    });

    alertSpy.mockRestore();
  });

  it('should not call onRedo when reset fails', async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    api.resetReviews.mockRejectedValue(new Error('Network error'));

    render(<ReviewComplete {...defaultProps} />);

    const redoButton = screen.getByRole('button', { name: /Redo Reviews/i });
    await user.click(redoButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });

    expect(mockOnRedo).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it('should re-enable button after reset completes', async () => {
    const user = userEvent.setup();
    api.resetReviews.mockResolvedValue({ success: true, cards_reset: 5 });

    render(<ReviewComplete {...defaultProps} />);

    const redoButton = screen.getByRole('button', { name: /Redo Reviews/i });
    await user.click(redoButton);

    await waitFor(() => {
      expect(mockOnRedo).toHaveBeenCalled();
    });

    expect(redoButton).not.toBeDisabled();
  });
});
