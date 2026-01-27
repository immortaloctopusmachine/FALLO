'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  closestCenter,
  pointerWithin,
  rectIntersection,
  getFirstCollision,
  UniqueIdentifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { List } from './List';
import { CardCompact } from '@/components/cards/CardCompact';
import { CardModal } from '@/components/cards/CardModal';
import type { Board, Card, CardType } from '@/types';

interface BoardViewProps {
  board: Board;
}

export function BoardView({ board: initialBoard }: BoardViewProps) {
  const router = useRouter();
  const [board, setBoard] = useState(initialBoard);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [activeCardListId, setActiveCardListId] = useState<string | null>(null);
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // Create a map of card IDs to their list IDs for quick lookup
  const cardToListMap = useMemo(() => {
    const map = new Map<string, string>();
    board.lists.forEach((list) => {
      list.cards.forEach((card) => {
        map.set(card.id, list.id);
      });
    });
    return map;
  }, [board.lists]);

  // Get list ID from a draggable/droppable ID
  const getListIdFromId = useCallback((id: UniqueIdentifier): string | null => {
    const strId = String(id);
    // Check if it's a list ID
    if (board.lists.some((l) => l.id === strId)) {
      return strId;
    }
    // Check if it's a card ID
    return cardToListMap.get(strId) || null;
  }, [board.lists, cardToListMap]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeData = active.data.current;

    if (activeData?.type === 'card') {
      setActiveCard(activeData.card);
      setActiveCardListId(activeData.card.listId);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !activeCard) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type !== 'card') return;

    // Determine the target list ID
    let overListId: string | null = null;

    if (overData?.type === 'card') {
      overListId = overData.card.listId;
    } else if (overData?.type === 'list') {
      overListId = overData.list.id;
    }

    if (!overListId) return;

    const currentListId = cardToListMap.get(activeCard.id);
    if (currentListId === overListId) return;

    // Move card to new list
    setBoard((prev) => {
      const newLists = prev.lists.map((list) => {
        // Remove from old list
        if (list.id === currentListId) {
          return {
            ...list,
            cards: list.cards.filter((c) => c.id !== activeCard.id),
          };
        }
        // Add to new list
        if (list.id === overListId) {
          // Find the position to insert
          let insertIndex = list.cards.length;

          if (overData?.type === 'card') {
            const overCardIndex = list.cards.findIndex((c) => c.id === over.id);
            if (overCardIndex !== -1) {
              insertIndex = overCardIndex;
            }
          }

          const updatedCard = { ...activeCard, listId: overListId };
          const newCards = [...list.cards];
          newCards.splice(insertIndex, 0, updatedCard);

          return {
            ...list,
            cards: newCards,
          };
        }
        return list;
      });
      return { ...prev, lists: newLists };
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!activeCard || !activeCardListId) {
      setActiveCard(null);
      setActiveCardListId(null);
      return;
    }

    const sourceListId = activeCardListId;

    // Find current list (where card is now)
    const currentList = board.lists.find((l) =>
      l.cards.some((c) => c.id === activeCard.id)
    );

    if (!currentList) {
      setActiveCard(null);
      setActiveCardListId(null);
      return;
    }

    const destinationListId = currentList.id;

    // Handle reordering within the same list
    if (over && active.id !== over.id) {
      const overData = over.data.current;

      if (overData?.type === 'card' && overData.card.listId === destinationListId) {
        const oldIndex = currentList.cards.findIndex((c) => c.id === activeCard.id);
        const newIndex = currentList.cards.findIndex((c) => c.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          setBoard((prev) => ({
            ...prev,
            lists: prev.lists.map((l) => {
              if (l.id === destinationListId) {
                return {
                  ...l,
                  cards: arrayMove(l.cards, oldIndex, newIndex),
                };
              }
              return l;
            }),
          }));
        }
      }
    }

    // Get the final position
    const finalList = board.lists.find((l) => l.id === destinationListId);
    const newPosition = finalList?.cards.findIndex((c) => c.id === activeCard.id) ?? 0;

    // Persist to server
    try {
      await fetch(`/api/boards/${board.id}/cards/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId: activeCard.id,
          sourceListId,
          destinationListId,
          newPosition,
        }),
      });
    } catch (error) {
      console.error('Failed to reorder card:', error);
      router.refresh();
    }

    setActiveCard(null);
    setActiveCardListId(null);
  };

  // Custom collision detection that prefers cards but falls back to lists
  const collisionDetection = useCallback((args: Parameters<typeof closestCenter>[0]) => {
    // First, check for card collisions
    const pointerCollisions = pointerWithin(args);
    const intersectionCollisions = rectIntersection(args);

    // Combine and prioritize
    const collisions = [...pointerCollisions, ...intersectionCollisions];

    // Build a map from containers for lookup
    const containerMap = new Map(
      args.droppableContainers.map((container) => [container.id, container])
    );

    // Prefer card collisions over list collisions
    const cardCollision = collisions.find((c) => {
      const container = containerMap.get(c.id);
      return container?.data.current?.type === 'card';
    });

    if (cardCollision) {
      return [cardCollision];
    }

    // Fall back to list collision
    const listCollision = collisions.find((c) => {
      const container = containerMap.get(c.id);
      return container?.data.current?.type === 'list';
    });

    if (listCollision) {
      return [listCollision];
    }

    return collisions.slice(0, 1);
  }, []);

  const handleAddCard = useCallback(async (listId: string, title: string, type: CardType) => {
    try {
      const response = await fetch(`/api/boards/${board.id}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, type, listId }),
      });

      const data = await response.json();
      if (data.success) {
        setBoard((prev) => ({
          ...prev,
          lists: prev.lists.map((list) => {
            if (list.id === listId) {
              return {
                ...list,
                cards: [...list.cards, data.data],
              };
            }
            return list;
          }),
        }));
      }
    } catch (error) {
      console.error('Failed to add card:', error);
    }
  }, [board.id]);

  const handleCardClick = useCallback((card: Card) => {
    setSelectedCard(card);
  }, []);

  const handleCardUpdate = useCallback((updatedCard: Card) => {
    setBoard((prev) => ({
      ...prev,
      lists: prev.lists.map((list) => ({
        ...list,
        cards: list.cards.map((c) => (c.id === updatedCard.id ? updatedCard : c)),
      })),
    }));
    setSelectedCard(updatedCard);
  }, []);

  const handleCardDelete = useCallback((cardId: string) => {
    setBoard((prev) => ({
      ...prev,
      lists: prev.lists.map((list) => ({
        ...list,
        cards: list.cards.filter((c) => c.id !== cardId),
      })),
    }));
  }, []);

  const handleDeleteList = useCallback(async (listId: string) => {
    if (!confirm('Are you sure you want to delete this list? All cards will be deleted.')) {
      return;
    }

    try {
      const response = await fetch(`/api/boards/${board.id}/lists/${listId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setBoard((prev) => ({
          ...prev,
          lists: prev.lists.filter((l) => l.id !== listId),
        }));
      }
    } catch (error) {
      console.error('Failed to delete list:', error);
    }
  }, [board.id]);

  const handleAddList = async () => {
    if (!newListName.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/boards/${board.id}/lists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newListName.trim() }),
      });

      const data = await response.json();
      if (data.success) {
        setBoard((prev) => ({
          ...prev,
          lists: [...prev.lists, { ...data.data, cards: [] }],
        }));
        setNewListName('');
        setIsAddingList(false);
      }
    } catch (error) {
      console.error('Failed to add list:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full gap-4 overflow-x-auto p-4">
        {board.lists.map((list) => (
          <SortableContext
            key={list.id}
            items={list.cards.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <List
              id={list.id}
              name={list.name}
              cards={list.cards}
              boardId={board.id}
              onAddCard={handleAddCard}
              onCardClick={handleCardClick}
              onDeleteList={handleDeleteList}
            />
          </SortableContext>
        ))}

        {/* Add List */}
        <div className="w-[280px] shrink-0">
          {isAddingList ? (
            <div className="rounded-lg bg-surface p-2">
              <Input
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Enter list name..."
                autoFocus
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddList();
                  if (e.key === 'Escape') {
                    setIsAddingList(false);
                    setNewListName('');
                  }
                }}
              />
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  onClick={handleAddList}
                  disabled={isLoading || !newListName.trim()}
                >
                  {isLoading ? 'Adding...' : 'Add List'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsAddingList(false);
                    setNewListName('');
                  }}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              className="w-full justify-start bg-surface/50 hover:bg-surface"
              onClick={() => setIsAddingList(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add List
            </Button>
          )}
        </div>
      </div>

      <DragOverlay>
        {activeCard && (
          <div className="w-[264px] rotate-2 shadow-lg">
            <CardCompact card={activeCard} onClick={() => {}} />
          </div>
        )}
      </DragOverlay>

      <CardModal
        card={selectedCard}
        boardId={board.id}
        isOpen={!!selectedCard}
        onClose={() => setSelectedCard(null)}
        onUpdate={handleCardUpdate}
        onDelete={handleCardDelete}
      />
    </DndContext>
  );
}
