import type { ReactNode } from 'react';
import { Skeleton } from '@/shared/components/ui/skeleton';

type Props = {
    timeline: ReactNode;
    insertionForm: ReactNode;
    playbackControls?: ReactNode;
};

export function EditorToolbar({
    timeline,
    insertionForm,
    playbackControls,
}: Props) {
    return (
        <header className="editor-toolbar border-b-2 border-border bg-secondary">
            <section aria-label="Toolbox" className="min-w-0 px-4 py-3">
                <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                    <h1 className="mr-2 text-2xl leading-none font-bold tracking-tight">
                        Piano roll
                    </h1>
                    {timeline}
                    <span className="flex items-baseline gap-2 text-xs text-muted-foreground">
                        Snap{' '}
                        <span className="text-sm text-foreground tabular-nums">
                            1/16
                        </span>
                    </span>
                    <Skeleton
                        aria-hidden="true"
                        className="ml-auto h-8 w-32 animate-none border border-border bg-transparent"
                    />
                </div>
                {insertionForm}
            </section>
            <section
                aria-label="Playback"
                className="flex flex-col justify-center gap-3 border-border px-4 py-3 lg:border-l-2"
            >
                <h2 className="text-sm font-bold">Playback</h2>
                <div className="flex items-center gap-2">
                    {playbackControls}
                    <Skeleton
                        aria-hidden="true"
                        className="h-9 min-w-0 flex-1 animate-none border border-border bg-transparent"
                    />
                </div>
            </section>
        </header>
    );
}
