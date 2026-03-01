'use client';

import { useState } from 'react';
import { GraduationCap, Plus } from 'lucide-react';
import { useAcademyLanding, useAcademyMutations } from '@/hooks/api/use-academy';
import { AcademySkeleton } from './AcademySkeleton';
import { AcademyCard } from './AcademyCard';
import { CategoryFilter } from './CategoryFilter';
import { EditModeToggle } from './EditModeToggle';
import { CategoryManager } from './CategoryManager';

interface AcademyPageClientProps {
  isSuperAdmin: boolean;
}

export function AcademyPageClient({ isSuperAdmin }: AcademyPageClientProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [editMode, setEditMode] = useState(false);
  const [showCreateTutorial, setShowCreateTutorial] = useState(false);
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const { data, isLoading } = useAcademyLanding(selectedCategory);
  const mutations = useAcademyMutations();

  if (isLoading) return <AcademySkeleton />;
  if (!data) return <AcademySkeleton />;

  const { tutorials, courses, categories } = data;
  const allItems = [...tutorials, ...courses].sort((a, b) => {
    // Show in-progress first, then by type
    const aProgress = a.userProgress && !a.userProgress.passed ? 1 : 0;
    const bProgress = b.userProgress && !b.userProgress.passed ? 1 : 0;
    if (aProgress !== bProgress) return bProgress - aProgress;
    return 0;
  });

  const handleCreateTutorial = async () => {
    if (!newTitle.trim()) return;
    await mutations.createTutorial({ title: newTitle.trim() });
    setNewTitle('');
    setShowCreateTutorial(false);
  };

  const handleCreateCourse = async () => {
    if (!newTitle.trim()) return;
    await mutations.createCourse({ title: newTitle.trim() });
    setNewTitle('');
    setShowCreateCourse(false);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Academy</h1>
        </div>
        {isSuperAdmin && (
          <EditModeToggle editMode={editMode} onToggle={setEditMode} />
        )}
      </div>

      {/* Category filter */}
      {categories.length > 0 && (
        <CategoryFilter
          categories={categories}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />
      )}

      {/* Admin panel (edit mode) */}
      {editMode && isSuperAdmin && (
        <div className="space-y-4 rounded-lg border border-dashed border-primary/30 bg-surface-hover/50 p-4">
          <h2 className="text-sm font-semibold text-primary">Admin Panel</h2>

          {/* Category management */}
          <CategoryManager categories={categories} mutations={mutations} />

          {/* Create buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => { setShowCreateTutorial(true); setShowCreateCourse(false); setNewTitle(''); }}
              className="flex items-center gap-1 rounded bg-blue-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-600"
            >
              <Plus className="h-3.5 w-3.5" />
              New Tutorial
            </button>
            <button
              onClick={() => { setShowCreateCourse(true); setShowCreateTutorial(false); setNewTitle(''); }}
              className="flex items-center gap-1 rounded bg-purple-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-600"
            >
              <Plus className="h-3.5 w-3.5" />
              New Course
            </button>
          </div>

          {/* Quick create form */}
          {(showCreateTutorial || showCreateCourse) && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder={showCreateTutorial ? 'Tutorial title...' : 'Course title...'}
                className="flex-1 rounded border border-border bg-surface px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (showCreateTutorial) handleCreateTutorial();
                    else handleCreateCourse();
                  }
                }}
                autoFocus
              />
              <button
                onClick={showCreateTutorial ? handleCreateTutorial : handleCreateCourse}
                className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
              >
                Create
              </button>
              <button
                onClick={() => { setShowCreateTutorial(false); setShowCreateCourse(false); }}
                className="rounded px-3 py-1.5 text-xs text-muted-foreground hover:bg-surface-hover"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {allItems.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <GraduationCap className="h-12 w-12 text-muted-foreground/30" />
          <p className="mt-3 text-sm text-muted-foreground">No tutorials or courses available yet.</p>
          {isSuperAdmin && (
            <p className="mt-1 text-xs text-muted-foreground">
              Toggle edit mode to create content.
            </p>
          )}
        </div>
      )}

      {/* Tutorials section */}
      {tutorials.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Tutorials
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tutorials.map((item) => (
              <AcademyCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* Courses section */}
      {courses.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Courses
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {courses.map((item) => (
              <AcademyCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
