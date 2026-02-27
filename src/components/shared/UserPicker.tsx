'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type PickerUser = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
};

type PickerMember = {
  user: PickerUser;
};

interface UserPickerProps<TMember extends PickerMember> {
  members: TMember[];
  selectedUserId: string;
  onSelect: (userId: string) => void;
}

export function UserPicker<TMember extends PickerMember>({
  members,
  selectedUserId,
  onSelect,
}: UserPickerProps<TMember>) {
  const [open, setOpen] = useState(false);
  const selected = members.find((member) => member.user.id === selectedUserId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-2 w-full rounded-md border border-border bg-surface px-2 py-1 text-body hover:bg-surface-hover transition-colors text-left"
        >
          {selected ? (
            <>
              <Avatar className="h-5 w-5">
                <AvatarImage src={selected.user.image || undefined} />
                <AvatarFallback className="text-[10px]">
                  {(selected.user.name || selected.user.email)[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{selected.user.name || selected.user.email}</span>
            </>
          ) : (
            <span className="text-text-tertiary">Select member...</span>
          )}
          <ChevronsUpDown className="ml-auto h-3 w-3 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search members..." />
          <CommandList>
            <CommandEmpty>No members found.</CommandEmpty>
            <CommandGroup>
              {members.map((member) => (
                <CommandItem
                  key={member.user.id}
                  value={member.user.name || member.user.email}
                  onSelect={() => {
                    onSelect(member.user.id);
                    setOpen(false);
                  }}
                >
                  <Check className={cn('mr-2 h-3.5 w-3.5', selectedUserId === member.user.id ? 'opacity-100' : 'opacity-0')} />
                  <Avatar className="h-5 w-5 mr-2">
                    <AvatarImage src={member.user.image || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {(member.user.name || member.user.email)[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{member.user.name || 'Unnamed'}</span>
                    <span className="text-tiny text-text-tertiary truncate">{member.user.email}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
