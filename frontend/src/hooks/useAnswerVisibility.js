import { useState, useEffect } from 'react';

export const useAnswerVisibility = (currentCardIndex, currentSectionIndex) => {
  const [showAnswer, setShowAnswer] = useState(false);
  const [activeTab, setActiveTab] = useState('your-code');

  useEffect(() => {
    setShowAnswer(false);
    setActiveTab('your-code');
  }, [currentCardIndex, currentSectionIndex]);

  const handleShowAnswer = () => {
    setShowAnswer(true);
    setActiveTab('answer');
  };

  const handleHideAnswer = () => {
    setShowAnswer(false);
    setActiveTab('your-code');
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  return {
    showAnswer,
    activeTab,
    handleShowAnswer,
    handleHideAnswer,
    handleTabChange,
  };
};
