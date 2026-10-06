import type { RefObject } from 'react';

export function PianoRollRuler({
    rulerRef,
}: {
    rulerRef: RefObject<HTMLCanvasElement | null>;
}) {
    return (
        <div className="min-w-0 overflow-hidden border-b border-border bg-secondary">
            <canvas ref={rulerRef} aria-hidden="true" className="block" />
        </div>
    );
}
