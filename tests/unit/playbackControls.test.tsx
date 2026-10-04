// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as Tone from 'tone';
import { toast } from 'sonner';
import { PlaybackControls } from '@/features/piano-roll/components/PlaybackControls';

vi.mock('tone', () => ({ start: vi.fn() }));
vi.mock('sonner', () => ({
  toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(Tone.start).mockResolvedValue(undefined);
});
afterEach(cleanup);

test('Play remains keyboard operable before readiness and gives feedback without enabling audio', async () => {
  const user = userEvent.setup();
  render(<PlaybackControls samplesReady={false} />);
  expect(toast.info).not.toHaveBeenCalled();
  expect(toast.success).not.toHaveBeenCalled();
  expect(screen.queryByRole('status')).toBeNull();

  await user.tab();
  await user.keyboard('{Enter}');

  expect(document.activeElement).toBe(
    screen.getByRole('button', { name: 'Play' }),
  );
  expect(toast.info).toHaveBeenCalledWith(
    'Loading piano samples…',
    expect.any(Object),
  );
  expect(Tone.start).not.toHaveBeenCalled();
});

test('a readiness transition notifies once and only a subsequent Play action enables audio', async () => {
  const user = userEvent.setup();
  const { rerender } = render(<PlaybackControls samplesReady={false} />);
  await user.click(screen.getByRole('button', { name: 'Play' }));
  rerender(<PlaybackControls samplesReady />);
  rerender(<PlaybackControls samplesReady />);

  expect(toast.success).toHaveBeenCalledTimes(1);
  expect(toast.success).toHaveBeenCalledWith('Piano ready', expect.any(Object));
  expect(Tone.start).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Play' }));
  expect(Tone.start).toHaveBeenCalledTimes(1);
  expect(toast.info).toHaveBeenCalledTimes(1);
});

test('failed audio activation gives retry feedback and handles the rejected promise', async () => {
  const user = userEvent.setup();
  vi.mocked(Tone.start).mockRejectedValue(new Error('Audio unavailable'));
  render(<PlaybackControls samplesReady />);
  await user.click(screen.getByRole('button', { name: 'Play' }));

  await waitFor(() =>
    expect(toast.error).toHaveBeenCalledWith(
      'Could not enable audio. Press Play to try again.',
      expect.any(Object),
    ),
  );
  expect(document.activeElement).toBe(
    screen.getByRole('button', { name: 'Play' }),
  );
});
