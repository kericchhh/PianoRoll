// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PianoRollCanvas } from '@/features/piano-roll/components/PianoRollCanvas';
import { useNoteStore } from '@/features/piano-roll/store/useNoteStore';
import type { Note } from '@/features/piano-roll/types';

const note: Note = {
  id: 'a',
  pitch: 72,
  startTick: 120,
  durationTicks: 120,
  selected: true,
  velocity: 100,
};
beforeEach(() => {
  useNoteStore.setState({ notes: {} });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test('keyboard users can create and select a first note and hear its creation', async () => {
  const user = userEvent.setup();
  render(<PianoRollCanvas />);
  await user.tab(); // timeline
  await user.tab(); // pitch
  expect(document.activeElement).toBe(
    screen.getByRole('spinbutton', { name: 'New note pitch' }),
  );
  await user.tab(); // tick
  await user.tab(); // add
  await user.keyboard('{Enter}');
  expect(Object.values(useNoteStore.getState().notes)).toHaveLength(1);
  expect(Object.values(useNoteStore.getState().notes)[0]).toMatchObject({
    pitch: 72,
    startTick: 0,
    selected: true,
  });
  expect(screen.getByRole('status').textContent).toBe(
    'Added pitch 72 at tick 0',
  );
});

test('Radix menu arrows and Delete do not reach the editor shortcut handler', async () => {
  const user = userEvent.setup();
  useNoteStore.setState({ notes: { a: note } });
  render(<PianoRollCanvas />);
  const canvas = screen.getByRole('img', { name: 'Time grid preview' });
  Object.defineProperties(canvas, {
    clientWidth: { value: 600 },
    clientHeight: { value: 240 },
  });
  fireEvent.contextMenu(canvas, { button: 2, clientX: 65, clientY: 10 });
  const before = useNoteStore.getState();
  const menu = await screen.findByRole('menu');
  menu.focus();
  await user.keyboard('{ArrowDown}{ArrowDown}{ArrowUp}{Delete}');
  expect(useNoteStore.getState()).toBe(before);
  expect(screen.getByRole('menu')).toBeDefined();
});

test('already-handled keys do not trigger note edits', () => {
  useNoteStore.setState({ notes: { a: note } });
  render(<PianoRollCanvas />);
  const editor = screen.getByRole('group', { name: 'Piano roll editor' });
  const handled = new KeyboardEvent('keydown', {
    key: 'ArrowUp',
    bubbles: true,
    cancelable: true,
  });
  handled.preventDefault();
  fireEvent(editor, handled);
  expect(useNoteStore.getState().notes.a.pitch).toBe(72);
});

test('repeated identical announcements replace live-region content', () => {
  useNoteStore.setState({ notes: { a: note } });
  render(<PianoRollCanvas />);
  const button = screen.getByRole('button', { name: /Pitch 72, tick 120/ });
  fireEvent.click(button); // 0 selected
  const first = screen.getByRole('status').firstChild;
  fireEvent.click(button); // 1 selected
  fireEvent.click(button); // 0 selected again
  expect(screen.getByRole('status').textContent).toBe('0 notes selected');
  expect(screen.getByRole('status').firstChild).not.toBe(first);
});

test('selection and movement do not resize the canvas backing store', () => {
  useNoteStore.setState({ notes: { a: note } });
  render(<PianoRollCanvas />);
  const canvas = screen.getByRole('img', {
    name: 'Time grid preview',
  }) as HTMLCanvasElement;
  const width = vi.spyOn(canvas, 'width', 'set');
  const height = vi.spyOn(canvas, 'height', 'set');
  fireEvent.click(screen.getByRole('button', { name: /Pitch 72, tick 120/ }));
  act(() => useNoteStore.getState().moveNote('a', 240, 71));
  expect(width).not.toHaveBeenCalled();
  expect(height).not.toHaveBeenCalled();
});

test('the selected-note DOM overlay exposes keyboard editing and follows pitch reveal', () => {
  useNoteStore.setState({ notes: { a: note } });
  render(<PianoRollCanvas />);
  fireEvent.keyDown(screen.getByRole('group', { name: 'Piano roll editor' }), {
    key: 'ArrowUp',
  });
  const overlay = screen.getByRole('group', {
    name: /Selected note: pitch 73/,
  });
  expect(overlay.getAttribute('tabindex')).toBe('0');
  expect(overlay.getAttribute('aria-keyshortcuts')).toContain('Delete');
});
