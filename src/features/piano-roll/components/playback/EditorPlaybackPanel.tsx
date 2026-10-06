import type { ReactNode } from 'react';
import { Skeleton } from '@/shared/components/ui/skeleton';

export function EditorPlaybackPanel({
    children,
    waveform,
}: {
    children?: ReactNode;
    waveform?: ReactNode;
}) {
    return (
        <section
            aria-label="Playback"
            className="flex flex-col justify-center gap-3 border-border px-4 py-3 lg:border-l-2"
        >
            <h2 className="text-sm font-bold">Playback</h2>
            <div className="flex items-center gap-2">
                {children}
                {waveform ?? (
                    <Skeleton
                        aria-hidden="true"
                        className="h-9 min-w-0 flex-1 animate-none border border-border bg-transparent"
                    />
                )}
            </div>
        </section>
    );
}
