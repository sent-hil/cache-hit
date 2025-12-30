import { useEffect } from 'react';
import { RatingButtons } from './RatingButtons';
import { useReview } from '../hooks/useReview';

const highlightPython = (code) => {
  // First escape HTML to prevent conflicts
  let result = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Use unique markers that won't match any of our regex patterns
  // Using lowercase letters and special chars that won't match \b or [A-Z]
  result = result
    .replace(/(#.*)/g, '§§comment1§§$1§§comment2§§') // Comments
    .replace(/\b(def|class|import|from|return|if|elif|else|for|while|in|range|len|print|with|as|try|except|finally|raise|pass|break|continue|yield|lambda|True|False|None)\b/g, '§§keyword1§§$1§§keyword2§§') // Keywords
    .replace(/\b([A-Z][a-zA-Z0-9_]*)\b/g, '§§classname1§§$1§§classname2§§') // Classes
    .replace(/"([^"]*)"/g, '"§§string1§§$1§§string2§§"') // Strings
    .replace(/'([^']*)'/g, "'§§string1§§$1§§string2§§'") // Strings
    .replace(/\b(\d+\.?\d*)\b/g, '§§number1§§$1§§number2§§'); // Numbers

  // Finally convert markers to HTML
  result = result
    .replace(/§§comment1§§/g, '<span class="syntax-c">')
    .replace(/§§comment2§§/g, '</span>')
    .replace(/§§keyword1§§/g, '<span class="syntax-k">')
    .replace(/§§keyword2§§/g, '</span>')
    .replace(/§§classname1§§/g, '<span class="syntax-f">')
    .replace(/§§classname2§§/g, '</span>')
    .replace(/§§string1§§/g, '<span class="syntax-s">')
    .replace(/§§string2§§/g, '</span>')
    .replace(/§§number1§§/g, '<span class="syntax-n">')
    .replace(/§§number2§§/g, '</span>');

  return result;
};

export const QuestionPane = ({
  card,
  deckName,
  loading,
  error,
  currentSectionIndex,
  totalSections,
  onNextSection,
  onGoToSection,
  canGoNextSection,
  onNextCard,
  canGoNextCard,
  onShowAnswer,
  onHideAnswer,
  showAnswer,
  deckId,
}) => {
  const { submitReview, submitting } = useReview();
  const userId = 'user1'; // Hardcoded for now

  // Keyboard shortcuts for rating (1/2/3/4)
  useEffect(() => {
    if (!showAnswer) return;

    const handleKeyPress = (e) => {
      const rating = parseInt(e.key);
      if (rating >= 1 && rating <= 4) {
        handleRate(rating);
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [showAnswer, card, currentSectionIndex]);

  const handleRate = async (rating) => {
    if (!card || submitting) return;

    try {
      const result = await submitReview(userId, deckId, card.id, currentSectionIndex, rating);
      console.log('Review submitted successfully:', result);

      // Move to next section or next card
      if (canGoNextSection) {
        onNextSection();
      } else if (canGoNextCard) {
        // Last section of current card, move to next card
        onNextCard();
      } else {
        // No more cards/sections
        onHideAnswer();
        alert('All reviews completed!');
      }
    } catch (err) {
      console.error('Failed to submit review:', err);
      alert('Failed to submit review: ' + err.message);
    }
  };
  if (loading) {
    return (
      <section className="w-full flex flex-col border-r border-border bg-surface overflow-y-auto custom-scrollbar relative">
        <div className="max-w-4xl w-full mx-auto p-8 flex items-center justify-center">
          <div className="text-content-muted">Loading deck...</div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="w-full flex flex-col border-r border-border bg-surface overflow-y-auto custom-scrollbar relative">
        <div className="max-w-4xl w-full mx-auto p-8 flex items-center justify-center">
          <div className="text-red-400">Error: {error}</div>
        </div>
      </section>
    );
  }

  if (!card) {
    return (
      <section className="w-full flex flex-col border-r border-border bg-surface overflow-y-auto custom-scrollbar relative">
        <div className="max-w-4xl w-full mx-auto p-8 flex items-center justify-center">
          <div className="text-content-muted">No card selected</div>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full flex flex-col border-r border-border bg-surface overflow-y-auto custom-scrollbar relative pb-20">
      <div className="max-w-4xl w-full mx-auto p-8 flex flex-col gap-8">
        <div className="flex items-center bg-surface-subtle border border-border p-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-8 bg-accent/10 border border-accent/20 text-accent">
              <span className="material-symbols-outlined text-[18px]">layers</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-content-muted uppercase tracking-widest font-bold">
                Current Section
              </span>
              <span className="text-sm font-bold text-white tracking-wide font-display">
                SECTION {currentSectionIndex + 1}{' '}
                <span className="text-content-muted font-normal">/ {totalSections}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col relative">
          <div className="absolute left-[11px] top-8 bottom-12 w-px bg-border"></div>

          {card.sections.map((section, index) => {
            const isActive = index === currentSectionIndex;

            return (
              <div
                key={index}
                className={`flex gap-5 relative mb-12 ${
                  isActive ? '' : 'opacity-60 hover:opacity-100 transition-opacity'
                } group`}
              >
                <div className="shrink-0 z-10">
                  {isActive ? (
                    <div className="size-6 bg-primary text-surface font-bold font-mono text-xs flex items-center justify-center rounded-sm shadow-[0_0_10px_rgba(88,166,255,0.4)] ring-4 ring-surface">
                      {index + 1}
                    </div>
                  ) : (
                    <button
                      onClick={() => onGoToSection(index)}
                      className="size-6 bg-surface-panel border border-border text-content-muted hover:text-white hover:border-white font-bold font-mono text-xs flex items-center justify-center rounded-sm ring-4 ring-surface transition-colors cursor-pointer"
                    >
                      {index + 1}
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-6 flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h1
                        className={`text-2xl font-bold tracking-tight font-mono ${
                          isActive
                            ? 'text-white'
                            : 'text-content-muted group-hover:text-white transition-colors cursor-pointer'
                        }`}
                        onClick={() => !isActive && onGoToSection(index)}
                      >
                        {index === 0 ? card.title : section.question.split('\n')[0]}
                      </h1>
                      {isActive && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="flex size-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                          </span>
                          <span className="text-[10px] text-primary uppercase tracking-wider font-bold">
                            Active Question
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {isActive && section.question.includes('```') && (
                    <div className="flex flex-col gap-2">
                      <div className="border border-border bg-surface-panel p-4 overflow-x-auto relative">
                        <div className="absolute top-0 left-0 w-1 h-full bg-border"></div>
                        <pre
                          className="font-mono text-sm leading-relaxed"
                          dangerouslySetInnerHTML={{
                            __html: highlightPython(
                              section.question.split('```')[1]?.replace(/^python\n/, '').replace(/^\n/, '') || ''
                            )
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {isActive && (
                    <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-border/50 border-dashed">
                      {currentSectionIndex > 0 && (
                        <button
                          onClick={() => onGoToSection(currentSectionIndex - 1)}
                          className="px-4 py-2 bg-surface-subtle hover:bg-surface-panel text-content text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 border border-border hover:border-accent shadow-sm group"
                        >
                          <span className="material-symbols-outlined text-[16px] text-accent transition-colors">
                            arrow_upward
                          </span>
                          <span>Prev Section</span>
                        </button>
                      )}
                      {canGoNextSection && (
                        <button
                          onClick={onNextSection}
                          className="px-4 py-2 bg-surface-subtle hover:bg-surface-panel text-content text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 border border-border hover:border-accent shadow-sm group"
                        >
                          <span className="material-symbols-outlined text-[16px] text-accent transition-colors">
                            arrow_downward
                          </span>
                          <span>Next Section</span>
                        </button>
                      )}
                      {!showAnswer ? (
                        <button
                          onClick={onShowAnswer}
                          className="group relative px-6 py-2 bg-primary hover:bg-[#4b96ef] text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 border border-primary hover:border-[#8ec2ff] shadow-sm ml-auto"
                        >
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                          Show Answer
                        </button>
                      ) : (
                        <div className="w-full">
                          {currentSectionIndex === totalSections - 1 ? (
                            <RatingButtons onRate={handleRate} disabled={submitting} />
                          ) : (
                            <div className="flex justify-end">
                              <button
                                onClick={() => {
                                  onHideAnswer();
                                  onNextSection();
                                }}
                                className="px-6 py-3 bg-primary hover:bg-[#4b96ef] text-white text-sm font-bold uppercase tracking-wider transition-all flex items-center gap-2 border border-primary hover:border-[#8ec2ff] shadow-sm"
                              >
                                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                                Continue to Next Section
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
