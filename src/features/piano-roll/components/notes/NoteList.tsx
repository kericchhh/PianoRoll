import { memo } from 'react';
import { NoteListItem } from '@/features/piano-roll/components/notes/NoteListItem';
import type { Note } from '@/features/piano-roll/types';

type Props = {
    notes: Record<string, Note>;
    onSelect: (id: string, additive: boolean) => void;
};

export const NoteList = memo(function NoteList({ notes, onSelect }: Props) {
    return (
        <ul
            aria-label="Notes"
            className="note-list sr-only focus-within:not-sr-only"
        >
            {Object.values(notes).map((note) => (
                <NoteListItem key={note.id} note={note} onSelect={onSelect} />
            ))}
        </ul>
    );
});
