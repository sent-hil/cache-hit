import { useEffect, useCallback, useRef } from "react";
import { RatingButtonsEnhanced } from "./RatingButtonsEnhanced";
import { useReview } from "../hooks/useReview";
import katex from "katex";
import "katex/dist/katex.min.css";

// Helper to reveal the next hidden cloze in the document
// Returns true if a cloze was revealed, false if none remaining
export const revealNextCloze = () => {
  const hiddenClozes = document.querySelectorAll('.cloze-hidden[data-revealed="false"]');
  if (hiddenClozes.length > 0) {
    hiddenClozes[0].dataset.revealed = "true";
    return true;
  }
  return false;
};

// Check if there are any unrevealed clozes
export const hasUnrevealedClozes = () => {
  return document.querySelectorAll('.cloze-hidden[data-revealed="false"]').length > 0;
};

// Handle Mochi cloze deletions: {{hidden text}} -> clickable hidden span
export const renderCloze = (text) => {
  return text.replace(
    /\{\{([^}]+)\}\}/g,
    (match, content) => {
      return `<span class="cloze-hidden" data-revealed="false" onclick="this.dataset.revealed = this.dataset.revealed === 'true' ? 'false' : 'true'">${content}</span>`;
    }
  );
};

const renderMedia = (text) => {
  // Handle markdown image syntax with @media references: ![alt](@media/filename.png)
  // Mochi API doesn't expose image fetching, so show placeholder
  return text.replace(
    /!\[([^\]]*)\]\(@media\/([^)]+)\)/g,
    (match, alt, filename) => {
      return `<div class="inline-flex items-center gap-3 px-4 py-3 bg-surface-panel border border-dashed border-border rounded text-content-muted">
        <span class="material-symbols-outlined text-[24px]">image</span>
        <div class="flex flex-col">
          <span class="text-sm">${alt || 'Image'}</span>
          <span class="text-[10px] opacity-60">${filename} · Can't render images</span>
        </div>
      </div>`;
    }
  );
};

const renderLatex = (text) => {
  try {
    let result = text;

    // First handle @media image references
    result = renderMedia(result);

    // Handle display mode $$...$$ (non-greedy, multiline)
    result = result.replace(/\$\$([\s\S]+?)\$\$/g, (match, latex) => {
      try {
        return katex.renderToString(latex.trim(), {
          displayMode: true,
          throwOnError: false,
        });
      } catch (e) {
        return match;
      }
    });

    // Then handle inline mode $...$ (non-greedy, multiline)
    result = result.replace(/\$([\s\S]+?)\$/g, (match, latex) => {
      try {
        return katex.renderToString(latex.trim(), {
          displayMode: false,
          throwOnError: false,
        });
      } catch (e) {
        return match;
      }
    });

    // Finally handle cloze deletions {{hidden text}}
    result = renderCloze(result);

    return result;
  } catch (e) {
    return text;
  }
};

// Render content with code blocks and LaTeX
export const renderContent = (text) => {
  if (!text) return "";

  // Split by code blocks, preserving the delimiters
  const parts = text.split(/(```[\s\S]*?```)/g);

  return parts.map(part => {
    if (part.startsWith("```")) {
      // Extract code from code block
      const code = part
        .replace(/^```[a-zA-Z]*\n?/, "") // Remove opening ``` with optional language
        .replace(/```$/, "")              // Remove closing ```
        .trim();

      return `<div class="border border-border bg-surface-panel p-3 overflow-x-auto relative"><div class="absolute top-0 left-0 w-1 h-full bg-border"></div><pre class="font-mono text-sm leading-relaxed m-0">${highlightPython(code)}</pre></div>`;
    } else {
      // Regular text - apply LaTeX and cloze rendering, trim extra whitespace
      const trimmed = part.trim();
      return trimmed ? renderLatex(trimmed) : "";
    }
  }).join("");
};

export const highlightPython = (code) => {
  let result = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  result = result
    .replace(/(#.*)/g, "§§comment1§§$1§§comment2§§")
    .replace(
      /\b(def|class|import|from|return|if|elif|else|for|while|in|range|len|print|with|as|try|except|finally|raise|pass|break|continue|yield|lambda|True|False|None)\b/g,
      "§§keyword1§§$1§§keyword2§§"
    )
    .replace(/\b([A-Z][a-zA-Z0-9_]*)\b/g, "§§classname1§§$1§§classname2§§")
    .replace(/"([^"]*)"/g, '"§§string1§§$1§§string2§§"')
    .replace(/'([^']*)'/g, "'§§string1§§$1§§string2§§'")
    .replace(/\b(\d+\.?\d*)\b/g, "§§number1§§$1§§number2§§");

  result = result
    .replace(/§§comment1§§/g, '<span class="syntax-c">')
    .replace(/§§comment2§§/g, "</span>")
    .replace(/§§keyword1§§/g, '<span class="syntax-k">')
    .replace(/§§keyword2§§/g, "</span>")
    .replace(/§§classname1§§/g, '<span class="syntax-f">')
    .replace(/§§classname2§§/g, "</span>")
    .replace(/§§string1§§/g, '<span class="syntax-s">')
    .replace(/§§string2§§/g, "</span>")
    .replace(/§§number1§§/g, '<span class="syntax-n">')
    .replace(/§§number2§§/g, "</span>");

  return result;
};

export const QuestionPane = ({
  card,
  deckName,
  isProgrammingCard,
  loading,
  error,
  currentSectionIndex,
  totalSections,
  onNextSection,
  onGoToSection,
  canGoNextSection,
  onShowAnswer,
  onHideAnswer,
  showAnswer,
  onCardComplete,
  onSyncError,
}) => {
  const { submitReview, submitting, syncError, clearSyncError } = useReview();

  // Handle keyboard shortcuts for F (forgot) and R (remembered)
  useEffect(() => {
    if (!showAnswer) return;

    const handleKeyPress = (e) => {
      const key = e.key.toLowerCase();
      if (key === "f") {
        handleRate(false); // Forgot
      } else if (key === "r") {
        handleRate(true); // Remembered
      }
    };

    window.addEventListener("keypress", handleKeyPress);
    return () => window.removeEventListener("keypress", handleKeyPress);
  }, [showAnswer, card, currentSectionIndex]);

  // Handle spacebar: reveal next cloze or show answer
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in an input/textarea
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault(); // Prevent page scroll
        
        // Try to reveal the next cloze
        if (revealNextCloze()) {
          return; // Cloze was revealed, done
        }
        
        // No more clozes, show answer if not already shown
        if (!showAnswer) {
          onShowAnswer();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showAnswer, onShowAnswer]);

  // Propagate sync errors to parent
  useEffect(() => {
    if (syncError && onSyncError) {
      onSyncError(syncError);
    }
  }, [syncError, onSyncError]);

  const handleRate = async (remembered) => {
    if (!card || submitting) return;

    try {
      console.log(
        `Submitting card-level review for card ${card.id}, remembered: ${remembered}`
      );

      // Card-level review: always submit as single section to trigger immediate Mochi sync
      const result = await submitReview(
        card.id,
        0,  // section_index
        remembered,
        1   // total_sections (card-level = 1 section)
      );

      console.log("Review submitted:", result);

      // Move to next card
      onHideAnswer();
      if (onCardComplete) {
        onCardComplete();
      }
    } catch (err) {
      console.error("Failed to submit review:", err);
      // Error is handled by useReview hook and propagated via syncError
    }
  };

  if (loading) {
    return (
      <section className="w-full flex flex-col border-r border-border bg-surface overflow-y-auto custom-scrollbar relative">
        <div className="max-w-4xl w-full mx-auto p-8 flex items-center justify-center">
          <div className="text-content-muted">Loading cards...</div>
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
          <div className="text-content-muted">No cards due</div>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`w-full h-full flex flex-col ${
        isProgrammingCard ? "border-r border-border" : ""
      } bg-surface relative`}
    >
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-4xl w-full mx-auto py-8 px-6 flex flex-col gap-8 pb-6">
          <div className="flex items-center bg-surface-subtle border border-border p-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-8 bg-accent/10 border border-accent/20 text-accent">
                <span className="material-symbols-outlined text-[18px]">
                  layers
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-content-muted uppercase tracking-widest font-bold">
                  {deckName || "Unknown Deck"}
                </span>
                <span className="text-sm font-bold text-white tracking-wide font-display">
                  SECTION {currentSectionIndex + 1}{" "}
                  <span className="text-content-muted font-normal">
                    / {totalSections}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col relative">
            <div className="absolute left-[11px] top-8 bottom-12 w-px bg-border"></div>

            {card.sections?.map((section, index) => {
              const isActive = index === currentSectionIndex;

              return (
                <div
                  key={index}
                  className={`flex gap-5 relative mb-12 ${
                    isActive
                      ? ""
                      : "opacity-60 hover:opacity-100 transition-opacity"
                  } group`}
                >
                  <div className="shrink-0 z-10 pt-1">
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
                    {(() => {
                      // Check if question starts with $$ (LaTeX block) - don't split it
                      const questionText = section.question || "";
                      const startsWithLatex = questionText.trim().startsWith("$$");
                      const firstLine = questionText.split("\n")[0] || "";
                      const restOfQuestion = questionText.split("\n").slice(1).join("\n").trim();
                      
                      // For title: use card name for first section, or first line if not a LaTeX block
                      const titleText = index === 0 
                        ? (card.name && card.name !== "$$" ? card.name : (startsWithLatex ? "" : firstLine))
                        : (startsWithLatex ? "" : firstLine);
                      
                      // For body: use full question if starts with LaTeX, otherwise rest of lines
                      const bodyText = startsWithLatex ? questionText : restOfQuestion;
                      
                      return (
                        <>
                          <div className="flex items-start justify-between">
                            <div>
                              {titleText && (
                                <h1
                                  className={`text-2xl font-bold tracking-tight font-mono ${
                                    isActive
                                      ? "text-white"
                                      : "text-content-muted group-hover:text-white transition-colors cursor-pointer"
                                  }`}
                                  onClick={() => !isActive && onGoToSection(index)}
                                  dangerouslySetInnerHTML={{
                                    __html: renderLatex(titleText),
                                  }}
                                />
                              )}
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

                          {isActive && bodyText && (
                            <div
                              className="text-lg text-content leading-relaxed"
                              dangerouslySetInnerHTML={{
                                __html: renderContent(bodyText),
                              }}
                            />
                          )}
                        </>
                      );
                    })()}

                    {isActive && showAnswer && section.answer && (
                        <div className="flex flex-col gap-3 mt-6">
                          <div className="flex justify-between items-baseline border-b border-border pb-1 mb-1">
                            <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">
                              // ANSWER
                            </span>
                          </div>
                          <div className="border border-secondary/30 bg-secondary/5 p-6 overflow-x-auto">
                            <div
                              className="text-lg text-content leading-relaxed font-sans whitespace-pre-wrap"
                              dangerouslySetInnerHTML={{
                                __html: renderContent(section.answer),
                              }}
                            />
                          </div>
                        </div>
                      )}

                    {isActive && (
                      <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-border/50 border-dashed">
                        {currentSectionIndex > 0 && (
                          <button
                            onClick={() =>
                              onGoToSection(currentSectionIndex - 1)
                            }
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
                            <span className="material-symbols-outlined text-[16px]">
                              visibility
                            </span>
                            Show Answer
                          </button>
                        ) : (
                          currentSectionIndex !== totalSections - 1 && (
                            <button
                              onClick={() => {
                                onHideAnswer();
                                onNextSection();
                              }}
                              className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 border border-green-500 hover:border-green-400 shadow-sm ml-auto"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                arrow_forward
                              </span>
                              Continue
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="border-t border-border bg-surface">
        <div className="max-w-4xl w-full mx-auto px-6">
          <RatingButtonsEnhanced onRate={handleRate} disabled={submitting} />
        </div>
      </div>
    </section>
  );
};
