// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PianoRollCanvas } from '@/features/piano-roll/components/PianoRollCanvas';
import { useNoteStore } from '@/features/piano-roll/store/useNoteStore';
import type { Note } from '@/features/piano-roll/types';

function makeNote(id: string, pitch = 60): Note {
  return {
    id,
    pitch,
    startTick: 120,
    durationTicks: 120,
    velocity: 100,
    selected: false,
  };
}

beforeEach(() => {
  useNoteStore.setState({ notes: {} });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test('Delete removes the selected note but keeps other notes', () => {
  const store = useNoteStore.getState();
  store.addNote(makeNote('selected'));
  store.addNote(makeNote('other', 61));
  store.selectNote('selected');
  render(<PianoRollCanvas />);

  const editor = screen.getByRole('group', { name: 'Piano roll editor' });
  editor.focus();
  fireEvent.keyDown(editor, { key: 'Delete' });

  expect(useNoteStore.getState().notes.selected).toBeUndefined();
  expect(useNoteStore.getState().notes.other).toBeDefined();
  expect(document.activeElement).toBe(editor);
});

test('Delete does nothing when no note is selected', () => {
  useNoteStore.getState().addNote(makeNote('a'));
  render(<PianoRollCanvas />);

  fireEvent.keyDown(screen.getByRole('group', { name: 'Piano roll editor' }), {
    key: 'Delete',
  });

  expect(useNoteStore.getState().notes.a).toBeDefined();
});

test('Delete in the timeline select does not remove a note', () => {
  const store = useNoteStore.getState();
  store.addNote(makeNote('a'));
  store.selectNote('a');
  render(<PianoRollCanvas />);

  const timelineSelect = screen.getByRole('combobox', { name: /timeline length/i });
  timelineSelect.focus();
  fireEvent.keyDown(timelineSelect, { key: 'Delete' });

  expect(useNoteStore.getState().notes.a).toBeDefined();
});

test('a repeated Delete key event does not remove a note', () => {
  const store = useNoteStore.getState();
  store.addNote(makeNote('a'));
  store.selectNote('a');
  render(<PianoRollCanvas />);

  fireEvent.keyDown(screen.getByRole('group', { name: 'Piano roll editor' }), {
    key: 'Delete',
    repeat: true,
  });

  expect(useNoteStore.getState().notes.a).toBeDefined();
});

test('clicking the canvas gives the editor keyboard focus', () => {
  render(<PianoRollCanvas />);

  fireEvent.click(screen.getByRole('img', { name: 'Time grid preview' }));

  expect(document.activeElement).toBe(
    screen.getByRole('group', { name: 'Piano roll editor' }),
  );
});

test('deleting a focused note-list button keeps focus inside the editor', () => {
  const store = useNoteStore.getState();
  store.addNote(makeNote('a'));
  store.selectNote('a');
  render(<PianoRollCanvas />);

  const editor = screen.getByRole('group', { name: 'Piano roll editor' });
  const noteButton = screen.getByRole('button', { name: /Pitch 60, tick 120/i });
  noteButton.focus();
  fireEvent.keyDown(noteButton, { key: 'Delete' });

  expect(useNoteStore.getState().notes.a).toBeUndefined();
  expect(editor.contains(document.activeElement)).toBe(true);
});

test('deleting a note announces the action', () => {
  const store = useNoteStore.getState();
  store.addNote(makeNote('a'));
  store.selectNote('a');
  render(<PianoRollCanvas />);

  fireEvent.keyDown(screen.getByRole('group', { name: 'Piano roll editor' }), {
    key: 'Delete',
  });

  expect(screen.getByRole('status').textContent).toMatch(/deleted/i);
});
