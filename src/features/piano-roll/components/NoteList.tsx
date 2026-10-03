import { memo } from 'react';
import type { Note } from '@/features/piano-roll/types';

type Props = {
  notes: Record<string, Note>;
  onSelect: (id: string, additive: boolean) => void;
};
const NoteListItem = memo(function NoteListItem({
  note,
  onSelect,
}: {
  note: Note;
  onSelect: Props['onSelect'];
}) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={note.selected}
        className="focus-visible:outline-2 focus-visible:outline-blue-700"
        onClick={() => onSelect(note.id, true)}
      >
        {note.selected ? 'Selected: ' : ''}
        Pitch {note.pitch}, tick {note.startTick}, duration {note.durationTicks}{' '}
        ticks
      </button>
    </li>
  );
});

export const NoteList = memo(function NoteList({ notes, onSelect }: Props) {
  return (
    <ul aria-label="Notes" className="sr-only focus-within:not-sr-only">
      {Object.values(notes).map((note) => (
        <NoteListItem key={note.id} note={note} onSelect={onSelect} />
      ))}
    </ul>
  );
});
