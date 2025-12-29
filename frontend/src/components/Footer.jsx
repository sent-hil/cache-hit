export const Footer = () => {
  return (
    <footer className="h-16 border-t border-border bg-surface-darker flex items-center justify-between px-6 shrink-0">
      {/* Keyboard Shortcuts */}
      <div className="flex items-center gap-6 text-text-muted text-sm">
        <div className="flex items-center gap-2">
          <kbd className="px-2 py-1 bg-surface-dark border border-border-light rounded text-xs font-mono">
            ⌘ Enter
          </kbd>
          <span>Run Code</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="px-2 py-1 bg-surface-dark border border-border-light rounded text-xs font-mono">
            Space
          </kbd>
          <span>Show Answer</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button className="px-4 py-2 rounded-lg text-sm font-medium text-text-muted hover:text-white hover:bg-surface-dark transition-colors flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">skip_next</span>
          Skip Card
        </button>
        <button className="px-5 py-2 rounded-lg text-sm font-semibold bg-primary hover:bg-primary/90 text-white transition-colors flex items-center gap-2 shadow-lg shadow-primary/20">
          <span className="material-symbols-outlined text-lg">visibility</span>
          Show Answer
        </button>
      </div>
    </footer>
  );
};
