export const Footer = ({
  onSkipCard,
  onPreviousCard,
  canGoNext,
  canGoPrevious,
}) => {
  return (
    <footer className="h-14 border-t border-border bg-surface-panel shrink-0 z-20">
      <div className="h-full px-6 flex items-center justify-between">
        <div className="flex items-center gap-6 text-[10px] font-bold text-content-muted uppercase tracking-widest hidden sm:flex">
          <div className="flex items-center gap-2">
            <kbd className="h-5 flex items-center justify-center min-w-[20px] rounded-sm bg-surface-subtle border border-border px-1 font-mono text-content">
              ⌘ ↵
            </kbd>
            <span>Run</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="h-5 flex items-center justify-center min-w-[20px] rounded-sm bg-surface-subtle border border-border px-1 font-mono text-content">
              ← →
            </kbd>
            <span>Prev/Next</span>
          </div>
        </div>

        <div className="flex items-center gap-3 ml-auto sm:ml-0 w-full sm:w-auto justify-end">
          <button
            onClick={onPreviousCard}
            disabled={!canGoPrevious}
            className={`px-4 py-2 text-xs font-bold border border-transparent transition-colors uppercase tracking-wider ${
              canGoPrevious
                ? "text-content-muted hover:text-content hover:border-border"
                : "text-content-muted opacity-50 cursor-not-allowed"
            }`}
          >
            ← Prev
          </button>
          <button
            onClick={onSkipCard}
            disabled={!canGoNext}
            className={`px-4 py-2 text-xs font-bold border border-transparent transition-colors uppercase tracking-wider ${
              canGoNext
                ? "text-content-muted hover:text-content hover:border-border"
                : "text-content-muted opacity-50 cursor-not-allowed"
            }`}
          >
            Next →
          </button>
        </div>
      </div>
    </footer>
  );
};
