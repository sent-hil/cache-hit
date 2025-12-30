import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { RatingButtonsEnhanced } from './RatingButtonsEnhanced';

describe('RatingButtonsEnhanced', () => {
  it('should render all four rating buttons with labels', () => {
    render(<RatingButtonsEnhanced onRate={vi.fn()} />);

    expect(screen.getByText('Again')).toBeInTheDocument();
    expect(screen.getByText('Hard')).toBeInTheDocument();
    expect(screen.getByText('Good')).toBeInTheDocument();
    expect(screen.getByText('Easy')).toBeInTheDocument();
  });

  it('should show default intervals when not provided', () => {
    render(<RatingButtonsEnhanced onRate={vi.fn()} />);

    expect(screen.getByText('< 1m')).toBeInTheDocument();
    expect(screen.getByText('2d')).toBeInTheDocument();
    expect(screen.getByText('5d')).toBeInTheDocument();
    expect(screen.getByText('8d')).toBeInTheDocument();
  });

  it('should show custom intervals when provided', () => {
    const intervals = {
      again: '30s',
      hard: '1d',
      good: '3d',
      easy: '7d',
    };

    render(<RatingButtonsEnhanced onRate={vi.fn()} intervals={intervals} />);

    expect(screen.getByText('30s')).toBeInTheDocument();
    expect(screen.getByText('1d')).toBeInTheDocument();
    expect(screen.getByText('3d')).toBeInTheDocument();
    expect(screen.getByText('7d')).toBeInTheDocument();
  });

  it('should show FSRS badge', () => {
    render(<RatingButtonsEnhanced onRate={vi.fn()} />);

    expect(screen.getByText('FSRS v4.5 ENABLED')).toBeInTheDocument();
  });

  it('should show review summary header', () => {
    render(<RatingButtonsEnhanced onRate={vi.fn()} />);

    expect(screen.getByText('Review Summary')).toBeInTheDocument();
    expect(screen.getByText('Select recall difficulty to complete this card.')).toBeInTheDocument();
  });

  it('should call onRate with correct rating when button is clicked', async () => {
    const user = userEvent.setup();
    const handleRate = vi.fn();

    render(<RatingButtonsEnhanced onRate={handleRate} />);

    await user.click(screen.getByText('Again'));
    expect(handleRate).toHaveBeenCalledWith(1);

    await user.click(screen.getByText('Hard'));
    expect(handleRate).toHaveBeenCalledWith(2);

    await user.click(screen.getByText('Good'));
    expect(handleRate).toHaveBeenCalledWith(3);

    await user.click(screen.getByText('Easy'));
    expect(handleRate).toHaveBeenCalledWith(4);
  });

  it('should disable all buttons when disabled prop is true', () => {
    render(<RatingButtonsEnhanced onRate={vi.fn()} disabled={true} />);

    const buttons = screen.getAllByRole('button').filter(btn =>
      ['Again', 'Hard', 'Good', 'Easy'].some(label => btn.textContent.includes(label))
    );

    buttons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('should not call onRate when buttons are disabled', async () => {
    const user = userEvent.setup();
    const handleRate = vi.fn();

    render(<RatingButtonsEnhanced onRate={handleRate} disabled={true} />);

    await user.click(screen.getByText('Again'));
    await user.click(screen.getByText('Good'));

    expect(handleRate).not.toHaveBeenCalled();
  });
});
