'use client';

import { useState, useEffect, useCallback } from 'react';
import { Link2, X, BookOpen, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import type { Card, UserStoryCard, EpicCard } from '@/types';
import { cn } from '@/lib/utils';

interface ConnectionPickerProps {
  type: 'USER_STORY' | 'EPIC';
  boardId: string;
  currentCardId: string;
  selectedId: string | null;
  selectedCard?: UserStoryCard | EpicCard | null;
  onChange: (id: string | null) => void;
}

export function ConnectionPicker({
  type,
  boardId,
  currentCardId,
  selectedId,
  selectedCard,
  onChange,
}: ConnectionPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const Icon = type === 'USER_STORY' ? BookOpen : Layers;
  const label = type === 'USER_STORY' ? 'User Story' : 'Epic';
  const colorClass = type === 'USER_STORY' ? 'text-card-story' : 'text-card-epic';

  const fetchCards = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/boards/${boardId}`);
      const data = await response.json();
      if (data.success) {
        // Filter cards by type and exclude current card
        const filteredCards = data.data.lists
          .flatMap((list: { cards: Card[] }) => list.cards)
          .filter((card: Card) => card.type === type && card.id !== currentCardId);
        setCards(filteredCards);
      }
    } catch (error) {
      console.error('Failed to fetch cards:', error);
    } finally {
      setIsLoading(false);
    }
  }, [boardId, currentCardId, type]);

  useEffect(() => {
    if (isOpen) {
      fetchCards();
    }
  }, [isOpen, fetchCards]);

  const filteredCards = cards.filter(
    (card) =>
      card.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (cardId: string) => {
    onChange(cardId);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = () => {
    onChange(null);
  };

  return (
    <div className="flex items-center gap-1">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={selectedId ? 'outline' : 'ghost'}
            size="sm"
            className={cn(
              'flex-1 justify-start',
              !selectedId && 'text-text-tertiary',
              selectedId && 'border-border'
            )}
          >
            <Link2 className="mr-2 h-4 w-4" />
            {selectedCard ? (
              <span className="flex items-center gap-1.5 truncate">
                <Icon className={cn('h-3.5 w-3.5 shrink-0', colorClass)} />
                <span className="truncate">{selectedCard.title}</span>
              </span>
            ) : (
              `Link to ${label}`
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <div className="p-2 border-b border-border">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}s...`}
              className="h-8"
              autoFocus
            />
          </div>
          <div className="max-h-[250px] overflow-y-auto p-1">
            {isLoading ? (
              <div className="p-4 text-center text-caption text-text-tertiary">
                Loading...
              </div>
            ) : filteredCards.length === 0 ? (
              <div className="p-4 text-center text-caption text-text-tertiary">
                {cards.length === 0
                  ? `No ${label.toLowerCase()}s found in this board`
                  : 'No matches found'}
              </div>
            ) : (
              filteredCards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => handleSelect(card.id)}
                  className={cn(
                    'w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-body',
                    'hover:bg-surface-hover transition-colors',
                    selectedId === card.id && 'bg-surface-hover'
                  )}
                >
                  <Icon className={cn('h-4 w-4 shrink-0', colorClass)} />
                  <span className="truncate">{card.title}</span>
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
      {selectedId && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-text-tertiary hover:text-text-primary"
          onClick={handleClear}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
