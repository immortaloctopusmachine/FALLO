'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  ImageIcon,
  FileText,
  ExternalLink,
  Pencil,
  Trash2,
  X,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type UploadKind = 'image' | 'file';
type SortBy = 'uploadedAt' | 'name' | 'size' | 'uploader';
type SortOrder = 'asc' | 'desc';

interface UploadRow {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  createdAt: string;
  uploaderId: string | null;
  uploader: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
  card: {
    id: string;
    title: string;
    list: {
      id: string;
      name: string;
      board: {
        id: string;
        name: string;
      };
    };
  };
}

interface UploaderOption {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  attachmentCount: number;
}

interface UploadsResponse {
  items: UploadRow[];
  pagination: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
  uploaders?: UploaderOption[];
}

const PAGE_SIZE = 30;

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  const kb = size / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(1)} GB`;
}

function formatUploadedAt(value: string): string {
  const date = new Date(value);
  return date.toLocaleString();
}

function isImageType(type: string): boolean {
  return type.startsWith('image/');
}

function getUploaderLabel(uploader: UploadRow['uploader']): string {
  if (!uploader) return 'Unknown uploader';
  return uploader.name?.trim() || uploader.email;
}

function getUploaderInitials(uploader: UploadRow['uploader']): string {
  const label = getUploaderLabel(uploader);
  const parts = label.split(' ').filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return label.slice(0, 2).toUpperCase();
}

export function UploadsSettingsClient() {
  const [kind, setKind] = useState<UploadKind>('image');
  const [sortBy, setSortBy] = useState<SortBy>('uploadedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [uploaderId, setUploaderId] = useState<string>('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [uploaders, setUploaders] = useState<UploaderOption[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1);
    }, 250);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [kind, sortBy, sortOrder, uploaderId]);

  const fetchUploads = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        kind,
        sortBy,
        sortOrder,
        page: String(page),
        limit: String(PAGE_SIZE),
      });

      if (searchQuery) params.set('q', searchQuery);
      if (uploaderId !== 'all') params.set('uploaderId', uploaderId);
      if (page === 1) params.set('includeUploaders', 'true');

      const response = await fetch(`/api/settings/uploads?${params.toString()}`);
      const payload = await response.json();
      if (!payload.success) {
        alert(payload.error?.message || 'Failed to load uploads');
        return;
      }

      const data = payload.data as UploadsResponse;
      setRows(data.items);
      setHasMore(data.pagination.hasMore);
      if (data.uploaders) setUploaders(data.uploaders);
    } catch (error) {
      console.error('Failed to fetch uploads:', error);
      alert('Failed to fetch uploads');
    } finally {
      setIsLoading(false);
    }
  }, [kind, sortBy, sortOrder, page, searchQuery, uploaderId]);

  useEffect(() => {
    fetchUploads();
  }, [fetchUploads]);

  const startRename = (row: UploadRow) => {
    setEditingId(row.id);
    setEditingName(row.name);
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditingName('');
  };

  const saveRename = async (id: string) => {
    if (!editingName.trim() || isSavingName) return;
    setIsSavingName(true);
    try {
      const response = await fetch(`/api/settings/uploads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingName.trim() }),
      });
      const payload = await response.json();
      if (!payload.success) {
        alert(payload.error?.message || 'Failed to rename file');
        return;
      }

      const updated = payload.data as UploadRow;
      setRows((prev) => prev.map((row) => (row.id === id ? updated : row)));
      cancelRename();
    } catch (error) {
      console.error('Failed to rename upload:', error);
      alert('Failed to rename file');
    } finally {
      setIsSavingName(false);
    }
  };

  const deleteUpload = async (id: string) => {
    if (!confirm('Delete this uploaded file? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      const response = await fetch(`/api/settings/uploads/${id}`, { method: 'DELETE' });
      const payload = await response.json();
      if (!payload.success) {
        alert(payload.error?.message || 'Failed to delete file');
        return;
      }

      setRows((prev) => prev.filter((row) => row.id !== id));
    } catch (error) {
      console.error('Failed to delete upload:', error);
      alert('Failed to delete file');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-title font-semibold">Uploads Library</h2>
        <p className="mt-1 text-body text-text-secondary">
          Browse, rename, and delete uploaded project files. Images and GIFs are shown by default.
        </p>
      </div>

      <div className="rounded-lg border border-border-subtle bg-surface p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={kind === 'image' ? 'default' : 'outline'}
            onClick={() => setKind('image')}
          >
            Images &amp; GIFs
          </Button>
          <Button
            type="button"
            variant={kind === 'file' ? 'default' : 'outline'}
            onClick={() => setKind('file')}
          >
            Other Files
          </Button>
        </div>

        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search name, type, board, card, uploader..."
            className="xl:col-span-2"
          />

          <Select value={uploaderId} onValueChange={setUploaderId}>
            <SelectTrigger>
              <SelectValue placeholder="All uploaders" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All uploaders</SelectItem>
              {uploaders.map((uploader) => (
                <SelectItem key={uploader.id} value={uploader.id}>
                  {(uploader.name?.trim() || uploader.email)} ({uploader.attachmentCount})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortBy)}>
            <SelectTrigger>
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="uploadedAt">Date Uploaded</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="size">File Size</SelectItem>
              <SelectItem value="uploader">Uploader</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as SortOrder)}>
            <SelectTrigger>
              <SelectValue placeholder="Order" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Descending</SelectItem>
              <SelectItem value="asc">Ascending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden bg-surface">
        <div className="border-b border-border px-4 py-3 text-caption text-text-secondary">
          Page {page} - {rows.length} item{rows.length === 1 ? '' : 's'}
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-text-secondary">Loading uploads...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-text-secondary">No files found.</div>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((row) => {
              const uploaderLabel = getUploaderLabel(row.uploader);
              const isEditing = editingId === row.id;
              const isDeleting = deletingId === row.id;

              return (
                <div key={row.id} className="p-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1 flex gap-3">
                    <div className="h-14 w-14 shrink-0 rounded border border-border-subtle bg-background overflow-hidden flex items-center justify-center">
                      {isImageType(row.type) ? (
                        <Image
                          src={row.url}
                          alt={row.name}
                          width={56}
                          height={56}
                          className="h-14 w-14 object-cover"
                        />
                      ) : (
                        <FileText className="h-6 w-6 text-text-tertiary" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editingName}
                            onChange={(event) => setEditingName(event.target.value)}
                            className="h-8"
                          />
                          <Button size="sm" onClick={() => saveRename(row.id)} disabled={isSavingName}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelRename} disabled={isSavingName}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="font-medium text-body text-text-primary truncate">{row.name}</div>
                      )}

                      <div className="text-caption text-text-secondary">
                        {row.type} - {formatFileSize(row.size)} - {formatUploadedAt(row.createdAt)}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-caption text-text-tertiary">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={row.uploader?.image || ''} alt={uploaderLabel} />
                          <AvatarFallback className="text-[10px]">{getUploaderInitials(row.uploader)}</AvatarFallback>
                        </Avatar>
                        <span>{uploaderLabel}</span>
                        <span>-</span>
                        <Link
                          href={`/boards/${row.card.list.board.id}`}
                          className="hover:underline text-text-secondary"
                          title={`${row.card.list.board.name} / ${row.card.title}`}
                        >
                          {row.card.list.board.name} / {row.card.title}
                        </Link>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 md:pl-3">
                    <Button asChild size="sm" variant="outline">
                      <a href={row.url} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>

                    {!isEditing && (
                      <Button size="sm" variant="outline" onClick={() => startRename(row)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteUpload(row.id)}
                      disabled={isDeleting}
                      className="text-error hover:text-error"
                    >
                      {isDeleting ? <ImageIcon className="h-4 w-4 animate-pulse" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          disabled={isLoading || page <= 1}
        >
          Previous
        </Button>
        <div className="text-caption text-text-secondary">Page {page}</div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setPage((prev) => prev + 1)}
          disabled={isLoading || !hasMore}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
