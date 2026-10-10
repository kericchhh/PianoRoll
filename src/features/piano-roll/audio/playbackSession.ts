import type * as Tone from 'tone';

export type PlaybackCompletion = {
    timeoutId: number | null;
    generation: number;
};

export function invalidatePlaybackCompletion(
    finish: PlaybackCompletion,
    context: Pick<ReturnType<typeof Tone.getContext>, 'clearTimeout'>,
): void {
    finish.generation++;
    if (finish.timeoutId !== null) {
        context.clearTimeout(finish.timeoutId);
        finish.timeoutId = null;
    }
}

export function clearPlaybackEvents(
    ids: number[],
    transport: Pick<ReturnType<typeof Tone.getTransport>, 'clear'>,
): void {
    for (const id of ids) transport.clear(id);
    ids.length = 0;
}
