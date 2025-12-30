import { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';

export const DeckSelector = ({ currentDeckId, currentDeckName, onSelectDeck }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [decks, setDecks] = useState([]);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const loadDecks = async () => {
            setLoading(true);
            try {
                const data = await api.listDecks();
                setDecks(data.decks);
            } catch (error) {
                console.error('Failed to load decks:', error);
            } finally {
                setLoading(false);
            }
        };

        if (isOpen && decks.length === 0) {
            loadDecks();
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    const handleSelectDeck = (deckId) => {
        onSelectDeck(deckId);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-0.5 text-sm text-content hover:text-white transition-colors"
            >
                <span>{currentDeckName || 'loading...'}</span>
                <span className="material-symbols-outlined text-[14px] text-content-muted pt-0.5">
                    {isOpen ? 'expand_less' : 'expand_more'}
                </span>
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 min-w-[200px] bg-surface-panel border border-border shadow-lg z-50">
                    <div className="py-1">
                        {loading ? (
                            <div className="px-4 py-2 text-xs text-content-muted">Loading...</div>
                        ) : (
                            decks.map((deck) => (
                                <button
                                    key={deck.id}
                                    onClick={() => handleSelectDeck(deck.id)}
                                    className={`w-full px-4 py-2 text-left text-sm hover:bg-surface-subtle transition-colors flex items-center justify-between ${deck.id === currentDeckId ? 'bg-surface-subtle text-primary' : 'text-content'
                                        }`}
                                >
                                    <span>{deck.name}</span>
                                    <span className="text-xs text-content-muted font-mono">{deck.total_cards}</span>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
