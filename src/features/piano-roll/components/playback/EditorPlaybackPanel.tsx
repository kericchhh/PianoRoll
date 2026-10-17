import type { ReactNode } from 'react';
import { Skeleton } from '@/shared/components/ui/skeleton';

export function EditorPlaybackPanel({
    children,
    waveform,
    tempoControl,
}: {
    children?: ReactNode;
    waveform?: ReactNode;
    tempoControl?: ReactNode;
}) {
    return (
        <section
            aria-label="Playback"
            className="flex flex-col justify-start gap-3 border-border px-4 py-3 lg:border-l-2"
        >
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-bold">Playback</h2>
                {tempoControl}
            </div>
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
