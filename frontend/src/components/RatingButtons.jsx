export const RatingButtons = ({ onRate, disabled = false }) => {
  const buttons = [
    {
      remembered: false,
      label: "Forgot",
      key: "F",
      className:
        "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30 hover:border-red-400",
    },
    {
      remembered: true,
      label: "Remembered",
      key: "R",
      className:
        "bg-green-500/10 hover:bg-green-500/20 text-green-400 border-green-500/30 hover:border-green-400",
    },
  ];

  return (
    <div className="flex gap-3 mt-6">
      {buttons.map((btn) => (
        <button
          key={btn.label}
          onClick={() => onRate(btn.remembered)}
          disabled={disabled}
          className={`
            flex-1 px-4 py-3 border transition-all
            font-bold text-sm uppercase tracking-wider
            disabled:opacity-50 disabled:cursor-not-allowed
            ${btn.className}
          `}
        >
          <div className="flex flex-col items-center gap-1">
            <span>{btn.label}</span>
            <span className="text-xs opacity-60">({btn.key})</span>
          </div>
        </button>
      ))}
    </div>
  );
};
