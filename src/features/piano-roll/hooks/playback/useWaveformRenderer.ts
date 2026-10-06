import { useEffect, useRef, type RefObject } from 'react';
import { drawWaveform } from '@/features/piano-roll/rendering/playback/drawWaveform';
import { configureCanvas } from '@/shared/utils/configureCanvas';

type Options = {
    canvasRef: RefObject<HTMLCanvasElement | null>;
    width: number;
    height: number;
    isPlaying: boolean;
    getSamples: () => Float32Array | null;
};

export function useWaveformRenderer({
    canvasRef,
    width,
    height,
    isPlaying,
    getSamples,
}: Options) {
    const wasPlayingRef = useRef(false);
    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');
        if (!canvas || !context) return;
        const showTail = wasPlayingRef.current && !isPlaying;
        wasPlayingRef.current = isPlaying;
        const tailEnd = showTail ? performance.now() + 1500 : 0;
        const preference = window.matchMedia?.(
            '(prefers-reduced-motion: reduce)',
        );
        let frameId: number | null = null;
        const paint = () => {
            const active =
                !preference?.matches &&
                (isPlaying || performance.now() < tailEnd);
            drawWaveform(context, active ? getSamples() : null, width, height);
        };
        const animate = () => {
            frameId = null;
            paint();
            if (
                !preference?.matches &&
                (isPlaying || performance.now() < tailEnd)
            )
                frameId = requestAnimationFrame(animate);
        };
        const resize = () => {
            configureCanvas(
                canvas,
                context,
                width,
                height,
                window.devicePixelRatio || 1,
            );
            paint();
        };
        const preferenceChanged = () => {
            if (frameId !== null) cancelAnimationFrame(frameId);
            animate();
        };
        resize();
        animate();
        window.addEventListener('resize', resize);
        preference?.addEventListener('change', preferenceChanged);
        return () => {
            if (frameId !== null) cancelAnimationFrame(frameId);
            window.removeEventListener('resize', resize);
            preference?.removeEventListener('change', preferenceChanged);
        };
    }, [canvasRef, width, height, isPlaying, getSamples]);
}
