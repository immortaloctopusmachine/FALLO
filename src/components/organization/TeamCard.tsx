'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Users, Layers, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
interface TeamMember {
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface TeamCardProps {
  id: string;
  name: string;
  description?: string | null;
  image?: string | null;
  color: string;
  memberCount: number;
  boardCount: number;
  members?: TeamMember[];
  showDelete?: boolean;
}

export function TeamCard({
  id,
  name,
  description,
  image,
  color,
  memberCount,
  boardCount,
  members = [],
  showDelete = false,
}: TeamCardProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const displayMembers = members.slice(0, 4);
  const remainingCount = memberCount - displayMembers.length;

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/teams/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        setShowDeleteDialog(false);
        router.refresh();
      }
    } catch (err) {
      console.error('Failed to delete team:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Link
        href={`/teams/${id}`}
        className="group relative block rounded-lg border border-border bg-surface overflow-hidden transition-colors hover:border-border hover:bg-surface-raised"
      >
      {/* Color Banner */}
      <div
        className="relative h-16"
        style={{
          backgroundImage: image ? `url(${image})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: !image ? color : undefined,
        }}
      >
        {showDelete && (
          <button
            onClick={handleDelete}
            className="absolute top-2 right-2 p-1.5 rounded-md bg-black/30 text-white opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all"
            title="Delete team"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-white"
            style={{ backgroundColor: color }}
          >
            <Users className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-title font-semibold text-text-primary group-hover:text-text-primary">
              {name}
            </h3>
            {description && (
              <p className="mt-1 line-clamp-2 text-caption text-text-secondary">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Member Avatars */}
        {displayMembers.length > 0 && (
          <div className="mt-3 flex items-center">
            <div className="flex -space-x-2">
              {displayMembers.map(({ user }) => (
                <div
                  key={user.id}
                  className="relative h-7 w-7 rounded-full border-2 border-surface bg-surface-hover overflow-hidden"
                  title={user.name || user.email}
                >
                  {user.image ? (
                    <Image
                      src={user.image}
                      alt={user.name || user.email}
                      width={28}
                      height={28}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-tiny font-medium text-text-secondary">
                      {(user.name || user.email).charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              ))}
              {remainingCount > 0 && (
                <div className="relative h-7 w-7 rounded-full border-2 border-surface bg-surface-hover flex items-center justify-center">
                  <span className="text-tiny font-medium text-text-secondary">
                    +{remainingCount}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-3 flex items-center gap-4 text-caption text-text-tertiary">
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            <span>{memberCount} members</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            <span>{boardCount} boards</span>
          </div>
        </div>
      </div>
    </Link>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{name}&quot;? This action cannot be undone.
              Team members will be removed, but boards will remain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Team'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
