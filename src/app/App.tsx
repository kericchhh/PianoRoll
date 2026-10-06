import { PianoRollCanvas } from '@/features/piano-roll/components/PianoRollCanvas';
import { PlaybackControls } from '@/features/piano-roll/components/PlaybackControls';
import { usePianoSampler } from '@/features/piano-roll/hooks/usePianoSampler';
import { usePlayback } from '@/features/piano-roll/hooks/usePlayback';
import { usePlaybackControls } from '@/features/piano-roll/hooks/usePlaybackControls';
import { Toaster } from '@/shared/components/ui/sonner';

export function App() {
    const { samplesReady, samplesFailed, samplerRef } = usePianoSampler();
    const { isPlaying, togglePlayback } = usePlayback(samplerRef);
    const handlePlay = usePlaybackControls({
        samplesReady,
        samplesFailed,
        onPlay: togglePlayback,
    });

    return (
        <main className="flex h-dvh min-h-0 flex-col p-2">
            <PianoRollCanvas
                onTogglePlayback={handlePlay}
                playbackControls={
                    <PlaybackControls
                        isPlaying={isPlaying}
                        onPlay={handlePlay}
                    />
                }
            />
            <Toaster position="bottom-right" closeButton />
        </main>
    );
}
