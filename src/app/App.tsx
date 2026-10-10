import { PianoRollEditor } from '@/features/piano-roll/components/editor/PianoRollEditor';
import { PlaybackControls } from '@/features/piano-roll/components/playback/PlaybackControls';
import { PlaybackWaveform } from '@/features/piano-roll/components/playback/PlaybackWaveform';
import { usePianoSampler } from '@/features/piano-roll/hooks/playback/usePianoSampler';
import { usePlayback } from '@/features/piano-roll/hooks/playback/usePlayback';
import { usePlaybackControls } from '@/features/piano-roll/hooks/playback/usePlaybackControls';
import { usePianoPreview } from '@/features/piano-roll/hooks/playback/usePianoPreview';
import { Toaster } from '@/shared/components/ui/sonner';
import { useState } from 'react';
import type { CustomInstrument } from '@/features/piano-roll/audio/customInstrument';
import { useCustomInstrument } from '@/features/piano-roll/hooks/playback/useCustomInstrument';
import { CustomInstrumentPanel } from '@/features/piano-roll/components/playback/CustomInstrumentPanel';

export function App() {
    const [customInstrument, setCustomInstrument] =
        useState<CustomInstrument | null>(null);
    const {
        samplesReady,
        samplesFailed,
        samplerRef,
        getWaveformSamples,
        getPreviewSampler,
    } = usePianoSampler(customInstrument);
    const previewPitch = usePianoPreview({
        samplesReady,
        samplesFailed,
        getPreviewSampler,
        instrumentName: customInstrument?.name ?? 'Piano',
    });
    const {
        isPlaying,
        playbackState,
        togglePlayback,
        stopPlayback,
        getPlaybackTick,
        getPlaybackGeneration,
    } = usePlayback(samplerRef);
    const sampleControls = useCustomInstrument({
        instrument: customInstrument,
        onChange: (instrument) => {
            stopPlayback();
            setCustomInstrument(instrument);
        },
    });
    const handlePlay = usePlaybackControls({
        samplesReady,
        samplesFailed,
        onPlay: togglePlayback,
        instrumentName: customInstrument?.name ?? 'Piano',
        getPlaybackGeneration,
    });

    return (
        <main className="flex h-dvh min-h-0 flex-col p-2">
            <PianoRollEditor
                onTogglePlayback={handlePlay}
                onStopPlayback={stopPlayback}
                sampleControls={<CustomInstrumentPanel {...sampleControls} />}
                onPreviewPitch={previewPitch}
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
