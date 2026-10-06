import { useRef } from 'react';
import type { PlaybackState } from '@/features/piano-roll/audio/playbackTypes';
import type { PianoRollEditorModel } from '@/features/piano-roll/hooks/editor/usePianoRollEditor';
import { usePlayheadRenderer } from '@/features/piano-roll/hooks/playback/usePlayheadRenderer';
import { RULER_HEIGHT } from '@/features/piano-roll/constants';

type Props = {
    editor: PianoRollEditorModel;
    playbackState: PlaybackState;
    getPlaybackTick: () => number;
};

export function PlayheadCanvas({
    editor,
    playbackState,
    getPlaybackTick,
}: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    usePlayheadRenderer({
        canvasRef,
        drawRef: editor.playheadDrawRef,
        viewport: editor.viewport,
        endTick: editor.endTick,
        playbackState,
        getPlaybackTick,
        requestRedraw: editor.requestRedraw,
    });
    return (
        <canvas
            ref={canvasRef}
            data-playhead
            aria-hidden="true"
            className="pointer-events-none absolute left-0 z-10"
            style={{
                top: -RULER_HEIGHT,
                width: editor.viewport.width,
                height: editor.viewport.height + RULER_HEIGHT,
            }}
        />
    );
}
