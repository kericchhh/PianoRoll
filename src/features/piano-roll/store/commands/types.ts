import type { Note } from '@/features/piano-roll/types';

export type NotePosition = Pick<Note, 'startTick' | 'pitch'>;
export type NoteDuration = Pick<Note, 'durationTicks'>;

type Change<T> = {
    id: string;
    from: T;
    to: T;
};

export type NoteCommand = (
    | { type: 'ADD_NOTE' | 'PASTE_NOTES'; notes: readonly Note[] }
    | {
          type: 'DELETE_NOTES';
          deleted: readonly { note: Note; index: number }[];
      }
    | { type: 'MOVE_NOTES'; changes: readonly Change<NotePosition>[] }
    | { type: 'RESIZE_NOTES'; changes: readonly Change<NoteDuration>[] }
) & {
    selection: { before: readonly string[]; after: readonly string[] };
};

export type HistoryDirection = 'undo' | 'redo';
