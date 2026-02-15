'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, CheckCircle2, AlertTriangle, Lock, Gauge, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

type ReviewScoreValue = 'LOW' | 'MEDIUM' | 'HIGH' | 'NOT_APPLICABLE';
type QualityTier = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNSCORED';
type ConfidenceLevel = 'GREEN' | 'AMBER' | 'RED';

interface CardCyclesResponse {
  cycles: Array<{
    id: string;
    cycleNumber: number;
    openedAt: string;
    closedAt: string | null;
    isFinal: boolean;
    lockedAt: string | null;
    evaluationsCount: number;
    hasCurrentUserEvaluation: boolean;
    currentUserEvaluationUpdatedAt: string | null;
  }>;
}

interface CardQualityResponse {
  latestCycle: {
    id: string;
    cycleNumber: number;
    evaluationsCount: number;
    overallAverage: number | null;
    qualityTier: QualityTier;
    dimensions: Array<{
      dimensionId: string;
      name: string;
      description: string | null;
      average: number | null;
      scoreLabel: 'LOW' | 'MEDIUM' | 'HIGH' | null;
      count: number;
      confidence: ConfidenceLevel;
    }>;
    divergenceFlags: Array<{
      dimensionId: string;
      dimensionName: string;
      roleA: string;
      roleB: string;
      averageA: number;
      averageB: number;
      difference: number;
    }>;
  } | null;
  finalCycle: {
    id: string;
    cycleNumber: number;
    overallAverage: number | null;
    qualityTier: QualityTier;
  } | null;
  progression: Array<{
    cycleId: string;
    cycleNumber: number;
    openedAt: string;
    closedAt: string | null;
    isFinal: boolean;
    evaluationsCount: number;
    overallAverage: number | null;
    qualityTier: QualityTier;
  }>;
}

interface EvaluateFormResponse {
  cycle: {
    id: string;
    cycleNumber: number;
    lockedAt: string | null;
  };
  evaluatorRoles: string[];
  canEdit: boolean;
  hasExistingEvaluation: boolean;
  existingEvaluation: {
    id: string;
    submittedAt: string;
    updatedAt: string;
    scores: Array<{
      dimensionId: string;
      score: ReviewScoreValue;
    }>;
  } | null;
  dimensions: Array<{
    id: string;
    name: string;
    description: string | null;
    position: number;
  }>;
}

interface CardQualityPanelProps {
  cardId: string;
}

function tierTextColor(tier: QualityTier): string {
  if (tier === 'HIGH') return 'text-green-600';
  if (tier === 'MEDIUM') return 'text-amber-600';
  if (tier === 'LOW') return 'text-red-600';
  return 'text-text-tertiary';
}

function confidenceDotColor(confidence: ConfidenceLevel): string {
  if (confidence === 'GREEN') return 'bg-green-500';
  if (confidence === 'AMBER') return 'bg-amber-500';
  return 'bg-red-500';
}

function formatAverage(value: number | null): string {
  if (value === null) return 'Unscored';
  return value.toFixed(2);
}

export function CardQualityPanel({ cardId }: CardQualityPanelProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cycles, setCycles] = useState<CardCyclesResponse['cycles']>([]);
  const [quality, setQuality] = useState<CardQualityResponse | null>(null);

  const [isEvaluateOpen, setIsEvaluateOpen] = useState(false);
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [isLoadingForm, setIsLoadingForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [evaluateForm, setEvaluateForm] = useState<EvaluateFormResponse | null>(null);
  const [selectedScores, setSelectedScores] = useState<Record<string, ReviewScoreValue>>({});
  const [isSubmittingEvaluation, setIsSubmittingEvaluation] = useState(false);

  const loadQualityData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [cyclesRes, qualityRes] = await Promise.all([
        fetch(`/api/cards/${cardId}/cycles`),
        fetch(`/api/cards/${cardId}/quality`),
      ]);

      const [cyclesJson, qualityJson] = await Promise.all([
        cyclesRes.json(),
        qualityRes.json(),
      ]);

      if (!cyclesRes.ok || !cyclesJson.success) {
        throw new Error(cyclesJson.error?.message || 'Failed to load review cycles');
      }
      if (!qualityRes.ok || !qualityJson.success) {
        throw new Error(qualityJson.error?.message || 'Failed to load quality summary');
      }

      setCycles(cyclesJson.data.cycles as CardCyclesResponse['cycles']);
      setQuality(qualityJson.data as CardQualityResponse);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to load quality summary';
      setError(message);
      setCycles([]);
      setQuality(null);
    } finally {
      setIsLoading(false);
    }
  }, [cardId]);

  useEffect(() => {
    void loadQualityData();
  }, [loadQualityData]);

  const latestCycle = useMemo(() => {
    if (cycles.length === 0) return null;
    return [...cycles].sort((a, b) => b.cycleNumber - a.cycleNumber)[0];
  }, [cycles]);

  const loadEvaluateForm = useCallback(async (cycleId: string) => {
    setIsLoadingForm(true);
    setFormError(null);

    try {
      const response = await fetch(`/api/cycles/${cycleId}/evaluate`);
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to load evaluation form');
      }

      const data = json.data as EvaluateFormResponse;
      setEvaluateForm(data);

      const initialScores: Record<string, ReviewScoreValue> = {};
      if (data.existingEvaluation) {
        for (const scoreRow of data.existingEvaluation.scores) {
          initialScores[scoreRow.dimensionId] = scoreRow.score;
        }
      }

      for (const dimension of data.dimensions) {
        if (!initialScores[dimension.id]) {
          initialScores[dimension.id] = 'NOT_APPLICABLE';
        }
      }

      setSelectedScores(initialScores);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to load evaluation form';
      setFormError(message);
      setEvaluateForm(null);
      setSelectedScores({});
    } finally {
      setIsLoadingForm(false);
    }
  }, []);

  useEffect(() => {
    if (!isEvaluateOpen || !selectedCycleId) return;
    void loadEvaluateForm(selectedCycleId);
  }, [isEvaluateOpen, selectedCycleId, loadEvaluateForm]);

  const openEvaluateDialog = () => {
    if (!latestCycle) return;
    setSelectedCycleId(latestCycle.id);
    setEvaluateForm(null);
    setFormError(null);
    setIsEvaluateOpen(true);
  };

  const handleSubmitEvaluation = async () => {
    if (!evaluateForm) return;

    setIsSubmittingEvaluation(true);
    try {
      const payload = {
        scores: evaluateForm.dimensions.map((dimension) => ({
          dimensionId: dimension.id,
          score: selectedScores[dimension.id] || 'NOT_APPLICABLE',
        })),
      };

      const response = await fetch(`/api/cycles/${evaluateForm.cycle.id}/evaluate`, {
        method: evaluateForm.hasExistingEvaluation ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to submit evaluation');
      }

      toast.success(evaluateForm.hasExistingEvaluation ? 'Evaluation updated' : 'Evaluation submitted');
      setIsEvaluateOpen(false);
      await loadQualityData();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Failed to submit evaluation';
      toast.error(message);
    } finally {
      setIsSubmittingEvaluation(false);
    }
  };

  const canEvaluate = Boolean(latestCycle) && latestCycle?.lockedAt === null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-caption text-text-secondary">
          <Gauge className="h-4 w-4" />
          Card Quality
        </div>
        {latestCycle && (
          <Button
            size="sm"
            variant={canEvaluate ? 'default' : 'outline'}
            onClick={openEvaluateDialog}
            disabled={!canEvaluate}
            className={cn(!canEvaluate && 'cursor-not-allowed')}
          >
            {!canEvaluate ? (
              <>
                <Lock className="mr-1 h-4 w-4" />
                Locked
              </>
            ) : latestCycle.hasCurrentUserEvaluation ? (
              <>
                <CheckCircle2 className="mr-1 h-4 w-4" />
                Evaluated
              </>
            ) : (
              'Evaluate'
            )}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="rounded-md border border-border-subtle bg-surface p-4 text-body text-text-tertiary">
          Loading quality summary...
        </div>
      ) : error ? (
        <div className="rounded-md border border-red-300 bg-red-50 p-4 text-body text-red-700">
          {error}
        </div>
      ) : !quality || cycles.length === 0 ? (
        <div className="rounded-md border border-border-subtle bg-surface p-4 text-body text-text-tertiary">
          This card has no review cycles yet. Move it to Review to start evaluations.
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-md border border-border-subtle bg-surface p-3">
              <div className="text-caption text-text-tertiary">Latest Cycle</div>
              <div className="mt-1 text-title font-semibold">#{quality.latestCycle?.cycleNumber ?? '-'}</div>
              <div className="text-caption text-text-tertiary">
                {quality.latestCycle?.evaluationsCount ?? 0} evaluations
              </div>
            </div>
            <div className="rounded-md border border-border-subtle bg-surface p-3">
              <div className="text-caption text-text-tertiary">Latest Average</div>
              <div className={cn('mt-1 text-title font-semibold', quality.latestCycle ? tierTextColor(quality.latestCycle.qualityTier) : 'text-text-tertiary')}>
                {formatAverage(quality.latestCycle?.overallAverage ?? null)}
              </div>
              <div className="text-caption text-text-tertiary">{quality.latestCycle?.qualityTier ?? 'UNSCORED'}</div>
            </div>
            <div className="rounded-md border border-border-subtle bg-surface p-3">
              <div className="text-caption text-text-tertiary">Final Cycle</div>
              <div className={cn('mt-1 text-title font-semibold', quality.finalCycle ? tierTextColor(quality.finalCycle.qualityTier) : 'text-text-tertiary')}>
                {formatAverage(quality.finalCycle?.overallAverage ?? null)}
              </div>
              <div className="text-caption text-text-tertiary">
                {quality.finalCycle ? `#${quality.finalCycle.cycleNumber}` : 'Not finalized'}
              </div>
            </div>
          </div>

          <div className="rounded-md border border-border-subtle bg-surface p-3">
            <div className="mb-2 flex items-center gap-2 text-caption font-medium text-text-secondary">
              <BarChart3 className="h-4 w-4" />
              Dimension Summary
            </div>
            {quality.latestCycle?.dimensions.length ? (
              <div className="space-y-2">
                {quality.latestCycle.dimensions.map((dimension) => (
                  <div key={dimension.dimensionId} className="flex items-center justify-between gap-2 rounded-md border border-border-subtle bg-background px-2 py-2">
                    <div>
                      <div className="text-body font-medium text-text-primary">{dimension.name}</div>
                      <div className="text-caption text-text-tertiary">n={dimension.count}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn('h-2.5 w-2.5 rounded-full', confidenceDotColor(dimension.confidence))} />
                      <span className="text-body font-medium text-text-primary">{formatAverage(dimension.average)}</span>
                      <span className="text-caption text-text-tertiary">{dimension.scoreLabel || 'N/A'}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-caption text-text-tertiary">No dimension scores available yet.</div>
            )}
          </div>

          <div className="rounded-md border border-border-subtle bg-surface p-3">
            <div className="mb-2 flex items-center gap-2 text-caption font-medium text-text-secondary">
              <TrendingUp className="h-4 w-4" />
              Cycle Progression
            </div>
            <div className="space-y-2">
              {quality.progression.map((cycle) => (
                <div key={cycle.cycleId} className="flex items-center justify-between rounded-md border border-border-subtle bg-background px-2 py-2">
                  <div className="text-body text-text-primary">Cycle #{cycle.cycleNumber}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-caption text-text-tertiary">n={cycle.evaluationsCount}</span>
                    <span className={cn('text-body font-medium', tierTextColor(cycle.qualityTier))}>
                      {formatAverage(cycle.overallAverage)}
                    </span>
                    <span className="text-caption text-text-tertiary">{cycle.qualityTier}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {quality.latestCycle?.divergenceFlags.length ? (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3">
              <div className="mb-2 flex items-center gap-2 text-caption font-medium text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                Divergence Flags
              </div>
              <div className="space-y-1 text-caption text-amber-900">
                {quality.latestCycle.divergenceFlags.map((flag) => (
                  <div key={`${flag.dimensionId}-${flag.roleA}-${flag.roleB}`}>
                    {flag.dimensionName}: {flag.roleA} vs {flag.roleB} ({flag.difference.toFixed(2)})
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}

      <Dialog open={isEvaluateOpen} onOpenChange={setIsEvaluateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Evaluate Review Cycle</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-caption text-text-secondary">Cycle</div>
              <Select value={selectedCycleId} onValueChange={setSelectedCycleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select cycle" />
                </SelectTrigger>
                <SelectContent>
                  {[...cycles]
                    .sort((a, b) => b.cycleNumber - a.cycleNumber)
                    .map((cycle) => (
                      <SelectItem key={cycle.id} value={cycle.id}>
                        Cycle #{cycle.cycleNumber} {cycle.lockedAt ? '(Locked)' : ''}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {isLoadingForm ? (
              <div className="rounded-md border border-border-subtle bg-surface p-4 text-body text-text-tertiary">
                Loading evaluation form...
              </div>
            ) : formError ? (
              <div className="rounded-md border border-red-300 bg-red-50 p-4 text-body text-red-700">
                {formError}
              </div>
            ) : evaluateForm ? (
              <>
                {evaluateForm.canEdit ? (
                  <div className="space-y-3 max-h-[48vh] overflow-y-auto pr-1">
                    {evaluateForm.dimensions.map((dimension) => (
                      <div key={dimension.id} className="rounded-md border border-border-subtle bg-surface p-3">
                        <div className="text-body font-medium text-text-primary">{dimension.name}</div>
                        {dimension.description ? (
                          <div className="mt-0.5 text-caption text-text-tertiary">{dimension.description}</div>
                        ) : null}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(['LOW', 'MEDIUM', 'HIGH', 'NOT_APPLICABLE'] as ReviewScoreValue[]).map((score) => (
                            <Button
                              key={score}
                              type="button"
                              size="sm"
                              variant={selectedScores[dimension.id] === score ? 'default' : 'outline'}
                              onClick={() => {
                                setSelectedScores((prev) => ({
                                  ...prev,
                                  [dimension.id]: score,
                                }));
                              }}
                            >
                              {score === 'NOT_APPLICABLE' ? 'N/A' : score.charAt(0) + score.slice(1).toLowerCase()}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-body text-amber-900">
                    This cycle is locked or no eligible dimensions are available for your role.
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsEvaluateOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitEvaluation}
                    disabled={!evaluateForm.canEdit || isSubmittingEvaluation}
                  >
                    {isSubmittingEvaluation
                      ? 'Saving...'
                      : evaluateForm.hasExistingEvaluation
                        ? 'Update Evaluation'
                        : 'Submit Evaluation'}
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
