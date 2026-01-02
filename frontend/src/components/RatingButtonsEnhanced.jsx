const RatingButton = ({ remembered, label, disabled, onRate, variant }) => {
  const variants = {
    forgot: {
      hoverBorder: "hover:border-red-500/50",
      hoverText: "group-hover:text-red-400",
      hoverTextSub: "group-hover:text-red-400/70",
      hoverBorderTop: "group-hover:border-red-500/20",
      hoverBg: "group-hover:bg-red-500/50",
      hoverShadow: "hover:shadow-[0_0_20px_rgba(239,68,68,0.1)]",
    },
    remembered: {
      hoverBorder: "hover:border-green-500/50",
      hoverText: "group-hover:text-green-400",
      hoverTextSub: "group-hover:text-green-400/70",
      hoverBorderTop: "group-hover:border-green-500/20",
      hoverBg: "group-hover:bg-green-500/50",
      hoverShadow: "hover:shadow-[0_0_20px_rgba(34,197,94,0.1)]",
    },
  };

  const v = variants[variant];

  return (
    <button
      onClick={() => onRate(remembered)}
      disabled={disabled}
      className={`group relative flex flex-col items-center justify-center h-20 bg-surface hover:bg-surface-subtle border border-border ${v.hoverBorder} transition-all ${v.hoverShadow} hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0`}
    >
      <span
        className={`text-sm font-bold text-content-muted ${v.hoverText} uppercase tracking-widest transition-colors`}
      >
        {label}
      </span>
      <span
        className={`text-[10px] text-content-muted/50 ${v.hoverTextSub} font-mono mt-1 transition-colors border-t border-transparent ${v.hoverBorderTop} pt-1`}
      >
        {remembered ? "R" : "F"}
      </span>
      <div
        className={`absolute inset-x-0 bottom-0 h-0.5 bg-transparent ${v.hoverBg} transition-colors`}
      ></div>
    </button>
  );
};

export const RatingButtonsEnhanced = ({ onRate, disabled = false }) => {
  return (
    <div className="w-full py-6">
      <div className="bg-surface-subtle/20 border border-border p-6 backdrop-blur-sm relative overflow-hidden ring-1 ring-border/50">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50"></div>

        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  verified
                </span>
                Review Summary
              </h3>
              <p className="text-xs text-content-muted font-mono">
                Did you remember this card?
              </p>
            </div>
            <div className="px-2 py-1 bg-surface border border-border shadow-sm">
              <span className="text-[10px] text-primary font-mono font-bold tracking-tight">
                MOCHI SYNC
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <RatingButton
              remembered={false}
              label="Forgot"
              disabled={disabled}
              onRate={onRate}
              variant="forgot"
            />
            <RatingButton
              remembered={true}
              label="Remembered"
              disabled={disabled}
              onRate={onRate}
              variant="remembered"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
