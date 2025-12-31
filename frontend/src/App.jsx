import { useState, useEffect } from "react";
import { QuestionPane } from "./components/QuestionPane";
import { EditorOutputPane } from "./components/EditorOutputPane";
import { Footer } from "./components/Footer";
import { SplitPane } from "./components/SplitPane";
import { ReviewComplete } from "./components/ReviewComplete";
import { DeckSelector } from "./components/DeckSelector";
import { useBackendHealth } from "./hooks/useBackendHealth";
import { useCodeExecution } from "./hooks/useCodeExecution";
import { useDeckState } from "./hooks/useDeckState";
import { useAnswerVisibility } from "./hooks/useAnswerVisibility";

function App() {
  const [code, setCode] = useState(
    "# Write your Python code here and press Cmd+Enter to run\n"
  );
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

  const USER_ID = "user1";
  const [selectedDeckId, setSelectedDeckId] = useState(() => {
    // Remember last selected deck from localStorage
    return localStorage.getItem("selectedDeckId") || "all";
  });

  // Save selected deck to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("selectedDeckId", selectedDeckId);
  }, [selectedDeckId]);

  const {
    currentCard,
    currentCardIndex,
    totalCards,
    remainingCards,
    nextCard,
    previousCard,
    canGoNext,
    canGoPrevious,
    loading: deckLoading,
    error: deckError,
    deckName,
    language,
    reloadDeck,
  } = useDeckState(selectedDeckId);

  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const totalSections = currentCard?.sections.length || 0;
  const canGoNextSection = currentSectionIndex < totalSections - 1;
  const canGoPreviousSection = currentSectionIndex > 0;

  const nextSection = () => {
    if (canGoNextSection) {
      setCurrentSectionIndex((prev) => prev + 1);
    }
  };

  const previousSection = () => {
    if (canGoPreviousSection) {
      setCurrentSectionIndex((prev) => prev - 1);
    }
  };

  const goToSection = (index) => {
    if (index >= 0 && index < totalSections) {
      setCurrentSectionIndex(index);
    }
  };

  const {
    showAnswer,
    activeTab,
    handleShowAnswer,
    handleHideAnswer,
    handleTabChange,
  } = useAnswerVisibility(currentCardIndex, currentSectionIndex);

  useEffect(() => {
    if (backendAvailable && queuedCode) {
      executeQueuedCode();
    }
  }, [backendAvailable, queuedCode, executeQueuedCode]);

  useEffect(() => {
    setCode("# Write your Python code here and press Cmd+Enter to run\n");
    clearOutput();
    setCurrentSectionIndex(0);
  }, [currentCardIndex, clearOutput]);

  const handleRun = (codeOverride) => {
    executeCode(codeOverride || code, language);
  };

  const handleCodeChange = (value) => {
    setCode(value || "");
  };

  const currentSection = currentCard?.sections[currentSectionIndex];
  const answerCode = currentSection?.answer_code || "";

  // Determine if current card is a programming card (has code in any section)
  const isProgrammingCard =
    currentCard?.sections.some(
      (section) => section.answer_code && section.answer_code.trim() !== ""
    ) || false;

  const handleReloadDeck = () => {
    // Reload the current deck instead of full page reload
    reloadDeck();
  };

  useEffect(() => {
    console.log("Deck state changed:", {
      deckLoading,
      totalCards,
      hasCurrentCard: !!currentCard,
    });
  }, [deckLoading, totalCards, currentCard]);

  useEffect(() => {
    setCurrentSectionIndex(0);
    setCode("# Write your Python code here and press Cmd+Enter to run\n");
    clearOutput();
  }, [selectedDeckId, clearOutput]);

  const showCompleteModal = !deckLoading && remainingCards === 0 && (totalCards > 0 || selectedDeckId !== "all");

  return (
    <div className="flex flex-col h-screen bg-surface">
      {showCompleteModal && (
        <ReviewComplete
          userId={USER_ID}
          deckId={selectedDeckId}
          onRedo={handleReloadDeck}
        />
      )}
      <header className="h-12 border-b border-border bg-surface-panel flex items-center justify-between px-4 shrink-0 z-[60]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-primary font-bold tracking-tight">
            <span className="material-symbols-outlined text-[20px]">
              terminal
            </span>
            <span>CacheHit</span>
          </div>
          <span className="text-border">/</span>
          <div className="flex items-center gap-2 text-sm text-content">
            <span>Decks</span>
            <span className="text-border">/</span>
            <DeckSelector
              currentDeckId={selectedDeckId}
              currentDeckName={deckName}
              onSelectDeck={setSelectedDeckId}
            />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="text-content-muted">PROGRESS</span>
            <div className="flex items-center gap-1">
              <span className="text-primary font-bold">
                {currentCardIndex}
              </span>
              <span className="text-content-muted">/</span>
              <span>{totalCards}</span>
            </div>
            <div className="hidden md:flex text-content-muted tracking-tighter">
              {(() => {
                const MAX_SYMBOLS = 20;
                // Use the smaller of totalCards or MAX_SYMBOLS for better visual match
                const symbolCount = Math.min(totalCards, MAX_SYMBOLS);
                const completedCards = currentCardIndex;

                // Calculate symbols based on actual progress
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
                deckName={deckName}
                loading={deckLoading}
                error={deckError}
                currentSectionIndex={currentSectionIndex}
                totalSections={totalSections}
                onNextSection={nextSection}
                onGoToSection={goToSection}
                canGoNextSection={canGoNextSection}
                onNextCard={nextCard}
                canGoNextCard={canGoNext}
                onShowAnswer={handleShowAnswer}
                onHideAnswer={handleHideAnswer}
                showAnswer={showAnswer}
                deckId={selectedDeckId}
                reloadDeck={reloadDeck}
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
                activeTab={activeTab}
                onTabChange={handleTabChange}
                showAnswer={showAnswer}
                answerCode={answerCode}
              />,
            ]}
          </SplitPane>
        ) : (
          <QuestionPane
            card={currentCard}
            deckName={deckName}
            loading={deckLoading}
            error={deckError}
            currentSectionIndex={currentSectionIndex}
            totalSections={totalSections}
            onNextSection={nextSection}
            onGoToSection={goToSection}
            canGoNextSection={canGoNextSection}
            onNextCard={nextCard}
            canGoNextCard={canGoNext}
            onShowAnswer={handleShowAnswer}
            onHideAnswer={handleHideAnswer}
            showAnswer={showAnswer}
            deckId={selectedDeckId}
            reloadDeck={reloadDeck}
          />
        )}
      </main>

      <Footer
        onSkipCard={nextCard}
        onPreviousCard={previousCard}
        canGoNext={canGoNext}
        canGoPrevious={canGoPrevious}
      />
    </div>
  );
}

export default App;
