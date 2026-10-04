import { memo } from 'react';
import { Button } from '@/shared/components/ui/button';
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
      <Button
        type="button"
        variant="ghost"
        aria-pressed={note.selected}
        className="h-auto justify-start whitespace-normal text-left"
        onClick={() => onSelect(note.id, true)}
      >
        {note.selected ? 'Selected: ' : ''}
        Pitch {note.pitch}, tick {note.startTick}, duration {note.durationTicks}{' '}
        ticks
      </Button>
    </li>
  );
});

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
