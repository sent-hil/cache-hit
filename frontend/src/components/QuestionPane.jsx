import { useState } from 'react';

const mockCard = {
  title: "Slice Reversal",
  description: "Reverse a list in Python using slicing syntax. Write a single line of code that reverses the given list without using any built-in reverse methods.",
  contextCode: "my_list = [1, 2, 3, 4, 5]\n# Expected Output: [5, 4, 3, 2, 1]",
  hint: "Remember that slice notation takes three arguments: [start:stop:step]. A negative step value can be used to reverse the sequence. Think about what happens when you use [::-1].",
};

export const QuestionPane = () => {
  const [showHint, setShowHint] = useState(false);

  return (
    <div className="h-full bg-surface-dark border-r border-border overflow-y-auto custom-scrollbar">
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">{mockCard.title}</h2>
        </div>

        {/* Description */}
        <div className="text-text-muted leading-relaxed">
          {mockCard.description}
        </div>

        {/* Context */}
        <div>
          <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">code</span>
            Context
          </h3>
          <div className="bg-terminal-bg rounded-lg border border-border-light overflow-hidden">
            <pre className="p-4 text-sm font-mono text-[#e6edf3] overflow-x-auto custom-scrollbar">
              <code>{mockCard.contextCode}</code>
            </pre>
          </div>
        </div>

        {/* Hint Section */}
        <div className="border border-border-light rounded-lg overflow-hidden">
          <button
            onClick={() => setShowHint(!showHint)}
            className="w-full px-4 py-3 flex items-center justify-between bg-surface-darker hover:bg-surface-dark transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-white">
              <span className="material-symbols-outlined text-lg">lightbulb</span>
              Hint
            </span>
            <span className="material-symbols-outlined text-text-muted">
              {showHint ? 'expand_less' : 'expand_more'}
            </span>
          </button>
          {showHint && (
            <div className="px-4 py-3 bg-surface-darker border-t border-border-light">
              <p className="text-sm text-text-muted leading-relaxed">
                {mockCard.hint}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
