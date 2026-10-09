import type { RefObject } from 'react';
import type { Note } from '@/features/piano-roll/types';

type Props = {
    note: Note;
    overlayRef: RefObject<HTMLDivElement | null>;
};

export function SelectedNoteOverlay({ note, overlayRef }: Props) {
    return (
        <div
            ref={overlayRef}
            data-note-overlay
            data-note-id={note.id}
            tabIndex={0}
            role="group"
            aria-label={`Selected note: pitch ${note.pitch}, tick ${note.startTick}, duration ${note.durationTicks} ticks`}
            aria-keyshortcuts="Space ArrowUp ArrowDown ArrowLeft ArrowRight Shift+ArrowLeft Shift+ArrowRight Delete Control+c Meta+c Control+v Meta+v Control+z Meta+z Control+Shift+z Meta+Shift+z"
            className="absolute z-20 outline-2 outline-offset-1 outline-transparent group-focus-within:outline-ring focus-visible:outline-ring"
        >
            <span className="sr-only">
                Use arrow keys to move this selection, Shift+Left or Shift+Right
                to resize it, or Delete to remove it. Ctrl or Command+C copies
                the selection; Ctrl or Command+V pastes it after the selected
                group. Ctrl or Command+Z undoes an edit; add Shift to redo.
                Space toggles playback.
            </span>
        </div>
    );
}
