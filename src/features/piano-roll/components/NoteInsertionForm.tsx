import { useState } from 'react';
import {
  DEFAULT_NOTE_DURATION_TICKS,
  INITIAL_HIGHEST_PITCH,
  SNAP_TICKS,
} from '@/features/piano-roll/constants';

type Props = {
  endTick: number;
  onAdd: (tick: number, pitch: number, selected: boolean) => boolean;
};
export function NoteInsertionForm({ endTick, onAdd }: Props) {
  const [error, setError] = useState('');
  return (
    <form
      aria-label="Add a note"
      className="flex flex-wrap gap-3 py-2"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const added = onAdd(
          Number(data.get('tick')),
          Number(data.get('pitch')),
          true,
        );
        setError(
          added ? '' : 'The note must fit inside the selected timeline.',
        );
      }}
    >
      <label>
        New note pitch{' '}
        <input
          className="w-20 border focus-visible:outline-2"
          name="pitch"
          type="number"
          min={0}
          max={127}
          step={1}
          defaultValue={INITIAL_HIGHEST_PITCH}
          required
        />
      </label>
      <label>
        Start tick{' '}
        <input
          className="w-24 border focus-visible:outline-2"
          name="tick"
          type="number"
          min={0}
          max={endTick - DEFAULT_NOTE_DURATION_TICKS}
          step={SNAP_TICKS}
          defaultValue={0}
          required
        />
      </label>
      <button type="submit" className="border px-2 focus-visible:outline-2">
        Add note
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
