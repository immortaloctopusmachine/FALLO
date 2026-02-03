'use client';

import { useState } from 'react';
import { Settings } from 'lucide-react';
import { TeamSettingsModal } from './TeamSettingsModal';

interface Studio {
  id: string;
  name: string;
  color: string | null;
}

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface TeamMember {
  id: string;
  role: string;
  title: string | null;
  user: User;
}

interface Team {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  color: string;
  studio: Studio | null;
  members: TeamMember[];
}

interface TeamSettingsButtonProps {
  team: Team;
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
