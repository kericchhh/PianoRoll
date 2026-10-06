import type { PlaybackState } from '@/features/piano-roll/audio/playbackTypes';

const MESSAGES: Record<PlaybackState, string> = {
    playing: 'Playing',
    paused: 'Playback paused',
    stopped: 'Playback stopped',
};

export function PlaybackStatus({ state }: { state: PlaybackState }) {
    return (
        <p
            role="status"
            aria-label="Playback status"
            aria-atomic="true"
            className="sr-only"
        >
            {MESSAGES[state]}
        </p>
    );
}
