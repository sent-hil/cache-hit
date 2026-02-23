import { useState, useEffect } from "react";
import { QuestionPane } from "./components/QuestionPane";
import { EditorOutputPane } from "./components/EditorOutputPane";
import { Footer } from "./components/Footer";
import { SplitPane } from "./components/SplitPane";
import { ReviewComplete } from "./components/ReviewComplete";
import { useBackendHealth } from "./hooks/useBackendHealth";
import { useCodeExecution } from "./hooks/useCodeExecution";
import { useReviewState } from "./hooks/useReviewState";
import { useAnswerVisibility } from "./hooks/useAnswerVisibility";

// Deck configuration: ID -> { language, name }
const DECK_CONFIG = {
  // Python decks
  "QhL3SFpO": { language: "python", name: "Python" },
  "nzfXeBFa": { language: "python", name: "Python" },
  // Ruby decks
  "vaV6EFBe": { language: "ruby", name: "Ruby" },
  "wvsBwDcA": { language: "ruby", name: "Ruby" },
  "TEZ5bibK": { language: "ruby", name: "Ruby Chunks" },
  // Programming & ML default to Python
  "pwMzbjDX": { language: "python", name: "Programming" },
  "y2LNXMVf": { language: "python", name: "Programming" },
  "GIIEHHb1": { language: "python", name: "ML" },
  "L9WF8UEi": { language: "python", name: "ML" },
  // Math decks (no code editor)
  "MezldXis": { language: null, name: "Math" },
  "L9WF8UEi": { language: "python", name: "ML" },
  "kXDgGV0f": { language: null, name: "Calculus" },
  "rNlFDGJi": { language: null, name: "Calculus" },
  "9lzKEVNl": { language: null, name: "Maths" },
  // Other decks
  "H68gFzf6": { language: null, name: "Default" },
  "y2LNXMVf": { language: "python", name: "Programming" },
};

// Deck IDs that should show the code editor
const CODE_EDITOR_DECK_IDS = Object.keys(DECK_CONFIG).filter(
  (id) => DECK_CONFIG[id].language !== null
);

function App() {
  const [code, setCode] = useState(
    "# Write your Python code here and press Cmd+Enter to run\n"
  );
  const [syncError, setSyncError] = useState(null);

  const {
    available: backendAvailable,
    checking,
    error: backendError,
    checkHealth,
  } = useBackendHealth();

  const {
    output,
    isRunning,
    queuedCode,
    elapsedMs,
    executeCode,
    executeQueuedCode,
    clearOutput,
  } = useCodeExecution(backendAvailable);

  const {
    currentCard,
    currentSection,
    currentCardIndex,
    currentSectionIndex,
    totalCards,
    totalSections,
    remainingCards,
    canGoPrevious,
    canGoNext,
    nextSection,
    goToSection,
    nextCard,
    prevCard,
    removeCurrentCard,
    loading,
    error: reviewError,
    isEmpty,
    reload,
  } = useReviewState();

  const canGoNextSection = currentSectionIndex < totalSections - 1;

  const { showAnswer, handleShowAnswer, handleHideAnswer } =
    useAnswerVisibility(currentCardIndex, currentSectionIndex);

  useEffect(() => {
    if (backendAvailable && queuedCode) {
      executeQueuedCode();
    }
  }, [backendAvailable, queuedCode, executeQueuedCode]);

  // Get the config for the current card's deck
  const currentDeckConfig = currentCard?.deck_id
    ? DECK_CONFIG[currentCard.deck_id]
    : null;
  const currentLanguage = currentDeckConfig?.language || "python";
  const currentDeckName = currentDeckConfig?.name || "Unknown Deck";

  useEffect(() => {
    const placeholder =
      currentLanguage === "ruby"
        ? "# Write your Ruby code here and press Cmd+Enter to run\n"
        : "# Write your Python code here and press Cmd+Enter to run\n";
    setCode(placeholder);
    clearOutput();
  }, [currentCardIndex, currentLanguage, clearOutput]);

  // Keyboard navigation for cards (left/right arrows)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in an input/textarea
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
        return;
      }

      if (e.key === "ArrowLeft" && canGoPrevious) {
        prevCard();
      } else if (e.key === "ArrowRight" && canGoNext) {
        nextCard();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canGoPrevious, canGoNext, prevCard, nextCard]);

  const handleRun = (codeOverride) => {
    console.log("Running code with language:", currentLanguage, "deck_id:", currentCard?.deck_id);
    executeCode(codeOverride || code, currentLanguage);
  };

  const handleCodeChange = (value) => {
    setCode(value || "");
  };

  // Determine if current card is a programming card (based on deck_id)
  const isProgrammingCard =
    currentCard?.deck_id && CODE_EDITOR_DECK_IDS.includes(currentCard.deck_id);

  const handleCardComplete = () => {
    // Remove the current card from the list and move to next
    removeCurrentCard();
  };

  const handleSyncError = (error) => {
    setSyncError(error);
  };

  const handleRetrySync = () => {
    setSyncError(null);
    // User can try again by clicking the rating button
  };

  const showCompleteModal = !loading && isEmpty && totalCards > 0;

  return (
    <div className="flex flex-col h-screen bg-surface">
      {/* Sync Error Modal */}
      {syncError && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-surface border border-border p-6 max-w-md mx-4">
            <h2 className="text-lg font-bold text-red-400 mb-4">
              Failed to sync to Mochi
            </h2>
            <p className="text-content-muted mb-6">{syncError}</p>
            <button
              onClick={handleRetrySync}
              className="px-4 py-2 bg-primary hover:bg-primary/80 text-white font-bold uppercase tracking-wider"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {showCompleteModal && <ReviewComplete onRedo={reload} />}

      <header className="h-12 border-b border-border bg-surface-panel flex items-center justify-between px-4 shrink-0 z-[60]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-primary font-bold tracking-tight">
            <span className="material-symbols-outlined text-[20px]">
              terminal
            </span>
            <span>CacheHit</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="text-content-muted">PROGRESS</span>
            <div className="flex items-center gap-1">
              <span className="text-primary font-bold">{currentCardIndex}</span>
              <span className="text-content-muted">/</span>
              <span>{totalCards}</span>
            </div>
            <div className="hidden md:flex text-content-muted tracking-tighter">
              {(() => {
                const MAX_SYMBOLS = 20;
                const symbolCount = Math.min(totalCards, MAX_SYMBOLS);
                const completedCards = currentCardIndex;

                const completedSymbols = Math.min(
                  Math.ceil((completedCards / totalCards) * symbolCount),
                  symbolCount
                );
                const remainingSymbols = symbolCount - completedSymbols;

                return (
                  <>
                    <span className="text-accent">
                      {"|".repeat(completedSymbols)}
                    </span>
                    <span>{".".repeat(remainingSymbols)}</span>
                  </>
                );
              })()}
            </div>
          </div>
          <div className="h-4 w-px bg-border mx-2"></div>
        </div>
      </header>

      <main className="flex-1 flex min-w-0 min-h-0 relative">
        {isProgrammingCard ? (
          <SplitPane direction="horizontal">
            {[
              <QuestionPane
                key="question"
                card={currentCard}
                deckName={currentDeckName}
                isProgrammingCard={isProgrammingCard}
                loading={loading}
                error={reviewError}
                currentSectionIndex={currentSectionIndex}
                totalSections={totalSections}
                onNextSection={nextSection}
                onGoToSection={goToSection}
                canGoNextSection={canGoNextSection}
                onShowAnswer={handleShowAnswer}
                onHideAnswer={handleHideAnswer}
                showAnswer={showAnswer}
                onCardComplete={handleCardComplete}
                onSyncError={handleSyncError}
              />,
              <EditorOutputPane
                key="editor-output"
                code={code}
                onCodeChange={handleCodeChange}
                onRun={handleRun}
                output={output}
                isRunning={isRunning}
                elapsedMs={elapsedMs}
                backendAvailable={backendAvailable}
                backendChecking={checking}
                backendError={backendError}
                onClearOutput={clearOutput}
                onReconnect={checkHealth}
                language={currentLanguage}
              />,
            ]}
          </SplitPane>
        ) : (
          <QuestionPane
            card={currentCard}
            deckName={currentDeckName}
            isProgrammingCard={false}
            loading={loading}
            error={reviewError}
            currentSectionIndex={currentSectionIndex}
            totalSections={totalSections}
            onNextSection={nextSection}
            onGoToSection={goToSection}
            canGoNextSection={canGoNextSection}
            onShowAnswer={handleShowAnswer}
            onHideAnswer={handleHideAnswer}
            showAnswer={showAnswer}
            onCardComplete={handleCardComplete}
            onSyncError={handleSyncError}
          />
        )}
      </main>

      <Footer
        onSkipCard={nextCard}
        onPreviousCard={prevCard}
        canGoNext={canGoNext}
        canGoPrevious={canGoPrevious}
      />
    </div>
  );
}

export default App;
