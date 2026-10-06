import type { RefObject } from 'react';
import { useDrag } from '@use-gesture/react';
import type { GestureMode, Note } from '@/features/piano-roll/types';
import type {
    NoteInteractionOptions,
    NoteEditCommit,
} from '@/features/piano-roll/hooks/notes/noteInteractionTypes';
import type { useMarqueeSelection } from '@/features/piano-roll/hooks/notes/useMarqueeSelection';
import { useNoteStore } from '@/features/piano-roll/store/useNoteStore';
import { snapTick } from '@/features/piano-roll/utils/time/snapTick';
import { moveNoteGroup } from '@/features/piano-roll/utils/notes/moveNoteGroup';
import { resizeNoteGroup } from '@/features/piano-roll/utils/notes/resizeNoteGroup';
import { SNAP_TICKS } from '@/features/piano-roll/constants';

type Options = Pick<
    NoteInteractionOptions,
    | 'canvasRef'
    | 'surfaceRef'
    | 'getView'
    | 'endTick'
    | 'dragCandidateRef'
    | 'previewRef'
    | 'requestRedraw'
> & {
    gestureModeRef: RefObject<GestureMode>;
    dragScaleRef: RefObject<{ x: number; y: number }>;
    dragNotesRef: RefObject<readonly Note[]>;
    suppressClickRef: RefObject<boolean>;
    updateMarquee: ReturnType<typeof useMarqueeSelection>['updateMarquee'];
    commitMove: NoteEditCommit;
    commitResize: NoteEditCommit;
};

export function useNoteDrag({
    canvasRef,
    surfaceRef,
    getView,
    endTick,
    dragCandidateRef,
    previewRef,
    requestRedraw,
    gestureModeRef,
    dragScaleRef,
    dragNotesRef,
    suppressClickRef,
    updateMarquee,
    commitMove,
    commitResize,
}: Options) {
    useDrag(
        ({ movement, xy, initial, last, tap, canceled, event }) => {
            if (gestureModeRef.current === 'pan') return;
            const [dx, dy] =
                xy && initial
                    ? [xy[0] - initial[0], xy[1] - initial[1]]
                    : movement;
            const interrupted = canceled || event?.type === 'pointercancel';
            if (updateMarquee({ dx, dy, last, tap, canceled: interrupted })) {
                if (!tap) suppressClickRef.current = true;
                if (last || interrupted) gestureModeRef.current = 'idle';
                return;
            }
            const original = dragCandidateRef.current;
            if (!original) {
                if (last || interrupted) gestureModeRef.current = 'idle';
                return;
            }

            if (tap || interrupted) {
                previewRef.current = null;
                dragCandidateRef.current = null;
                dragNotesRef.current = [];
                gestureModeRef.current = 'idle';
                requestRedraw();
                return;
            }

            if (dragNotesRef.current.length === 0) {
                const store = useNoteStore.getState();
                const anchor = store.notes[original.id];
                if (!anchor) return;
                if (anchor.selected) {
                    dragNotesRef.current = Object.values(store.notes).filter(
                        (note) => note.selected,
                    );
                } else {
                    store.selectNote(anchor.id);
                    dragNotesRef.current = [
                        useNoteStore.getState().notes[anchor.id],
                    ];
                }
            }

            const originals = dragNotesRef.current;
            const view = getView();
            const resizing = gestureModeRef.current === 'resize';
            const anchorTick =
                original.startTick + (resizing ? original.durationTicks : 0);
            const tickDelta =
                resizing && dx === 0
                    ? 0
                    : snapTick(
                          anchorTick +
                              (dx * dragScaleRef.current.x) /
                                  view.pixelsPerTick,
                          SNAP_TICKS,
                      ) - anchorTick;
            const pitchDelta = -Math.round(
                (dy * dragScaleRef.current.y) / view.rowHeight,
            );
            const edited = resizing
                ? resizeNoteGroup(originals, tickDelta, endTick)
                : moveNoteGroup(originals, tickDelta, pitchDelta, endTick);
            suppressClickRef.current = true;

            if (last) {
                previewRef.current = null;
                dragCandidateRef.current = null;
                dragNotesRef.current = [];
                gestureModeRef.current = 'idle';
                if (resizing) commitResize(originals, edited);
                else commitMove(originals, edited);
                requestRedraw();
                return;
            }

            previewRef.current = Object.fromEntries(
                edited.map((note) => [note.id, note]),
            );
            requestRedraw();
        },
        {
            target: surfaceRef ?? canvasRef,
            filterTaps: true,
            pointer: { buttons: 1, keys: false },
        },
    );
}
