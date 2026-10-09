import { memo } from 'react';
import { Button } from '@/shared/components/ui/button';
import type { Note } from '@/features/piano-roll/types';

export const NoteListItem = memo(function NoteListItem({
    note,
    onSelect,
}: {
    note: Note;
    onSelect: (id: string, additive: boolean) => void;
}) {
    return (
        <li>
            <Button
                type="button"
                data-note-id={note.id}
                variant="ghost"
                aria-pressed={note.selected}
                className="h-auto justify-start whitespace-normal text-left"
                onClick={() => onSelect(note.id, true)}
            >
                {note.selected ? 'Selected: ' : ''}
                Pitch {note.pitch}, tick {note.startTick}, duration{' '}
                {note.durationTicks} ticks
            </Button>
        </li>
    );
});
