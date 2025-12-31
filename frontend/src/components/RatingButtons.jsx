export const RatingButtons = ({ onRate, disabled = false }) => {
  const buttons = [
    {
      rating: 1,
      label: "Again",
      key: "1",
      className:
        "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30 hover:border-red-400",
    },
    {
      rating: 2,
      label: "Hard",
      key: "2",
      className:
        "bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border-orange-500/30 hover:border-orange-400",
    },
    {
      rating: 3,
      label: "Good",
      key: "3",
      className:
        "bg-green-500/10 hover:bg-green-500/20 text-green-400 border-green-500/30 hover:border-green-400",
    },
    {
      rating: 4,
      label: "Easy",
      key: "4",
      className:
        "bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/30 hover:border-blue-400",
    },
  ];

  return (
    <div className="flex gap-3 mt-6">
      {buttons.map((btn) => (
        <button
          key={btn.rating}
          onClick={() => onRate(btn.rating)}
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
