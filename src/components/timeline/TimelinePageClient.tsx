'use client';

import { TimelineView } from '@/components/timeline/TimelineView';
import { TimelineSkeleton } from '@/components/timeline/TimelineSkeleton';
import { useTimelineData } from '@/hooks/api/use-timeline';

interface TimelinePageClientProps {
  isAdmin: boolean;
  openCreateDialog: boolean;
}

export function TimelinePageClient({ isAdmin, openCreateDialog }: TimelinePageClientProps) {
  const { data, isLoading } = useTimelineData();

  if (isLoading || !data) return <TimelineSkeleton />;

  return (
    <TimelineView
      projects={data.projects}
      archivedProjects={data.archivedProjects || []}
      teams={data.teams}
      users={data.users}
      blockTypes={data.blockTypes}
      eventTypes={data.eventTypes}
      isAdmin={isAdmin}
      openCreateDialog={openCreateDialog}
    />
  );
}
