import { useEffect, useRef, type RefObject } from 'react';
import type { PlaybackState } from '@/features/piano-roll/audio/playbackTypes';
import type { usePianoRollViewport } from '@/features/piano-roll/hooks/editor/usePianoRollViewport';
import { drawPlayhead } from '@/features/piano-roll/rendering/playback/drawPlayhead';
import { tickToPixel } from '@/features/piano-roll/utils/coordinates/tickToPixel';
import { scrollForPlayhead } from '@/features/piano-roll/utils/viewport/scrollForPlayhead';
import { configureCanvas } from '@/shared/utils/configureCanvas';
import { RULER_HEIGHT } from '@/features/piano-roll/constants';

type Options = {
    canvasRef: RefObject<HTMLCanvasElement | null>;
    drawRef: RefObject<(() => void) | null>;
    viewport: ReturnType<typeof usePianoRollViewport>;
    endTick: number;
    playbackState: PlaybackState;
    getPlaybackTick: () => number;
    requestRedraw: () => void;
};

export function usePlayheadRenderer({
    canvasRef,
    drawRef,
    viewport,
    endTick,
    playbackState,
    getPlaybackTick,
    requestRedraw,
}: Options) {
    const { width, height, getView, scrollRef } = viewport;
    const previousStateRef = useRef(playbackState);
    const resetViewRef = useRef(false);
    const settleUntilRef = useRef(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');
        if (!canvas || !context) return;
        if (
            previousStateRef.current !== playbackState &&
            playbackState !== 'playing'
        ) {
            settleUntilRef.current = performance.now() + 200;
        }
        if (
            previousStateRef.current !== 'stopped' &&
            playbackState === 'stopped'
        )
            resetViewRef.current = true;
        previousStateRef.current = playbackState;
        let frameId: number | null = null;
        let previousTick: number | null = null;
        const paint = () => {
            const tick = getPlaybackTick();
            const view = getView();
            const x = tickToPixel(tick, view.pixelsPerTick, view.scrollOffsetX);
            drawPlayhead(context, x, width, height + RULER_HEIGHT);
            canvas.dataset.tick = tick.toFixed(3);
            canvas.dataset.x = x.toFixed(3);
        };
        const resize = () => {
            configureCanvas(
                canvas,
                context,
                width,
                height + RULER_HEIGHT,
                window.devicePixelRatio || 1,
            );
            paint();
        };
        const animate = () => {
            frameId = null;
            const tick = getPlaybackTick();
            const changed = previousTick !== null && tick !== previousTick;
            const reset = resetViewRef.current && tick === 0;
            if (
                playbackState === 'playing' ||
                (playbackState === 'paused' && changed) ||
                reset
            ) {
                const view = getView();
                const scroll = reset
                    ? 0
                    : scrollForPlayhead(tick, view, width, endTick);
                if (scroll !== scrollRef.current) {
                    scrollRef.current = scroll;
                    requestRedraw();
                }
                if (reset) resetViewRef.current = false;
            }
            paint();
            if (
                playbackState === 'playing' ||
                previousTick === null ||
                changed ||
                performance.now() < settleUntilRef.current
            )
                frameId = requestAnimationFrame(animate);
            previousTick = tick;
        };
        drawRef.current = paint;
        resize();
        animate();
        window.addEventListener('resize', resize);
        return () => {
            if (frameId !== null) cancelAnimationFrame(frameId);
            if (drawRef.current === paint) drawRef.current = null;
            window.removeEventListener('resize', resize);
        };
    }, [
        canvasRef,
        drawRef,
        width,
        height,
        getView,
        scrollRef,
        endTick,
        playbackState,
        getPlaybackTick,
        requestRedraw,
    ]);
}
