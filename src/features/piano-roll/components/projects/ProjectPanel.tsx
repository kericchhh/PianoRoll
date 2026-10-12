import { FolderOpen, Save } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import type { ProjectPersistenceControls } from '@/features/piano-roll/hooks/projects/useProjectPersistence';

export function ProjectPanel({
    save,
    load,
    isBusy,
    operation,
    error,
    status,
}: ProjectPersistenceControls) {
    return (
        <section aria-label="Local project" className="space-y-4 p-4">
            <p className="text-sm text-muted-foreground">
                Save one composition in this browser. Saving replaces the
                previous save. Loading replaces your notes and timeline and
                clears selection and undo/redo history.
            </p>
            <div className="flex flex-wrap gap-3" aria-busy={isBusy}>
                <Button
                    type="button"
                    aria-disabled={isBusy}
                    aria-busy={operation === 'save'}
                    className="aria-disabled:cursor-default aria-disabled:opacity-40"
                    onClick={() => {
                        if (!isBusy) void save();
                    }}
                >
                    <Save aria-hidden="true" />
                    {operation === 'save' ? 'Saving…' : 'Save project'}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    aria-disabled={isBusy}
                    aria-busy={operation === 'load'}
                    className="aria-disabled:cursor-default aria-disabled:opacity-40"
                    onClick={() => {
                        if (!isBusy) void load();
                    }}
                >
                    <FolderOpen aria-hidden="true" />
                    {operation === 'load' ? 'Loading…' : 'Load project'}
                </Button>
            </div>
            <p className="text-sm text-muted-foreground">
                Notes and timeline length are saved. Custom instruments remain
                active in this tab but are not saved. Zoom and pan are kept when
                loading. Use Load project to restore after a reload.
            </p>
            <p role="status" aria-atomic="true" className="text-sm">
                {status}
            </p>
            {error && (
                <p role="alert" className="text-sm text-destructive">
                    {error}
                </p>
            )}
        </section>
    );
}
