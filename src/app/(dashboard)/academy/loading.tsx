import { GraduationCap } from 'lucide-react';

export default function AcademyLoading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <div className="animate-pulse">
        <GraduationCap className="h-16 w-16 text-muted-foreground/50" />
      </div>
      <p className="text-sm text-muted-foreground animate-pulse">Loading Academy...</p>
    </div>
  );
}
