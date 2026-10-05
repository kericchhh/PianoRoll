import { PianoRollCanvas } from '@/features/piano-roll/components/PianoRollCanvas';
import { PlaybackControls } from '@/features/piano-roll/components/PlaybackControls';
import { usePianoSampler } from '@/features/piano-roll/hooks/usePianoSampler';
import { usePlayback } from '@/features/piano-roll/hooks/usePlayback';
import { Toaster } from '@/shared/components/ui/sonner';

export function App() {
    const { samplesReady, samplesFailed, samplerRef } = usePianoSampler();
    const { isPlaying, togglePlayback } = usePlayback(samplerRef);

    return (
        <main className="flex h-dvh min-h-0 flex-col p-2">
            <PianoRollCanvas
                playbackControls={
                    <PlaybackControls
                        samplesReady={samplesReady}
                        samplesFailed={samplesFailed}
                        isPlaying={isPlaying}
                        onPlay={togglePlayback}
                    />
                }
            />
            <Toaster position="bottom-right" closeButton />
        </main>
    );
}
