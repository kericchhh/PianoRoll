import { useRef } from 'react';
import { useElementSize } from '@/shared/hooks/useElementSize';
import { useWaveformRenderer } from '@/features/piano-roll/hooks/playback/useWaveformRenderer';

type Props = {
    isPlaying: boolean;
    getSamples: () => Float32Array | null;
};

export function PlaybackWaveform({ isPlaying, getSamples }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { width, height } = useElementSize(containerRef, {
        width: 192,
        height: 34,
    });
    useWaveformRenderer({ canvasRef, width, height, isPlaying, getSamples });
    return (
        <div
            ref={containerRef}
            aria-hidden="true"
            className="h-9 min-w-0 flex-1 overflow-hidden border border-border bg-background"
        >
            <canvas ref={canvasRef} data-waveform className="block size-full" />
        </div>
    );
}
