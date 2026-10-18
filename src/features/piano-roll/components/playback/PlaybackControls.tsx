import { Play, Pause } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { PlaybackStatus } from '@/features/piano-roll/components/playback/PlaybackStatus';
import type { PlaybackState } from '@/features/piano-roll/audio/playbackTypes';

export function PlaybackControls({
    onPlay,
    isPlaying,
    playbackState = isPlaying ? 'playing' : 'stopped',
}: {
    onPlay: () => void;
    isPlaying: boolean;
    playbackState?: PlaybackState;
}) {
    return (
        <div>
            <PlaybackStatus state={playbackState} />
            <Button
                aria-label={isPlaying ? 'Pause' : 'Play'}
                className="transport-button"
                data-playing={isPlaying}
                onClick={onPlay}
                type="button"
                variant="ghost"
                size="icon"
            >
                {isPlaying ? (
                    <Pause aria-hidden="true" />
                ) : (
                    <Play aria-hidden="true" />
                )}
            </Button>
        </div>
    );
}
