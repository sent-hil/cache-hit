export const Footer = () => {
  return (
    <footer className="h-14 border-t border-border bg-surface-panel shrink-0 z-20">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Keyboard Shortcuts */}
        <div className="flex items-center gap-6 text-[10px] font-bold text-content-muted uppercase tracking-widest hidden sm:flex">
          <div className="flex items-center gap-2">
            <kbd className="h-5 flex items-center justify-center min-w-[20px] rounded-sm bg-surface-subtle border border-border px-1 font-mono text-content">
              ⌘ ↵
            </kbd>
            <span>Run</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 ml-auto sm:ml-0 w-full sm:w-auto justify-end">
          <button className="px-4 py-2 text-xs font-bold text-content-muted hover:text-content border border-transparent hover:border-border transition-colors uppercase tracking-wider">
            Skip Card
          </button>
          <button className="group relative px-6 py-2 bg-primary hover:bg-[#4b96ef] text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 border border-primary hover:border-[#8ec2ff] shadow-sm">
            <span className="material-symbols-outlined text-[16px]">visibility</span>
            Show Answer
          </button>
        </div>
      </div>
    </footer>
  );
};
