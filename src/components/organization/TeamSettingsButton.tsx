'use client';

import { useState } from 'react';
import { Settings } from 'lucide-react';
import { TeamSettingsModal } from './TeamSettingsModal';
import type { TeamDetail } from '@/types';

interface TeamSettingsButtonProps {
  team: TeamDetail;
}

export function TeamSettingsButton({ team }: TeamSettingsButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-2 rounded-md hover:bg-surface-hover text-text-secondary hover:text-text-primary"
      >
        <Settings className="h-5 w-5" />
      </button>
      <TeamSettingsModal team={team} open={open} onOpenChange={setOpen} />
    </>
  );
}
