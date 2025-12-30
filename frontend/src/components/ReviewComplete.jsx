export const ReviewComplete = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-surface-panel border border-border shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden flex flex-col items-center text-center p-10">
        <div className="absolute inset-0 z-0 pointer-events-none opacity-40" style={{
          background: `repeating-linear-gradient(
            0deg,
            rgba(0, 0, 0, 0),
            rgba(0, 0, 0, 0) 1px,
            rgba(255, 255, 255, 0.02) 1px,
            rgba(255, 255, 255, 0.02) 2px
          )`
        }}></div>

        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>

        <div className="size-20 rounded-full bg-primary/5 border border-primary/20 flex items-center justify-center mb-8 z-10 shadow-[0_0_10px_rgba(88,166,255,0.1)] relative group">
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse"></div>
          <span className="material-symbols-outlined text-primary text-4xl relative">done_all</span>
        </div>

        <div className="z-10 relative">
          <h2 className="text-2xl font-bold text-white font-display mb-3 tracking-tight">
            All reviews complete!
          </h2>
          <p className="text-content-muted text-sm leading-relaxed mb-8 max-w-[280px] mx-auto">
            Excellent work. You've cleared your deck for now. Come back tomorrow for more cards!
          </p>
          <button
            onClick={onClose}
            className="w-full py-3 px-6 bg-primary hover:bg-[#4b96ef] text-white font-bold text-xs uppercase tracking-widest transition-all border border-primary shadow-[0_0_20px_rgba(88,166,255,0.2)] hover:shadow-[0_0_30px_rgba(88,166,255,0.4)] flex items-center justify-center gap-3 group"
          >
            <span className="material-symbols-outlined text-lg group-hover:-translate-x-1 transition-transform">
              arrow_back
            </span>
            <span>Return to Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
};
