export type CustomSample = {
    name: string;
    rootPitch: number;
    buffer: AudioBuffer;
};

export const MAX_SAMPLE_BYTES = 20 * 1024 * 1024;
export const MAX_SAMPLE_SECONDS = 30;
export const MAX_DECODED_SAMPLE_BYTES = 128 * 1024 * 1024;
// Tone.Sampler searches at most 95 semitones from each sample. This root
// range keeps every editor pitch (MIDI 0–127) within that search distance.
export const MIN_SAMPLE_ROOT = 32;
export const MAX_SAMPLE_ROOT = 95;

export function validateSampleRoot(rootPitch: number): void {
    if (
        !Number.isInteger(rootPitch) ||
        rootPitch < MIN_SAMPLE_ROOT ||
        rootPitch > MAX_SAMPLE_ROOT
    )
        throw new RangeError('Choose a root pitch between MIDI 32 and 95.');
}

export function validateSampleFile(size: number, rootPitch?: number): void {
    if (size <= 0 || size > MAX_SAMPLE_BYTES)
        throw new RangeError('Choose an audio file between 1 byte and 20 MB.');
    if (rootPitch !== undefined) validateSampleRoot(rootPitch);
}

export function validateSampleBuffer(
    buffer: Pick<AudioBuffer, 'duration' | 'length' | 'numberOfChannels'>,
): void {
    if (
        !Number.isFinite(buffer.duration) ||
        buffer.duration <= 0 ||
        buffer.duration > MAX_SAMPLE_SECONDS
    )
        throw new RangeError('Choose a sample no longer than 30 seconds.');
    if (buffer.length * buffer.numberOfChannels * 4 > MAX_DECODED_SAMPLE_BYTES)
        throw new RangeError(
            'The decoded sample is too large. Choose a shorter recording.',
        );
}
