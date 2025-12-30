import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAnswerVisibility } from './useAnswerVisibility';

describe('useAnswerVisibility', () => {
  it('should initialize with answer hidden and your-code tab active', () => {
    const { result } = renderHook(() => useAnswerVisibility(0, 0));

    expect(result.current.showAnswer).toBe(false);
    expect(result.current.activeTab).toBe('your-code');
  });

  it('should show answer and switch to answer tab', () => {
    const { result } = renderHook(() => useAnswerVisibility(0, 0));

    act(() => {
      result.current.handleShowAnswer();
    });

    expect(result.current.showAnswer).toBe(true);
    expect(result.current.activeTab).toBe('answer');
  });

  it('should hide answer and switch back to your-code tab', () => {
    const { result } = renderHook(() => useAnswerVisibility(0, 0));

    act(() => {
      result.current.handleShowAnswer();
    });

    expect(result.current.showAnswer).toBe(true);

    act(() => {
      result.current.handleHideAnswer();
    });

    expect(result.current.showAnswer).toBe(false);
    expect(result.current.activeTab).toBe('your-code');
  });

  it('should change tabs', () => {
    const { result } = renderHook(() => useAnswerVisibility(0, 0));

    act(() => {
      result.current.handleShowAnswer();
    });

    expect(result.current.activeTab).toBe('answer');

    act(() => {
      result.current.handleTabChange('your-code');
    });

    expect(result.current.activeTab).toBe('your-code');
  });

  it('should reset state when card index changes', () => {
    const { result, rerender } = renderHook(
      ({ cardIndex, sectionIndex }) => useAnswerVisibility(cardIndex, sectionIndex),
      { initialProps: { cardIndex: 0, sectionIndex: 0 } }
    );

    act(() => {
      result.current.handleShowAnswer();
    });

    expect(result.current.showAnswer).toBe(true);
    expect(result.current.activeTab).toBe('answer');

    rerender({ cardIndex: 1, sectionIndex: 0 });

    expect(result.current.showAnswer).toBe(false);
    expect(result.current.activeTab).toBe('your-code');
  });

  it('should reset state when section index changes', () => {
    const { result, rerender } = renderHook(
      ({ cardIndex, sectionIndex }) => useAnswerVisibility(cardIndex, sectionIndex),
      { initialProps: { cardIndex: 0, sectionIndex: 0 } }
    );

    act(() => {
      result.current.handleShowAnswer();
    });

    expect(result.current.showAnswer).toBe(true);
    expect(result.current.activeTab).toBe('answer');

    rerender({ cardIndex: 0, sectionIndex: 1 });

    expect(result.current.showAnswer).toBe(false);
    expect(result.current.activeTab).toBe('your-code');
  });

  it('should reset state when both card and section index change', () => {
    const { result, rerender } = renderHook(
      ({ cardIndex, sectionIndex }) => useAnswerVisibility(cardIndex, sectionIndex),
      { initialProps: { cardIndex: 0, sectionIndex: 0 } }
    );

    act(() => {
      result.current.handleShowAnswer();
    });

    expect(result.current.showAnswer).toBe(true);

    rerender({ cardIndex: 1, sectionIndex: 2 });

    expect(result.current.showAnswer).toBe(false);
    expect(result.current.activeTab).toBe('your-code');
  });
});
