'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, CheckSquare, BookOpen, Layers, FileText, ArrowLeft, Check, ListTodo, Clapperboard, Paperclip, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Card, TaskCard, Checklist, Attachment } from '@/types';
import { cn } from '@/lib/utils';

interface ReviewModeOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  reviewListId: string;
  reviewListName: string;
  cards: Card[];
  boardId: string;
  allLists: { id: string; name: string }[];
  onCardMoved: (cardId: string, targetListId: string) => void;
}

interface CardDetail {
  card: Card;
  attachments: Attachment[];
  checklists: Checklist[];
}

const cardTypeConfig = {
  TASK: { label: 'Task', icon: CheckSquare, color: 'text-card-task', bg: 'bg-card-task/10' },
  USER_STORY: { label: 'User Story', icon: BookOpen, color: 'text-card-story', bg: 'bg-card-story/10' },
  EPIC: { label: 'Epic', icon: Layers, color: 'text-card-epic', bg: 'bg-card-epic/10' },
  UTILITY: { label: 'Utility', icon: FileText, color: 'text-card-utility', bg: 'bg-card-utility/10' },
};

export function ReviewModeOverlay({
  isOpen,
  onClose,
  reviewListId: _reviewListId,
  reviewListName,
  cards,
  boardId,
  allLists,
  onCardMoved,
}: ReviewModeOverlayProps) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [cardDetail, setCardDetail] = useState<CardDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [movingCardId, setMovingCardId] = useState<string | null>(null);

  // Target lists
  const todoList = allLists.find(l => l.name === 'To Do');
  const todoAnimationList = allLists.find(l => l.name === 'To Do Animation');
  const doneList = allLists.find(l => l.name === 'Done');

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedCardId) {
          setSelectedCardId(null);
          setCardDetail(null);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedCardId, onClose]);

  // Fetch card detail when selected
  useEffect(() => {
    if (!selectedCardId) {
      setCardDetail(null);
      return;
    }

    const fetchDetail = async () => {
      setIsLoadingDetail(true);
      try {
        const [cardRes, attachRes, checkRes] = await Promise.all([
          fetch(`/api/boards/${boardId}/cards/${selectedCardId}`),
          fetch(`/api/boards/${boardId}/cards/${selectedCardId}/attachments`),
          fetch(`/api/boards/${boardId}/cards/${selectedCardId}/checklists`),
        ]);

        const [cardData, attachData, checkData] = await Promise.all([
          cardRes.json(),
          attachRes.json(),
          checkRes.json(),
        ]);

        if (cardData.success) {
          setCardDetail({
            card: cardData.data,
            attachments: attachData.success ? attachData.data : [],
            checklists: checkData.success ? checkData.data : [],
          });
        }
      } catch (error) {
        console.error('Failed to fetch card detail:', error);
      } finally {
        setIsLoadingDetail(false);
      }
    };

    fetchDetail();
  }, [selectedCardId, boardId]);

  const handleMoveCard = useCallback(async (cardId: string, targetListId: string) => {
    setMovingCardId(cardId);
    onCardMoved(cardId, targetListId);
    // Go back to grid after move
    setSelectedCardId(null);
    setCardDetail(null);
    setMovingCardId(null);
  }, [onCardMoved]);

  if (!isOpen) return null;

  const feedbackChecklists = cardDetail?.checklists.filter(c => c.type === 'feedback') || [];

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={() => {
        if (selectedCardId) {
          setSelectedCardId(null);
          setCardDetail(null);
        } else {
          onClose();
        }
      }} />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between border-b border-white/10 bg-black/80 px-6 py-3">
        <div className="flex items-center gap-3">
          {selectedCardId && (
            <Button
              variant="ghost"
              size="sm"
              className="text-white/70 hover:text-white hover:bg-white/10"
              onClick={() => {
                setSelectedCardId(null);
                setCardDetail(null);
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}
          <h2 className="text-lg font-semibold text-white">
            Review Mode — {reviewListName}
          </h2>
          <span className="text-sm text-white/50">{cards.length} cards</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-white/70 hover:text-white hover:bg-white/10"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 overflow-auto p-6">
        {!selectedCardId ? (
          /* Grid View */
          cards.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-lg text-white/50">No cards in review</p>
                <p className="text-sm text-white/30 mt-1">All done! Close to go back to the board.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
              {cards.map((card) => {
                const config = cardTypeConfig[card.type];
                const Icon = config.icon;
                const taskCard = card.type === 'TASK' ? card as TaskCard : null;
                const isMoving = movingCardId === card.id;

                return (
                  <button
                    key={card.id}
                    onClick={() => !isMoving && setSelectedCardId(card.id)}
                    disabled={isMoving}
                    className={cn(
                      'rounded-lg bg-surface border border-border p-4 text-left transition-all hover:bg-surface-raised hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/5',
                      isMoving && 'opacity-50 pointer-events-none'
                    )}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <div className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded', config.bg)}>
                        <Icon className={cn('h-3.5 w-3.5', config.color)} />
                      </div>
                      <h3 className="text-body font-medium text-text-primary line-clamp-2">
                        {card.title}
                      </h3>
                    </div>
                    {taskCard?.taskData?.storyPoints && (
                      <span className="inline-flex rounded bg-card-task/10 px-1.5 py-0.5 text-tiny font-medium text-card-task">
                        {taskCard.taskData.storyPoints} SP
                      </span>
                    )}
                    {taskCard?.assignees && taskCard.assignees.length > 0 && (
                      <div className="flex -space-x-1 mt-2">
                        {taskCard.assignees.slice(0, 4).map((a) => (
                          <Avatar key={a.id} className="h-5 w-5 border border-surface">
                            <AvatarImage src={a.user.image || undefined} />
                            <AvatarFallback className="text-[8px]">
                              {(a.user.name || a.user.email)[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {taskCard.assignees.length > 4 && (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full border border-surface bg-surface-raised text-[8px] text-text-tertiary">
                            +{taskCard.assignees.length - 4}
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )
        ) : (
          /* Detail View — 4-section layout */
          <div className="max-w-7xl mx-auto">
            {isLoadingDetail || !cardDetail ? (
              <div className="grid grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-96 animate-pulse rounded-lg bg-white/5" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-4 items-start">
                {/* Section 1: Card Info */}
                <div className="rounded-lg bg-surface border border-border p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const config = cardTypeConfig[cardDetail.card.type];
                      const Icon = config.icon;
                      return (
                        <>
                          <div className={cn('flex h-7 w-7 items-center justify-center rounded', config.bg)}>
                            <Icon className={cn('h-4 w-4', config.color)} />
                          </div>
                          <span className={cn('text-caption font-medium', config.color)}>
                            {config.label}
                          </span>
                        </>
                      );
                    })()}
                  </div>

                  <h3 className="text-title font-semibold text-text-primary">
                    {cardDetail.card.title}
                  </h3>

                  {cardDetail.card.description && (
                    <p className="text-caption text-text-secondary line-clamp-6">
                      {cardDetail.card.description}
                    </p>
                  )}

                  {/* Story points */}
                  {cardDetail.card.type === 'TASK' && (cardDetail.card as TaskCard).taskData?.storyPoints && (
                    <div className="flex items-center gap-2">
                      <span className="text-tiny text-text-tertiary">Story Points:</span>
                      <span className="rounded bg-card-task/10 px-1.5 py-0.5 text-tiny font-medium text-card-task">
                        {(cardDetail.card as TaskCard).taskData.storyPoints}
                      </span>
                    </div>
                  )}

                  {/* Assignees */}
                  {cardDetail.card.type === 'TASK' && (cardDetail.card as TaskCard).assignees && (cardDetail.card as TaskCard).assignees!.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-tiny text-text-tertiary">Assignees</span>
                      <div className="space-y-1">
                        {(cardDetail.card as TaskCard).assignees!.map((a) => (
                          <div key={a.id} className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={a.user.image || undefined} />
                              <AvatarFallback className="text-[8px]">
                                {(a.user.name || a.user.email)[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-caption text-text-secondary">
                              {a.user.name || a.user.email}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 2: Attachments */}
                <div className="rounded-lg bg-surface border border-border p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-text-tertiary" />
                    <h4 className="text-body font-semibold text-text-primary">
                      Attachments ({cardDetail.attachments.length})
                    </h4>
                  </div>

                  {cardDetail.attachments.length === 0 ? (
                    <p className="text-caption text-text-tertiary py-4 text-center">
                      No attachments
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                      {cardDetail.attachments.map((att) => {
                        const isImage = att.type.startsWith('image/');
                        return (
                          <a
                            key={att.id}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block rounded-md border border-border overflow-hidden hover:border-purple-500/30 transition-colors"
                          >
                            {isImage ? (
                              <div className="relative aspect-video bg-surface-hover">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={att.url}
                                  alt={att.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 p-2 bg-surface-hover">
                                <FileText className="h-4 w-4 text-text-tertiary shrink-0" />
                                <span className="text-caption text-text-secondary truncate">
                                  {att.name}
                                </span>
                              </div>
                            )}
                            <div className="px-2 py-1.5">
                              <span className="text-tiny text-text-tertiary truncate block">
                                {att.name}
                              </span>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Section 3: Feedback/Tweaks */}
                <div className="rounded-lg bg-surface border border-border p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-text-tertiary" />
                    <h4 className="text-body font-semibold text-text-primary">
                      Feedback / Tweaks
                    </h4>
                  </div>

                  {feedbackChecklists.length === 0 ? (
                    <p className="text-caption text-text-tertiary py-4 text-center">
                      No feedback checklists
                    </p>
                  ) : (
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                      {feedbackChecklists.map((checklist) => {
                        const completed = checklist.items.filter(i => i.isComplete).length;
                        const total = checklist.items.length;
                        return (
                          <div key={checklist.id} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h5 className="text-caption font-medium text-text-primary">
                                {checklist.name}
                              </h5>
                              <span className="text-tiny text-text-tertiary">
                                {completed}/{total}
                              </span>
                            </div>
                            {/* Progress bar */}
                            <div className="h-1 rounded-full bg-surface-hover">
                              <div
                                className={cn(
                                  'h-1 rounded-full transition-all',
                                  completed === total ? 'bg-green-500' : 'bg-purple-500'
                                )}
                                style={{ width: total > 0 ? `${(completed / total) * 100}%` : '0%' }}
                              />
                            </div>
                            <div className="space-y-1">
                              {checklist.items.map((item) => (
                                <div key={item.id} className="flex items-start gap-2">
                                  <div className={cn(
                                    'mt-0.5 h-4 w-4 rounded border flex items-center justify-center shrink-0',
                                    item.isComplete
                                      ? 'bg-green-500 border-green-500'
                                      : 'border-border'
                                  )}>
                                    {item.isComplete && <Check className="h-3 w-3 text-white" />}
                                  </div>
                                  <span className={cn(
                                    'text-caption',
                                    item.isComplete ? 'text-text-tertiary line-through' : 'text-text-secondary'
                                  )}>
                                    {item.content}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Section 4: Actions */}
                <div className="rounded-lg bg-surface border border-border p-4 space-y-3">
                  <h4 className="text-body font-semibold text-text-primary">Actions</h4>

                  <div className="space-y-2">
                    {doneList && (
                      <Button
                        className="w-full justify-start bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleMoveCard(cardDetail.card.id, doneList.id)}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Move to Done
                      </Button>
                    )}

                    {todoList && (
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => handleMoveCard(cardDetail.card.id, todoList.id)}
                      >
                        <ListTodo className="h-4 w-4 mr-2" />
                        Move to To Do
                      </Button>
                    )}

                    {todoAnimationList && (
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => handleMoveCard(cardDetail.card.id, todoAnimationList.id)}
                      >
                        <Clapperboard className="h-4 w-4 mr-2" />
                        Move to To Do Animation
                      </Button>
                    )}
                  </div>

                  <div className="pt-2 border-t border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-text-tertiary"
                      onClick={() => {
                        setSelectedCardId(null);
                        setCardDetail(null);
                      }}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to grid
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
