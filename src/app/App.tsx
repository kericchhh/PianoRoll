import { PianoRollCanvas } from '@/features/piano-roll/components/PianoRollCanvas';
import { PlaybackControls } from '@/features/piano-roll/components/PlaybackControls';
import { Toaster } from '@/shared/components/ui/sonner';

export function App() {
  return (
    <div className="flex flex-col items-start gap-3 p-4">
      <PlaybackControls samplesReady={false} />
      <PianoRollCanvas />
      <Toaster position="bottom-right" closeButton />
    </div>
  );
}
