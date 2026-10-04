import { Skeleton } from '@/shared/components/ui/skeleton';

export function StudioSidebar() {
  return (
    <aside
      aria-hidden="true"
      className="studio-sidebar min-h-0 border-l-2 border-border bg-secondary"
    >
      <Skeleton className="h-full w-full animate-none bg-transparent" />
    </aside>
  );
}
