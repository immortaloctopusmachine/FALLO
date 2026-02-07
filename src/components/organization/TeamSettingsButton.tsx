'use client';

import { useState } from 'react';
import { Settings } from 'lucide-react';
import { TeamSettingsModal } from './TeamSettingsModal';
import type { Team as BaseTeam, User as BaseUser } from '@/types';

interface Studio {
  id: string;
  name: string;
  color: string | null;
}

type TeamMemberUser = Pick<BaseUser, 'id' | 'name' | 'email' | 'image'>;

interface TeamMember {
  id: string;
  permission: string;
  title: string | null;
  user: TeamMemberUser;
}

type TeamSettingsTeam = Pick<BaseTeam, 'id' | 'name' | 'color'> & {
  description: string | null;
  image: string | null;
  studio: Studio | null;
  members: TeamMember[];
};

interface TeamSettingsButtonProps {
  team: TeamSettingsTeam;
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
