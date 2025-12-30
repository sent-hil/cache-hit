import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { RunButton } from './RunButton';

describe('RunButton', () => {
  it('should render with "Run" text when not running', () => {
    render(<RunButton onClick={vi.fn()} isRunning={false} />);

    expect(screen.getByRole('button')).toHaveTextContent('Run');
  });

  it('should render with "Running..." text when running', () => {
    render(<RunButton onClick={vi.fn()} isRunning={true} />);

    expect(screen.getByRole('button')).toHaveTextContent('Running...');
  });

  it('should call onClick when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<RunButton onClick={handleClick} isRunning={false} />);

    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when isRunning is true', () => {
    render(<RunButton onClick={vi.fn()} isRunning={true} />);

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<RunButton onClick={vi.fn()} isRunning={false} disabled={true} />);

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should not call onClick when disabled', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<RunButton onClick={handleClick} isRunning={false} disabled={true} />);

    await user.click(screen.getByRole('button'));

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should show spinner icon when running', () => {
    const { container } = render(<RunButton onClick={vi.fn()} isRunning={true} />);

    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should show play icon when not running', () => {
    const { container } = render(<RunButton onClick={vi.fn()} isRunning={false} />);

    const spinner = container.querySelector('.animate-spin');
    expect(spinner).not.toBeInTheDocument();
  });
});
