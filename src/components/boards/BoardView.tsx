'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useBoardMutations } from '@/hooks/api/use-board-mutations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { List } from './List';
import { CardCompact } from '@/components/cards/CardCompact';
import { CardModal } from '@/components/cards/CardModal';
import type { Board, Card, CardType } from '@/types';

interface BoardViewProps {
  board: Board;
  currentUserId?: string;
  canViewQualitySummaries?: boolean;
}

export function BoardView({ board: initialBoard, currentUserId, canViewQualitySummaries = false }: BoardViewProps) {
  const [board, setBoard] = useState(initialBoard);
  const mutations = useBoardMutations(initialBoard.id);
  const boardSnapshotRef = useRef<Board | null>(null);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [activeCardListId, setActiveCardListId] = useState<string | null>(null);
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration mismatch with dnd-kit
  useEffect(() => {
    setIsMounted(true);
  }, []);

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

  const allCards = useMemo(() => board.lists.flatMap((list) => list.cards), [board.lists]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeData = active.data.current;

    if (activeData?.type === 'card') {
      boardSnapshotRef.current = board; // snapshot for rollback
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
    let didMove = sourceListId !== destinationListId;
    let newPosition = currentList.cards.findIndex((c) => c.id === activeCard.id);

    // Handle reordering within the same list
    if (over && active.id !== over.id) {
      const overData = over.data.current;

      if (overData?.type === 'card' && overData.card.listId === destinationListId) {
        const oldIndex = currentList.cards.findIndex((c) => c.id === activeCard.id);
        const newIndex = currentList.cards.findIndex((c) => c.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          didMove = true;
          newPosition = newIndex;
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

    if (!didMove || newPosition < 0) {
      boardSnapshotRef.current = null;
      setActiveCard(null);
      setActiveCardListId(null);
      return;
    }

    // Persist to server
    try {
      await mutations.reorderCard({
        cardId: activeCard.id,
        sourceListId,
        destinationListId,
        newPosition,
      });
    } catch (error) {
      console.error('Failed to reorder card:', error);
      if (boardSnapshotRef.current) {
        setBoard(boardSnapshotRef.current);
      }
      toast.error('Failed to move card');
    }

    boardSnapshotRef.current = null;
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
    const tempId = crypto.randomUUID();
    const tempCard = {
      id: tempId,
      type,
      title,
      description: null,
      position: 999,
      color: null,
      featureImage: null,
      featureImagePosition: 50,
      listId,
      parentId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archivedAt: null,
      taskData: { storyPoints: null, deadline: null, linkedUserStoryId: null, linkedEpicId: null },
      userStoryData: { flags: [], acceptanceCriteria: null },
      epicData: {},
      utilityData: { subtype: 'NOTE' as const },
      assignees: [],
      checklists: [],
      _count: { attachments: 0, comments: 0 },
    } as Card;

    // Optimistic: show card immediately
    setBoard((prev) => ({
      ...prev,
      lists: prev.lists.map((list) =>
        list.id === listId ? { ...list, cards: [...list.cards, tempCard] } : list
      ),
    }));

    try {
      const realCard = await mutations.createCard({ title, type, listId });
      // Replace temp with real server data
      setBoard((prev) => ({
        ...prev,
        lists: prev.lists.map((list) => ({
          ...list,
          cards: list.cards.map((c) => (c.id === tempId ? realCard : c)),
        })),
      }));
    } catch (error) {
      console.error('Failed to add card:', error);
      // Remove temp card
      setBoard((prev) => ({
        ...prev,
        lists: prev.lists.map((list) => ({
          ...list,
          cards: list.cards.filter((c) => c.id !== tempId),
        })),
      }));
      toast.error('Failed to create card');
    }
  }, [mutations]);

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

  const handleLinkedCardCreated = useCallback((newCard: Card) => {
    setBoard((prev) => ({
      ...prev,
      lists: prev.lists.map((list) => {
        if (list.id !== newCard.listId) return list;
        if (list.cards.some((card) => card.id === newCard.id)) return list;
        return { ...list, cards: [...list.cards, newCard] };
      }),
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

    const name = newListName.trim();
    const tempId = crypto.randomUUID();
    const tempList: import('@/types').List = {
      id: tempId,
      name,
      position: board.lists.length,
      boardId: board.id,
      cards: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      viewType: 'TASKS',
    };

    // Optimistic: show list immediately, reset input
    setBoard((prev) => ({ ...prev, lists: [...prev.lists, tempList] }));
    setNewListName('');
    setIsAddingList(false);

    try {
      const realList = await mutations.createList({ name, viewType: 'TASKS' });
      // Replace temp with real server data
      setBoard((prev) => ({
        ...prev,
        lists: prev.lists.map((l) => (l.id === tempId ? { ...realList, cards: [] } : l)),
      }));
    } catch (error) {
      console.error('Failed to add list:', error);
      // Remove temp list
      setBoard((prev) => ({
        ...prev,
        lists: prev.lists.filter((l) => l.id !== tempId),
      }));
      toast.error('Failed to create list');
    }
  };

  // Prevent hydration mismatch - show static version until mounted
  if (!isMounted) {
    return (
      <div className="flex h-full gap-4 overflow-x-auto p-4">
        {board.lists.map((list) => (
          <List
            key={list.id}
            id={list.id}
            name={list.name}
            cards={list.cards}
            boardId={board.id}
            onAddCard={handleAddCard}
            onCardClick={handleCardClick}
            onDeleteList={handleDeleteList}
          />
        ))}
        <div className="w-[280px] shrink-0">
          <Button
            variant="ghost"
            className="w-full justify-start bg-surface hover:bg-surface"
            onClick={() => setIsAddingList(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add List
          </Button>
        </div>
      </div>
    );
  }

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
                  disabled={!newListName.trim()}
                >
                  Add List
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsAddingList(false);
                    setNewListName('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              className="w-full justify-start bg-surface hover:bg-surface"
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
        onLinkedCardCreated={handleLinkedCardCreated}
        onCardClick={setSelectedCard}
        currentUserId={currentUserId}
        canViewQualitySummaries={canViewQualitySummaries}
        allCards={allCards}
      />
    </DndContext>
  );
}
