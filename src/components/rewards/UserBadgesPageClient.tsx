'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Award, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import {
  compareBadgeCategories,
  describeBadgeRequirement,
  getBadgeCategoryMeta,
  type BadgeDisplayDefinition,
} from '@/lib/rewards/presentation';
import { BadgeMedallion } from '@/components/rewards/BadgeMedallion';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface BadgeCollectionEntry {
  badge: {
    id: string;
    slug: string;
    name: string;
    description: string;
    category: BadgeDisplayDefinition['category'];
    tier: string | null;
    iconUrl: string | null;
  };
  timesEarned: number;
  firstAwardedAt: string;
  lastAwardedAt: string;
}

interface BadgeCollectionResponse {
  userId: string;
  totalAwards: number;
  uniqueBadges: number;
  trophyCase: BadgeCollectionEntry[];
  recentAwards: Array<{
    id: string;
    awardedAt: string;
    badge: BadgeCollectionEntry['badge'];
  }>;
}

function groupDefinitions(definitions: BadgeDisplayDefinition[]) {
  const grouped = new Map<BadgeDisplayDefinition['category'], BadgeDisplayDefinition[]>();

  for (const definition of definitions) {
    const existing = grouped.get(definition.category) ?? [];
    existing.push(definition);
    grouped.set(definition.category, existing);
  }

  return Array.from(grouped.entries())
    .sort((a, b) => compareBadgeCategories(a[0], b[0]))
    .map(([category, items]) => ({
      category,
      meta: getBadgeCategoryMeta(category),
      items,
    }));
}

export function UserBadgesPageClient() {
  const [filters, setFilters] = useState({
    search: '',
    category: '',
  });

  const { data: definitions = [], isLoading: isLoadingDefinitions } = useQuery({
    queryKey: ['badges', 'definitions'],
    queryFn: () => apiFetch<BadgeDisplayDefinition[]>('/api/badges'),
  });

  const { data: collection, isLoading: isLoadingCollection } = useQuery({
    queryKey: ['badges', 'my'],
    queryFn: () => apiFetch<BadgeCollectionResponse>('/api/badges/my'),
  });

  const trophyCase = new Map(collection?.trophyCase.map((entry) => [entry.badge.id, entry]) ?? []);
  const groupedDefinitions = groupDefinitions(definitions);
  const categoryOptions = groupedDefinitions.map((group) => ({
    value: group.category,
    label: group.meta.label,
    count: group.items.length,
  }));
  const filteredDefinitions = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    return definitions.filter((definition) => {
      const categoryMeta = getBadgeCategoryMeta(definition.category);
      const matchesCategory = !filters.category || definition.category === filters.category;
      const matchesSearch = !search
        || definition.name.toLowerCase().includes(search)
        || definition.slug.toLowerCase().includes(search)
        || definition.description.toLowerCase().includes(search)
        || categoryMeta.label.toLowerCase().includes(search);

      return matchesCategory && matchesSearch;
    });
  }, [definitions, filters]);
  const filteredGroups = groupDefinitions(filteredDefinitions);
  const isLoading = isLoadingDefinitions || isLoadingCollection;

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <section className="skin-backplate rounded-2xl border border-border bg-surface px-5 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-background/80 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-text-tertiary">
                <Award className="h-3.5 w-3.5" />
                Badge Collection
              </div>
              <h1 className="text-heading font-semibold text-text-primary">
                All badges and how to unlock them
              </h1>
              <p className="max-w-3xl text-body text-text-secondary">
                Collected badges stay in full color. Locked badges stay visible so users can see what is still available.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border-subtle bg-background/80 px-4 py-3">
                <div className="text-caption text-text-tertiary">Collected</div>
                <div className="mt-1 text-2xl font-semibold text-text-primary">
                  {collection?.uniqueBadges ?? 0}
                </div>
              </div>
              <div className="rounded-xl border border-border-subtle bg-background/80 px-4 py-3">
                <div className="text-caption text-text-tertiary">Total Awards</div>
                <div className="mt-1 text-2xl font-semibold text-text-primary">
                  {collection?.totalAwards ?? 0}
                </div>
              </div>
              <div className="rounded-xl border border-border-subtle bg-background/80 px-4 py-3">
                <div className="text-caption text-text-tertiary">Available</div>
                <div className="mt-1 text-2xl font-semibold text-text-primary">
                  {definitions.length}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <Link
              href="/home"
              className="inline-flex items-center gap-1 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
            >
              Back to home
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {isLoading ? (
          <section className="rounded-2xl border border-border bg-surface px-5 py-8 text-center text-text-secondary">
            Loading badge collection...
          </section>
        ) : (
          <TooltipProvider delayDuration={120}>
            <div className="space-y-6">
              <section className="rounded-2xl border border-border bg-surface p-5">
                <div className="grid gap-4 md:grid-cols-[minmax(0,1.5fr)_18rem]">
                  <label className="space-y-1">
                    <div className="text-caption text-text-secondary">Search badges</div>
                    <Input
                      value={filters.search}
                      onChange={(event) =>
                        setFilters((previous) => ({ ...previous, search: event.target.value }))
                      }
                      placeholder="Name, slug, description..."
                    />
                  </label>
                  <label className="space-y-1">
                    <div className="text-caption text-text-secondary">Category</div>
                    <select
                      value={filters.category}
                      onChange={(event) =>
                        setFilters((previous) => ({ ...previous, category: event.target.value }))
                      }
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    >
                      <option value="">All categories</option>
                      {categoryOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label} ({option.count})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="mt-3 text-caption text-text-tertiary">
                  Showing {filteredDefinitions.length} of {definitions.length} badges.
                </div>
              </section>

              {filteredGroups.length === 0 ? (
                <section className="rounded-2xl border border-border bg-surface px-5 py-8 text-center text-text-secondary">
                  No badges match the current search/filter.
                </section>
              ) : filteredGroups.map((group) => (
                <section
                  key={group.category}
                  className="rounded-2xl border border-border bg-surface p-5"
                >
                  <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2 className="text-title font-semibold text-text-primary">
                        {group.meta.label}
                      </h2>
                      <p className="text-sm text-text-secondary">
                        {group.meta.subtitle}
                      </p>
                    </div>
                    <div className="text-sm text-text-tertiary">
                      {group.items.filter((item) => trophyCase.has(item.id)).length}/{group.items.length} collected
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {group.items.map((definition) => {
                      const entry = trophyCase.get(definition.id);
                      const collected = Boolean(entry);

                      return (
                        <Tooltip key={definition.id}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className={cn(
                                'flex min-h-[7.25rem] items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors',
                                collected
                                  ? 'border-border-subtle bg-background/85 hover:bg-background'
                                  : 'border-border-subtle bg-background/45 text-text-secondary hover:bg-background/65'
                              )}
                            >
                              <BadgeMedallion
                                badge={definition}
                                size="lg"
                                locked={!collected}
                                timesEarned={entry?.timesEarned}
                                renderMode="art"
                              />
                              <div className="min-w-0">
                                <div className={cn('truncate text-sm font-semibold', collected ? 'text-text-primary' : 'text-text-secondary')}>
                                  {definition.name}
                                </div>
                                <div className="mt-1 text-xs text-text-tertiary">
                                  {definition.description}
                                </div>
                                <div className="mt-2 text-[0.68rem] uppercase tracking-[0.18em] text-text-tertiary">
                                  {group.meta.label}
                                  {definition.tier ? ` / ${definition.tier}` : ''}
                                </div>
                              </div>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs rounded-xl border border-white/10 bg-surface px-3 py-3 text-left text-sm text-text-primary shadow-xl">
                            <div className="font-semibold text-text-primary">
                              {definition.name}
                            </div>
                            <div className="mt-1 text-sm text-text-secondary">
                              {definition.description}
                            </div>
                            <div className="mt-3 rounded-lg bg-background/90 px-3 py-2 text-xs text-text-secondary">
                              {describeBadgeRequirement(definition)}
                            </div>
                            <div className="mt-2 text-xs text-text-tertiary">
                              {collected
                                ? `Collected ${entry?.timesEarned ?? 1} time${(entry?.timesEarned ?? 1) === 1 ? '' : 's'}.`
                                : 'Not collected yet.'}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}
