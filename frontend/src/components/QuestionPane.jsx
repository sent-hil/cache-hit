import { useState } from 'react';

const mockCard = {
  title: "Slice Reversal",
  description: "Reverse a list in Python using slicing syntax. Assume the list is named ",
  descriptionCode: "my_list",
  descriptionEnd: ". The operation should return a new list that contains the elements of the original list in reverse order.",
  contextCode: "# Initial list state\nmy_list = [1, 2, 3, 4, 5]\n# Expected Output: [5, 4, 3, 2, 1]",
  hint: "Remember that slice notation takes three arguments: [start:stop:step]. Consider what a negative step value does.",
};

export const QuestionPane = () => {
  return (
    <section className="w-full flex flex-col border-r border-border bg-surface overflow-y-auto custom-scrollbar relative">
      <div className="max-w-4xl w-full mx-auto p-8 flex flex-col gap-8">
        <div className="flex flex-col gap-4 border-b border-border pb-8 border-dashed">
          <h1 className="text-2xl font-bold text-white tracking-tight">{mockCard.title}</h1>
          <p className="text-content leading-relaxed font-sans text-lg">
            {mockCard.description}
            <code className="text-primary bg-surface-subtle px-1.5 py-0.5 border border-border text-sm">
              {mockCard.descriptionCode}
            </code>
            {mockCard.descriptionEnd}
          </p>
        </div>

        {/* Context */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-baseline">
            <span className="text-xs font-bold text-content-muted uppercase tracking-widest">
              // CONTEXT
            </span>
            <span className="text-xs text-content-muted font-mono">read-only</span>
          </div>
          <div className="border border-border bg-surface-panel p-4 overflow-x-auto">
            <pre className="font-mono text-sm leading-relaxed">
              <code dangerouslySetInnerHTML={{
                __html: mockCard.contextCode
                  .replace(/(# .*)/g, '<span class="syntax-c">$1</span>')
                  .replace(/\b(my_list)\b/g, '<span class="syntax-v">$1</span>')
                  .replace(/\b(\d+)\b/g, '<span class="syntax-n">$1</span>')
              }} />
            </pre>
          </div>
        </div>

        {/* Hint Section */}
        <details className="group border border-border bg-surface open:bg-surface-subtle transition-colors">
          <summary className="flex items-center justify-between p-3 cursor-pointer select-none">
            <div className="flex items-center gap-3">
              <span className="text-accent font-bold font-mono text-sm">? HINT</span>
              <span className="text-xs text-content-muted group-open:hidden">Click to expand...</span>
            </div>
            <span className="material-symbols-outlined text-content-muted text-[16px] group-open:rotate-180 transition-transform">
              expand_more
            </span>
          </summary>
          <div className="px-3 pb-3 pt-1 text-sm text-content font-sans border-t border-border border-dashed mt-2">
            <div className="pt-2">
              {mockCard.hint.split('[start:stop:step]').map((part, i, arr) => (
                i < arr.length - 1 ? (
                  <span key={i}>
                    {part}
                    <code className="bg-surface-panel border border-border px-1 text-primary">
                      [start:stop:step]
                    </code>
                  </span>
                ) : part
              ))}
            </div>
          </div>
        </details>
      </div>
    </section>
  );
};
