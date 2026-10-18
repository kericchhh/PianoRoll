import { FxPanel } from '@/features/piano-roll/components/fx/FxPanel';

export function StudioSidebar() {
    return (
        <aside
            aria-label="Effects"
            className="studio-sidebar min-h-0 overflow-y-auto border-l-2 border-border bg-secondary"
        >
            <FxPanel />
        </aside>
    );
}
