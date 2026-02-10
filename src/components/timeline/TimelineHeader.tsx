'use client';

import { ChevronLeft, ChevronRight, Calendar, Filter, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatMonthYear } from '@/lib/date-utils';

interface TimelineHeaderProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onTodayClick: () => void;
  onFilterToggle?: () => void;
  showFilters?: boolean;
  showFilterButton?: boolean;
  onCreateProject?: () => void;
  isAdmin: boolean;
}

export function TimelineHeader({
  currentDate,
  onDateChange,
  onTodayClick,
  onFilterToggle,
  showFilters = false,
  showFilterButton = true,
  onCreateProject,
  isAdmin,
}: TimelineHeaderProps) {
  const navigatePrev = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    onDateChange(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    onDateChange(newDate);
  };

  return (
    <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
      <div className="flex items-center gap-4">
        <h1 className="text-heading font-semibold">Timeline</h1>

        {/* Date Navigation */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={navigatePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={onTodayClick} className="px-3">
            <Calendar className="mr-1.5 h-4 w-4" />
            Today
          </Button>
          <Button variant="ghost" size="sm" onClick={navigateNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <span className="text-body text-text-secondary font-medium">
          {formatMonthYear(currentDate)}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Create Project Button */}
        {isAdmin && onCreateProject && (
          <Button variant="default" size="sm" onClick={onCreateProject}>
            <Plus className="mr-1.5 h-4 w-4" />
            Create Project
          </Button>
        )}

        {/* Filter Toggle */}
        {showFilterButton && onFilterToggle && (
          <Button
            variant={showFilters ? 'secondary' : 'outline'}
            size="sm"
            onClick={onFilterToggle}
            className={cn(showFilters && 'bg-primary/10 text-primary')}
          >
            <Filter className="mr-1.5 h-4 w-4" />
            Filters
          </Button>
        )}
      </div>
    </div>
  );
}
