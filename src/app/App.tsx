import { PianoRollEditor } from '@/features/piano-roll/components/editor/PianoRollEditor';
import { PlaybackControls } from '@/features/piano-roll/components/playback/PlaybackControls';
import { PlaybackWaveform } from '@/features/piano-roll/components/playback/PlaybackWaveform';
import { usePianoSampler } from '@/features/piano-roll/hooks/playback/usePianoSampler';
import { usePlayback } from '@/features/piano-roll/hooks/playback/usePlayback';
import { usePlaybackControls } from '@/features/piano-roll/hooks/playback/usePlaybackControls';
import { Toaster } from '@/shared/components/ui/sonner';

export function App() {
    const { samplesReady, samplesFailed, samplerRef, getWaveformSamples } =
        usePianoSampler();
    const { isPlaying, playbackState, togglePlayback, getPlaybackTick } =
        usePlayback(samplerRef);
    const handlePlay = usePlaybackControls({
        samplesReady,
        samplesFailed,
        onPlay: togglePlayback,
    });

    return (
        <main className="flex h-dvh min-h-0 flex-col p-2">
            <PianoRollEditor
                onTogglePlayback={handlePlay}
                playbackControls={
                    <PlaybackControls
                        isPlaying={isPlaying}
                        playbackState={playbackState}
                        onPlay={handlePlay}
                    />
                }
                getPlaybackTick={getPlaybackTick}
                playbackState={playbackState}
                playbackWaveform={
                    <PlaybackWaveform
                        isPlaying={isPlaying}
                        getSamples={getWaveformSamples}
                    />
                }
            />
            <Toaster position="bottom-right" closeButton />
        </main>
    );
}
