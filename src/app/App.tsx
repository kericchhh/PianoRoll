import { PianoRollCanvas } from '@/features/piano-roll/components/PianoRollCanvas';
import { PlaybackControls } from '@/features/piano-roll/components/PlaybackControls';
import { Toaster } from '@/shared/components/ui/sonner';

export function App() {
  return (
    <main className="flex h-dvh min-h-0 flex-col p-2">
      <PianoRollCanvas
        playbackControls={<PlaybackControls samplesReady={false} />}
      />
      <Toaster position="bottom-right" closeButton />
    </main>
  );
}
