import * as Tone from 'tone';
import { Play } from 'lucide-react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/shared/components/ui/button';

const PIANO_STATUS_TOAST_ID = 'piano-samples';

export function PlaybackControls({ samplesReady }: { samplesReady: boolean }) {
  useEffect(() => {
    if (samplesReady) {
      toast.success('Piano ready', { id: PIANO_STATUS_TOAST_ID });
    }
  }, [samplesReady]);

  async function handlePlay(): Promise<void> {
    if (!samplesReady) {
      toast.info('Loading piano samples…', { id: PIANO_STATUS_TOAST_ID });
      return;
    }
    try {
      await Tone.start();
    } catch {
      toast.error('Could not enable audio. Press Play to try again.', {
        id: 'piano-audio',
      });
    }
  }

  return (
    <div>
      <Button aria-label="Play" onClick={handlePlay} type="button" size="icon">
        <Play aria-hidden="true" />
      </Button>
    </div>
  );
}
