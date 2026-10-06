import { Play, Pause } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

export function PlaybackControls({
    onPlay,
    isPlaying,
}: {
    onPlay: () => void;
    isPlaying: boolean;
}) {
    return (
        <div>
            <Button
                aria-label={isPlaying ? 'Pause' : 'Play'}
                onClick={onPlay}
                type="button"
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
